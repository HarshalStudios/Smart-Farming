import { Router, type Response } from 'express';
import { getDb, type DbTelemetryReading } from '../db/database';
import { requireDeviceAuth, requireUserAuth, type AuthenticatedRequest } from '../auth/middleware';
import { validateTelemetryPayload } from '../contracts/telemetryContract';

const router = Router();

// POST /api/v1/telemetry/ingest - Secure ESP32 Telemetry Ingestion Endpoint
router.post('/ingest', requireDeviceAuth, async (req: AuthenticatedRequest, res: Response) => {
  const validation = validateTelemetryPayload(req.body);

  if (!validation.valid || !validation.data) {
    res.status(400).json({
      error: 'Telemetry Validation Error',
      details: validation.errors
    });
    return;
  }

  const payload = validation.data;
  const device = req.device!;

  // Enforce device identity matching: token must match payload.device_id
  if (payload.device_id !== device.id) {
    res.status(403).json({
      error: 'Device Identity Mismatch',
      message: `Token belongs to device ${device.id}, but payload claims device_id ${payload.device_id}`
    });
    return;
  }

  const db = getDb();
  const ingestedAt = new Date().toISOString();

  // Extract SHT40 values: NULL if invalid, never 0 for errors
  const airTemp = payload.sht40.valid ? payload.sht40.air_temperature_c : null;
  const relHumidity = payload.sht40.valid ? payload.sht40.relative_humidity_pct : null;

  // Extract Modbus values: strictly NULL if invalid, never 0 for errors
  const modbusNorm = validation.normalizedModbus!;
  const soilMoisture = modbusNorm.valid ? modbusNorm.soil_moisture_pct : null;
  const soilTemp = modbusNorm.valid ? modbusNorm.soil_temperature_c : null;
  const soilPh = modbusNorm.valid ? modbusNorm.soil_ph : null;
  const ec = modbusNorm.valid ? modbusNorm.electrical_conductivity_ds_m : null;
  const n = modbusNorm.valid ? modbusNorm.nitrogen_kg_ha : null;
  const p = modbusNorm.valid ? modbusNorm.phosphorus_kg_ha : null;
  const k = modbusNorm.valid ? modbusNorm.potassium_kg_ha : null;

  // Rain gauge
  const rainPulses = payload.rain_gauge.pulse_count;
  const rainAccumulation = payload.rain_gauge.rainfall_period_mm;
  const rainPeriodSecs = payload.rain_gauge.accumulation_period_seconds || 60;

  try {
    const insertSql = `
      INSERT INTO telemetry_readings (
        device_id, farm_id, recorded_at, ingested_at,
        air_temperature_c, relative_humidity_pct,
        soil_moisture_pct, soil_temperature_c, soil_ph,
        electrical_conductivity_ds_m, nitrogen_kg_ha, phosphorus_kg_ha, potassium_kg_ha,
        rain_pulses, rain_accumulation_mm, rain_duration_seconds,
        modbus_valid, sht40_valid, rain_valid, raw_payload
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6,
        $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16,
        $17, $18, $19, $20
      ) RETURNING id
    `;

    const insertResult = await db.query<{ id: number | string }>(insertSql, [
      device.id,
      device.farm_id,
      payload.timestamp,
      ingestedAt,
      airTemp,
      relHumidity,
      soilMoisture,
      soilTemp,
      soilPh,
      ec,
      n,
      p,
      k,
      rainPulses,
      rainAccumulation,
      rainPeriodSecs,
      payload.modbus.valid ? true : false,
      payload.sht40.valid ? true : false,
      payload.rain_gauge.valid ? true : false,
      JSON.stringify(payload)
    ]);

    const readingId = Number(insertResult.rows[0]?.id || 0);

    // Update device heartbeat and status
    const batteryPct = payload.diagnostics?.battery_pct !== undefined ? payload.diagnostics.battery_pct : device.battery_pct;
    await db.query(
      'UPDATE devices SET status = $1, battery_pct = $2, last_seen_at = $3 WHERE id = $4',
      ['Online', batteryPct, ingestedAt, device.id]
    );

    res.status(201).json({
      status: 'success',
      readingId,
      deviceId: device.id,
      recordedAt: payload.timestamp,
      ingestedAt,
      sensorSummary: {
        sht40: payload.sht40.valid ? 'valid' : 'invalid_or_failed',
        modbus: payload.modbus.valid ? 'valid' : 'invalid_or_failed',
        rainGauge: payload.rain_gauge.valid ? 'valid' : 'invalid_or_failed'
      }
    });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Ingestion Database Error', message: (err as Error).message });
  }
});

