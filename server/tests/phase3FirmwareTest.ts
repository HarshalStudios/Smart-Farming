import { getDb } from '../db/database';
import { validateTelemetryPayload, type Esp32SensorPayload } from '../contracts/telemetryContract';
import { generateDeviceToken, hashDeviceToken, signSessionToken } from '../auth/security';

async function runPhase3FirmwareTests() {
  console.log('================================================================');
  console.log('      SMART PRECISION FARMING — PHASE 3 FIRMWARE SUITE          ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}${detail ? ' - ' + detail : ''}`);
      failed++;
    }
  }

  const baseUrl = 'http://127.0.0.1:3000';
  const db = getDb();

  // Seed or fetch test device
  const testDeviceId = 'ESP32-PN-001';
  const { rawToken, tokenHash } = generateDeviceToken();

  db.prepare(`
    INSERT OR REPLACE INTO devices (id, name, farm_id, hardware_type, token_hash, status, battery_pct, last_seen_at, created_at)
    VALUES (?, 'Soil & Weather Node 01', 'f1', 'ESP32 + SHT40 + Modbus RS485 + RainGauge', ?, 'Offline', 100.0, NULL, ?)
  `).run(testDeviceId, tokenHash, new Date().toISOString());

  // Admin session token for queries
  const adminToken = signSessionToken({
    id: 'u-admin',
    email: 'admin@smartfarm.demo',
    name: 'Sumit Singh',
    role: 'Admin',
    farmIds: ['f1', 'f2', 'f3']
  });

  // TEST 1: Firmware Ingestion Payload - Exact esp32_smartfarm.ino structure
  console.log('Test Group 1: Firmware Telemetry Payload Verification');
  try {
    const firmwarePayload: Esp32SensorPayload = {
      version: '1.0',
      device_id: testDeviceId,
      timestamp: new Date().toISOString(),
      sht40: {
        valid: true,
        air_temperature_c: 29.4,
        relative_humidity_pct: 61.5
      },
      modbus: {
        valid: true,
        soil_moisture_pct: 35.8,
        soil_temperature_c: 26.8,
        soil_ph: 7.35,
        electrical_conductivity_us_cm: 640,
        nitrogen_mg_kg: 108.0,
        phosphorus_mg_kg: 9.0,
        potassium_mg_kg: 155.0
      },
      rain_gauge: {
        valid: true,
        pulse_count: 4,
        pulse_resolution_mm: 0.1498,
        accumulation_period_seconds: 60,
        rainfall_period_mm: 0.5992,
        rainfall_cumulative_mm: 15.2
      },
      diagnostics: {
        uptime_seconds: 7200,
        wifi_rssi_dbm: -64,
        battery_pct: 94.0,
        free_heap_bytes: 182400
      }
    };

    const valResult = validateTelemetryPayload(firmwarePayload);
    assert(valResult.valid, 'Firmware sketch payload passes contract validation');
    assert(valResult.normalizedModbus?.electrical_conductivity_ds_m === 0.64, 'Raw EC 640 uS/cm normalized to 0.64 dS/m');
    assert(valResult.normalizedModbus?.nitrogen_kg_ha === 216.0, 'Raw N 108 mg/kg normalized to 216 kg/ha (2.0 furrow-slice conversion)');
    assert(valResult.normalizedModbus?.phosphorus_kg_ha === 18.0, 'Raw P 9 mg/kg normalized to 18 kg/ha');
    assert(valResult.normalizedModbus?.potassium_kg_ha === 310.0, 'Raw K 155 mg/kg normalized to 310 kg/ha');
  } catch (err: unknown) {
    assert(false, 'Payload verification suite', (err as Error).message);
  }

  // TEST 2: HTTP Ingestion via X-Device-Token Header
  console.log('\nTest Group 2: Live Ingestion API (POST /api/v1/telemetry/ingest)');
  try {
    const livePayload: Esp32SensorPayload = {
      version: '1.0',
      device_id: testDeviceId,
      timestamp: new Date().toISOString(),
      sht40: {
        valid: true,
        air_temperature_c: 28.2,
        relative_humidity_pct: 63.0
      },
      modbus: {
        valid: true,
        soil_moisture_pct: 37.1,
        soil_temperature_c: 25.9,
        soil_ph: 7.18,
        electrical_conductivity_us_cm: 710,
        nitrogen_mg_kg: 115.0,
        phosphorus_mg_kg: 10.0,
        potassium_mg_kg: 160.0
      },
      rain_gauge: {
        valid: true,
        pulse_count: 2,
        pulse_resolution_mm: 0.1498,
        accumulation_period_seconds: 60,
        rainfall_period_mm: 0.2996,
        rainfall_cumulative_mm: 15.5
      },
      diagnostics: {
        uptime_seconds: 7260,
        wifi_rssi_dbm: -60,
        battery_pct: 94.0,
        free_heap_bytes: 181950
      }
    };

    const ingestRes = await fetch(`${baseUrl}/api/v1/telemetry/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Token': rawToken
      },
      body: JSON.stringify(livePayload)
    });

    const ingestJson = await ingestRes.json() as { status?: string; readingId?: number; error?: string; details?: unknown };
    if (ingestRes.status !== 201) {
      console.log('Group 2 ingest failed:', ingestRes.status, ingestJson);
    }
    assert(ingestRes.status === 201 && ingestJson.status === 'success', 'ESP32 firmware successfully posts telemetry (201 Created)');

    // Verify device status updated to 'Online' with recent last_seen_at
    const devRow = db.prepare('SELECT status, battery_pct, last_seen_at FROM devices WHERE id = ?').get(testDeviceId) as { status: string; battery_pct: number; last_seen_at: string };
    assert(devRow.status === 'Online', 'Device status transitioned to Online in database');
    assert(devRow.battery_pct === 94.0, 'Device battery updated from diagnostics');
    assert(!!devRow.last_seen_at, 'Device last_seen_at recorded');
  } catch (err: unknown) {
    assert(false, 'Live ingestion suite', (err as Error).message);
  }

  // TEST 3: Null Preservation on Modbus Failure (Never store zero for error)
  console.log('\nTest Group 3: Modbus Communication Failure Handling');
  try {
    const failedModbusPayload = {
      version: '1.0',
      device_id: testDeviceId,
      timestamp: new Date().toISOString(),
      sht40: {
        valid: true,
        air_temperature_c: 28.0,
        relative_humidity_pct: 60.0
      },
      modbus: {
        valid: false,
        error_code: 0xE2, // Modbus timeout error code
        soil_moisture_pct: null,
        soil_temperature_c: null,
        soil_ph: null,
        electrical_conductivity_ds_m: null,
        nitrogen_kg_ha: null,
        phosphorus_kg_ha: null,
        potassium_kg_ha: null
      },
      rain_gauge: {
        valid: true,
        pulse_count: 0,
        pulse_resolution_mm: 0.1498,
        accumulation_period_seconds: 60,
        rainfall_period_mm: 0.0,
        rainfall_cumulative_mm: 15.5
      },
      diagnostics: {
        uptime_seconds: 7320,
        wifi_rssi_dbm: -61,
        battery_pct: 94.0,
        free_heap_bytes: 181800
      }
    };

    const failIngestRes = await fetch(`${baseUrl}/api/v1/telemetry/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Token': rawToken
      },
      body: JSON.stringify(failedModbusPayload)
    });

    const failJson = await failIngestRes.json() as { readingId: number };
    assert(failIngestRes.status === 201, 'Failed Modbus reading safely accepted with valid: false');

    // Query SQLite database to verify NULL values were stored, NOT 0.0
    const readingRow = db.prepare(`
      SELECT soil_moisture_pct, soil_temperature_c, soil_ph, modbus_valid 
      FROM telemetry_readings WHERE id = ?
    `).get(failJson.readingId) as { soil_moisture_pct: number | null; soil_ph: number | null; modbus_valid: number };

    assert(readingRow.modbus_valid === 0, 'modbus_valid stored as 0 in database');
    assert(readingRow.soil_moisture_pct === null, 'CRITICAL: Failed moisture is stored as NULL, never 0.0');
    assert(readingRow.soil_ph === null, 'CRITICAL: Failed pH is stored as NULL, never 0.0');
  } catch (err: unknown) {
    assert(false, 'Null preservation suite', (err as Error).message);
  }

  // TEST 4: Tipping-Bucket Rain Gauge Interval Calibration
  console.log('\nTest Group 4: Rain Gauge Debounce & Calibration Verification');
  try {
    const tips = 7;
    const expectedMm = Number((tips * 0.1498).toFixed(4)); // 1.0486 mm
    const rainPayload = {
      version: '1.0',
      device_id: testDeviceId,
      timestamp: new Date().toISOString(),
      sht40: { valid: true, air_temperature_c: 24.5, relative_humidity_pct: 88.0 },
      modbus: { valid: false, error_code: 0xE2 },
      rain_gauge: {
        valid: true,
        pulse_count: tips,
        pulse_resolution_mm: 0.1498,
        accumulation_period_seconds: 60,
        rainfall_period_mm: expectedMm,
        rainfall_cumulative_mm: 16.5486
      }
    };

    const rainRes = await fetch(`${baseUrl}/api/v1/telemetry/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Device-Token': rawToken },
      body: JSON.stringify(rainPayload)
    });
    const rainJson = await rainRes.json() as { readingId: number };

    const rainRecord = db.prepare('SELECT rain_pulses, rain_accumulation_mm FROM telemetry_readings WHERE id = ?').get(rainJson.readingId) as { rain_pulses: number; rain_accumulation_mm: number };
    assert(rainRecord.rain_pulses === 7, 'Rain pulse count recorded accurately (7 tips)');
    assert(Math.abs(rainRecord.rain_accumulation_mm - expectedMm) < 0.0001, `Rain accumulation calibrated: 7 * 0.1498 = ${expectedMm} mm`);
  } catch (err: unknown) {
    assert(false, 'Rain gauge suite', (err as Error).message);
  }

  // TEST 5: Telemetry Querying (Latest & History)
  console.log('\nTest Group 5: Telemetry Query API for Dashboards');
  try {
    const latestRes = await fetch(`${baseUrl}/api/v1/telemetry/latest?deviceId=${testDeviceId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const latestJson = await latestRes.json() as { reading: { device_id: string; rain_pulses: number } };
    assert(latestRes.status === 200, 'GET /api/v1/telemetry/latest returns 200 OK');
    assert(latestJson.reading.device_id === testDeviceId, 'Latest reading device ID matches');

    const historyRes = await fetch(`${baseUrl}/api/v1/telemetry/history?deviceId=${testDeviceId}&hours=1`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const historyJson = await historyRes.json() as { count: number };
    assert(historyRes.status === 200 && historyJson.count >= 3, `Historical time-series returned ${historyJson.count} ingested telemetry points`);
  } catch (err: unknown) {
    assert(false, 'Telemetry query suite', (err as Error).message);
  }

  // TEST 6: Device Token Rotation & Revocation Security
  console.log('\nTest Group 6: Token Rotation & Hardware Security');
  try {
    // Rotate token via Admin API
    const rotateRes = await fetch(`${baseUrl}/api/devices/${testDeviceId}/rotate-token`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const rotateJson = await rotateRes.json() as { newDeviceToken: string };
    assert(rotateRes.status === 200 && !!rotateJson.newDeviceToken, 'Admin API rotates device token');

    // Ingest with old revoked token -> must fail 401
    const oldTokenPayload = {
      version: '1.0',
      device_id: testDeviceId,
      timestamp: new Date().toISOString(),
      sht40: { valid: true, air_temperature_c: 25.0, relative_humidity_pct: 60.0 },
      modbus: { valid: false },
      rain_gauge: { valid: true, pulse_count: 0, pulse_resolution_mm: 0.1498, accumulation_period_seconds: 60, rainfall_period_mm: 0 }
    };

    const rejectedRes = await fetch(`${baseUrl}/api/v1/telemetry/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Device-Token': rawToken },
      body: JSON.stringify(oldTokenPayload)
    });
    assert(rejectedRes.status === 401, 'Old device token is immediately rejected with 401 Unauthorized');

    // Ingest with new rotated token -> must succeed 201
    const acceptedRes = await fetch(`${baseUrl}/api/v1/telemetry/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Device-Token': rotateJson.newDeviceToken },
      body: JSON.stringify(oldTokenPayload)
    });
    assert(acceptedRes.status === 201, 'New rotated token authenticates firmware ingestion successfully');
  } catch (err: unknown) {
    assert(false, 'Token rotation security suite', (err as Error).message);
  }

  console.log('\n================================================================');
  console.log(`PHASE 3 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase3FirmwareTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
