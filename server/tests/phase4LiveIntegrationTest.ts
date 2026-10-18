import { getDb } from '../db/database';
import { signSessionToken, generateDeviceToken } from '../auth/security';
import { evaluateDeviceStatus } from '../routes/deviceRoutes';

async function runPhase4Tests() {
  console.log('================================================================');
  console.log('      SMART PRECISION FARMING — PHASE 4 INTEGRATION SUITE       ');
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

  // Test Tokens
  const adminToken = signSessionToken({
    id: 'u-admin',
    email: 'admin@smartfarm.demo',
    name: 'Sumit Singh',
    role: 'Admin',
    farmIds: ['f1', 'f2', 'f3']
  });

  const farmerPushkarToken = signSessionToken({
    id: 'u-pushkar',
    email: 'pushkar@smartfarm.demo',
    name: 'Pushkar Kandalgaonkar',
    role: 'Farmer',
    farmIds: ['f1'] // Assigned ONLY to f1
  });

  const farmerRameshToken = signSessionToken({
    id: 'u-ramesh',
    email: 'ramesh@smartfarm.demo',
    name: 'Ramesh Patil',
    role: 'Farmer',
    farmIds: ['f2'] // Assigned ONLY to f2
  });

  // TEST GROUP 1: Demo / Live Separation & Demo Accounts
  console.log('Test Group 1: Demo / Live Separation & Accounts');
  try {
    const demoRes = await fetch(`${baseUrl}/api/auth/demo-accounts`);
    const demoJson = await demoRes.json() as { demoAccounts: Array<{ id: string; role: string }> };
    assert(demoRes.status === 200, 'GET /api/auth/demo-accounts returns 200 OK');
    assert(demoJson.demoAccounts.length >= 5, 'Demo accounts endpoint returns all 5 seeded role accounts');
    assert(demoJson.demoAccounts.some(u => u.id === 'u-pushkar' && u.role === 'Farmer'), 'Farmer Pushkar present with role Farmer');
  } catch (err: unknown) {
    assert(false, 'Demo accounts endpoint failed', (err as Error).message);
  }

  // TEST GROUP 2: Server-Side Farm & Device Permission Enforcement
  console.log('\nTest Group 2: Server-Side RBAC & Farm Data Isolation');
  try {
    // 1. Pushkar queries his own farm (f1) -> Allowed (200 OK)
    const ownFarmRes = await fetch(`${baseUrl}/api/v1/telemetry/latest?farmId=f1`, {
      headers: { 'Authorization': `Bearer ${farmerPushkarToken}` }
    });
    assert(ownFarmRes.status === 200, 'Farmer accessing own farm telemetry (f1) returns 200 OK');

    // 2. Pushkar queries Ramesh\'s farm (f2) -> Must be Forbidden (403)
    const crossFarmRes = await fetch(`${baseUrl}/api/v1/telemetry/latest?farmId=f2`, {
      headers: { 'Authorization': `Bearer ${farmerPushkarToken}` }
    });
    assert(crossFarmRes.status === 403, 'Cross-farm data isolation: Farmer accessing unauthorized farm (f2) returns 403 Forbidden');

    // 3. Pushkar queries history for f2 -> Must be Forbidden (403)
    const crossHistoryRes = await fetch(`${baseUrl}/api/v1/telemetry/history?farmId=f2`, {
      headers: { 'Authorization': `Bearer ${farmerPushkarToken}` }
    });
    assert(crossHistoryRes.status === 403, 'Cross-farm history access denied with 403 Forbidden');

    // 4. Admin queries f2 -> Allowed (200 OK)
    const adminFarmRes = await fetch(`${baseUrl}/api/v1/telemetry/latest?farmId=f2`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(adminFarmRes.status === 200, 'Platform Administrator querying farm f2 returns 200 OK');

    // 5. Pushkar queries device on f2 (ESP32-ST-002) -> Forbidden (403)
    const crossDeviceRes = await fetch(`${baseUrl}/api/v1/telemetry/latest?deviceId=ESP32-ST-002`, {
      headers: { 'Authorization': `Bearer ${farmerPushkarToken}` }
    });
    assert(crossDeviceRes.status === 403, 'Farmer accessing unauthorized device returns 403 Forbidden');
  } catch (err: unknown) {
    assert(false, 'RBAC suite error', (err as Error).message);
  }

  // TEST GROUP 3: Authoritative Raw Sensor Values & Zero-Loss Rainfall
  console.log('\nTest Group 3: Raw Sensor Units & Rainfall Accumulation Semantics');
  try {
    const testDevId = 'ESP32-PN-001';
    const { rawToken, tokenHash } = generateDeviceToken();
    await db.query('UPDATE devices SET token_hash = $1 WHERE id = $2', [tokenHash, testDevId]);

    const nowIso = new Date().toISOString();
    const rawIngestPayload = {
      version: '1.0',
      device_id: testDevId,
      timestamp: nowIso,
      sht40: { valid: true, air_temperature_c: 27.6, relative_humidity_pct: 65.4 },
      modbus: {
        valid: true,
        soil_moisture_pct: 38.4,
        soil_temperature_c: 26.2,
        soil_ph: 6.85,
        electrical_conductivity_us_cm: 680,
        nitrogen_mg_kg: 112.0,
        phosphorus_mg_kg: 14.0,
        potassium_mg_kg: 175.0
      },
      rain_gauge: {
        valid: true,
        pulse_count: 5,
        pulse_resolution_mm: 0.1498,
        accumulation_period_seconds: 60,
        rainfall_period_mm: 0.749,
        rainfall_cumulative_mm: 18.5
      },
      diagnostics: {
        uptime_seconds: 8000,
        wifi_rssi_dbm: -58,
        battery_pct: 95.0,
        free_heap_bytes: 183000
      }
    };

    const ingestRes = await fetch(`${baseUrl}/api/v1/telemetry/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Device-Token': rawToken },
      body: JSON.stringify(rawIngestPayload)
    });
    const ingestJson = await ingestRes.json() as { readingId: number };
    assert(ingestRes.status === 201, 'Telemetry ingest succeeds (201 Created)');

    // Query back the latest reading to verify raw payload preservation
    const latestRes = await fetch(`${baseUrl}/api/v1/telemetry/latest?deviceId=${testDevId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const latestJson = await latestRes.json() as { reading: any };
    assert(latestRes.status === 200, 'GET /api/v1/telemetry/latest returns 200 OK');

    const reading = latestJson.reading;
    assert(reading.soil_moisture_pct === 38.4, 'Soil moisture accurately stored as 38.4%');
    assert(reading.rain_pulses === 5, 'Rain pulses stored as 5 tips');
    assert(Math.abs(reading.rain_accumulation_mm - 0.749) < 0.001, 'Interval rain accumulation stored as 0.749 mm');

    const parsedRaw = JSON.parse(reading.raw_payload);
    assert(parsedRaw.modbus.electrical_conductivity_us_cm === 680, 'Raw EC preserved in uS/cm (680 uS/cm)');
    assert(parsedRaw.modbus.nitrogen_mg_kg === 112.0, 'Raw NPK Nitrogen preserved in mg/kg (112.0 mg/kg)');
    assert(parsedRaw.rain_gauge.rainfall_cumulative_mm === 18.5, 'Cumulative rainfall preserved in raw payload (18.5 mm)');
  } catch (err: unknown) {
    assert(false, 'Raw sensor values suite error', (err as Error).message);
  }

  // TEST GROUP 4: Null Preservation on Sensor Failure (No Zero Conversion)
  console.log('\nTest Group 4: Sensor Failure Handling & Null Safety');
  try {
    const testDevId = 'ESP32-PN-001';
    const { rawToken, tokenHash } = generateDeviceToken();
    await db.query('UPDATE devices SET token_hash = $1 WHERE id = $2', [tokenHash, testDevId]);

    const failPayload = {
      version: '1.0',
      device_id: testDevId,
      timestamp: new Date().toISOString(),
      sht40: { valid: false, air_temperature_c: null, relative_humidity_pct: null },
      modbus: {
        valid: false,
        error_code: 0xE4,
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
        rainfall_period_mm: 0.0
      }
    };

    const failRes = await fetch(`${baseUrl}/api/v1/telemetry/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Device-Token': rawToken },
      body: JSON.stringify(failPayload)
    });
    const failJson = await failRes.json() as { readingId: number };
    assert(failRes.status === 201, 'Faulty sensor ingest accepted safely (201 Created)');

    const failRecord = await db.queryOne<{
      air_temperature_c: number | null;
      soil_moisture_pct: number | null;
      soil_ph: number | null;
      sht40_valid: boolean | number;
      modbus_valid: boolean | number;
    }>('SELECT air_temperature_c, soil_moisture_pct, soil_ph, sht40_valid, modbus_valid FROM telemetry_readings WHERE id = $1', [failJson.readingId]);
    assert(!failRecord?.sht40_valid || failRecord?.sht40_valid === 0, 'SHT40 validity recorded as false/0');
    assert(!failRecord?.modbus_valid || failRecord?.modbus_valid === 0, 'Modbus validity recorded as false/0');
    assert(failRecord?.air_temperature_c === null, 'Air temperature is NULL, not 0.0');
    assert(failRecord?.soil_moisture_pct === null, 'Soil moisture is NULL, not 0.0');
    assert(failRecord?.soil_ph === null, 'Soil pH is NULL, not 0.0');
  } catch (err: unknown) {
    assert(false, 'Sensor failure test suite error', (err as Error).message);
  }

  // TEST GROUP 5: Device Status Timestamp Thresholds
  console.log('\nTest Group 5: Device Status Evaluation from Last-Seen Timestamps');
  try {
    const now = Date.now();
    const oneMinAgo = new Date(now - 60 * 1000).toISOString();
    const fiveMinAgo = new Date(now - 5 * 60 * 1000).toISOString();
    const twentyMinAgo = new Date(now - 20 * 60 * 1000).toISOString();

    assert(evaluateDeviceStatus('Offline', oneMinAgo) === 'Online', 'Device seen 60s ago is Online (<= 180s threshold)');
    assert(evaluateDeviceStatus('Online', fiveMinAgo) === 'Needs attention', 'Device seen 5m ago is Needs attention / Stale (180s-900s threshold)');
    assert(evaluateDeviceStatus('Online', twentyMinAgo) === 'Offline', 'Device seen 20m ago is Offline (> 900s threshold)');
    assert(evaluateDeviceStatus('Online', null) === 'Offline', 'Device with null last_seen_at is Offline');
    assert(evaluateDeviceStatus('Maintenance', oneMinAgo) === 'Maintenance', 'Device in Maintenance status is preserved');
  } catch (err: unknown) {
    assert(false, 'Device status thresholds error', (err as Error).message);
  }

  // TEST GROUP 6: Historical Time-Series Query Filtering
  console.log('\nTest Group 6: Historical Time-Series Query & Limits');
  try {
    const historyRes = await fetch(`${baseUrl}/api/v1/telemetry/history?hours=24&limit=5`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const historyJson = await historyRes.json() as { count: number; windowHours: number; readings: any[] };
    assert(historyRes.status === 200, 'GET /api/v1/telemetry/history returns 200 OK');
    assert(historyJson.windowHours === 24, 'History window acknowledged as 24 hours');
    assert(historyJson.readings.length <= 5, 'History query enforces limit parameter');
    assert(Array.isArray(historyJson.readings), 'Readings is an array of records');
  } catch (err: unknown) {
    assert(false, 'History query suite error', (err as Error).message);
  }

  console.log('\n================================================================');
  console.log(`PHASE 4 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase4Tests().catch(err => {
  console.error('Fatal Phase 4 test runner error:', err);
  process.exit(1);
});