// GET /api/v1/telemetry/latest - Query latest valid reading for a farm or device
router.get('/latest', requireUserAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { deviceId, farmId } = req.query;
  const db = getDb();

  try {
    let query = 'SELECT * FROM telemetry_readings WHERE 1=1';
    const params: (string | number)[] = [];
    let pIndex = 1;

    if (deviceId && typeof deviceId === 'string') {
      const devId = deviceId.trim();
      // Enforce device access permission for non-admins
      if (req.user!.role !== 'Admin' && req.user!.role !== 'Technician') {
        const dev = await db.queryOne<{ farm_id: string }>('SELECT farm_id FROM devices WHERE id = $1', [devId]);
        if (!dev || !req.user!.farmIds.includes(dev.farm_id)) {
          res.status(403).json({ error: 'Forbidden', message: `You do not have access to telemetry for device ${devId}` });
          return;
        }
      }
      query += ` AND device_id = $${pIndex++}`;
      params.push(devId);
    } else if (farmId && typeof farmId === 'string') {
      const fId = farmId.trim();
      // Enforce farm access permission for non-admins
      if (req.user!.role !== 'Admin' && req.user!.role !== 'Technician') {
        if (!req.user!.farmIds.includes(fId)) {
          res.status(403).json({ error: 'Forbidden', message: `You do not have access to telemetry for farm ${fId}` });
          return;
        }
      }
      query += ` AND farm_id = $${pIndex++}`;
      params.push(fId);
    } else {
      // If neither specified, fetch latest across user's assigned farms
      if (req.user!.role !== 'Admin') {
        const userFarms = req.user!.farmIds;
        if (userFarms.length === 0) {
          res.json({ reading: null });
          return;
        }
        const placeholders = userFarms.map(() => `$${pIndex++}`).join(', ');
        query += ` AND farm_id IN (${placeholders})`;
        params.push(...userFarms);
      }
    }

    query += ' ORDER BY recorded_at DESC LIMIT 1';
    const reading = await db.queryOne<DbTelemetryReading>(query, params);

    res.json({ reading: reading || null });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Database Error', message: (err as Error).message });
  }
});

// GET /api/v1/telemetry/history - Query historical time-series readings
router.get('/history', requireUserAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { deviceId, farmId, hours, limit } = req.query;
  const db = getDb();

  try {
    const maxHours = Math.min(Math.max(Number(hours) || 24, 1), 720); // between 1 hour and 30 days
    const maxLimit = Math.min(Math.max(Number(limit) || 100, 1), 1000);
    const cutoffTime = new Date(Date.now() - maxHours * 60 * 60 * 1000).toISOString();

    let query = 'SELECT * FROM telemetry_readings WHERE recorded_at >= $1';
    const params: (string | number)[] = [cutoffTime];
    let pIndex = 2;

    if (deviceId && typeof deviceId === 'string') {
      const devId = deviceId.trim();
      if (req.user!.role !== 'Admin' && req.user!.role !== 'Technician') {
        const dev = await db.queryOne<{ farm_id: string }>('SELECT farm_id FROM devices WHERE id = $1', [devId]);
        if (!dev || !req.user!.farmIds.includes(dev.farm_id)) {
          res.status(403).json({ error: 'Forbidden', message: `You do not have access to telemetry for device ${devId}` });
          return;
        }
      }
      query += ` AND device_id = $${pIndex++}`;
      params.push(devId);
    } else if (farmId && typeof farmId === 'string') {
      const fId = farmId.trim();
      if (req.user!.role !== 'Admin' && req.user!.role !== 'Technician') {
        if (!req.user!.farmIds.includes(fId)) {
          res.status(403).json({ error: 'Forbidden', message: `You do not have access to telemetry for farm ${fId}` });
          return;
        }
      }
      query += ` AND farm_id = $${pIndex++}`;
      params.push(fId);
    } else {
      // If neither specified, limit non-admins to their assigned farms
      if (req.user!.role !== 'Admin') {
        const userFarms = req.user!.farmIds;
        if (userFarms.length === 0) {
          res.json({ count: 0, windowHours: maxHours, readings: [] });
          return;
        }
        const placeholders = userFarms.map(() => `$${pIndex++}`).join(', ');
        query += ` AND farm_id IN (${placeholders})`;
        params.push(...userFarms);
      }
    }

    query += ` ORDER BY recorded_at ASC LIMIT $${pIndex++}`;
    params.push(maxLimit);

    const result = await db.query<DbTelemetryReading>(query, params);
    res.json({
      count: result.rows.length,
      windowHours: maxHours,
      readings: result.rows
    });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Database Error', message: (err as Error).message });
  }
});

export default router;
