import { getDb } from '../db/database';
import { hashPassword, verifyPassword, signSessionToken, verifySessionToken, generateDeviceToken, hashDeviceToken } from '../auth/security';
import { validateTelemetryPayload, type Esp32SensorPayload } from '../contracts/telemetryContract';

async function runPhase2Tests() {
  console.log('========================================================');
  console.log('      SMART PRECISION FARMING — PHASE 2 TEST SUITE      ');
  console.log('========================================================\n');

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

  // TEST 1: Database Initialization & Tables
  console.log('Test Group 1: Database & Schemas');
  try {
    const db = getDb();
    const userCountRow = await db.queryOne<{ c: number | string }>('SELECT COUNT(*) as c FROM users');
    const userCount = Number(userCountRow?.c || 0);
    assert(userCount >= 5, `Initial users seeded correctly (found ${userCount} users, expected >= 5)`);

    const farmCountRow = await db.queryOne<{ c: number | string }>('SELECT COUNT(*) as c FROM farms');
    const farmCount = Number(farmCountRow?.c || 0);
    assert(farmCount >= 3, `Initial farms seeded correctly (found ${farmCount} farms, expected >= 3)`);

    const devCountRow = await db.queryOne<{ c: number | string }>('SELECT COUNT(*) as c FROM devices');
    assert(Number(devCountRow?.c || 0) >= 2, 'Table "devices" initialized and seeded');

    const readingCountRow = await db.queryOne<{ c: number | string }>('SELECT COUNT(*) as c FROM telemetry_readings');
    assert(readingCountRow !== null, 'Table "telemetry_readings" initialized');
  } catch (err: unknown) {
    assert(false, 'Database initialization', (err as Error).message);
  }

  // TEST 2: Password Security & Constant-Time Verification
  console.log('\nTest Group 2: Password Security & Session Tokens');
  try {
    const rawPass = 'SecretFarmPassword!2026';
    const hash1 = hashPassword(rawPass);
    const hash2 = hashPassword(rawPass);

    assert(hash1 !== hash2, 'Salt uniqueness: identical passwords yield distinct salted hashes');
    assert(verifyPassword(rawPass, hash1), 'Password verification succeeds with correct password');
    assert(!verifyPassword('WrongPassword', hash1), 'Password verification rejects incorrect password');

    // Session token
    const token = signSessionToken({
      id: 'u-admin',
      email: 'admin@smartfarm.demo',
      name: 'Sumit Singh',
      role: 'Admin',
      farmIds: ['f1', 'f2', 'f3']
    });

    const session = verifySessionToken(token);
    assert(session !== null && session.userId === 'u-admin', 'Session token signs and verifies correctly');
    assert(session?.role === 'Admin', 'Session token encapsulates user role');

    const tampered = token.slice(0, -4) + 'abcd';
    assert(verifySessionToken(tampered) === null, 'Session token verification rejects tampered signatures');
  } catch (err: unknown) {
    assert(false, 'Security suite', (err as Error).message);
  }

  // TEST 3: Device Token Security & Revocation
  console.log('\nTest Group 3: Device Token Generation & Verification');
  try {
    const { rawToken, tokenHash } = generateDeviceToken();
    assert(rawToken.startsWith('gfd_'), 'Device token uses standard "gfd_" prefix');
    assert(hashDeviceToken(rawToken) === tokenHash, 'Device token hashes deterministically using SHA-256');

    // Device token rotation test in DB
    const db = getDb();
    const testDeviceId = 'ESP32-PN-TEST';
    await db.query('DELETE FROM devices WHERE id = $1', [testDeviceId]);
    await db.query(`
      INSERT INTO devices (id, name, farm_id, hardware_type, token_hash, status, battery_pct, last_seen_at, created_at)
      VALUES ($1, 'Test Node', 'f1', 'ESP32', $2, 'Offline', 100, NULL, $3)
    `, [testDeviceId, tokenHash, new Date().toISOString()]);

    const found = await db.queryOne<{ id: string }>('SELECT id FROM devices WHERE token_hash = $1', [tokenHash]);
    assert(found?.id === testDeviceId, 'Device lookup via hashed token succeeds');

    // Rotate token
    const rotated = generateDeviceToken();
    await db.query('UPDATE devices SET token_hash = $1 WHERE id = $2', [rotated.tokenHash, testDeviceId]);

    const oldLookup = await db.queryOne<{ id: string }>('SELECT id FROM devices WHERE token_hash = $1', [tokenHash]);
    const newLookup = await db.queryOne<{ id: string }>('SELECT id FROM devices WHERE token_hash = $1', [rotated.tokenHash]);

    assert(!oldLookup, 'Old device token is immediately revoked upon rotation');
    assert(newLookup?.id === testDeviceId, 'Rotated device token authenticates the device');

    // Clean up test device
    await db.query('DELETE FROM devices WHERE id = $1', [testDeviceId]);
  } catch (err: unknown) {
    assert(false, 'Device token suite', (err as Error).message);
  }

  // TEST 4: Telemetry Payload Validation Contract
  console.log('\nTest Group 4: Telemetry Ingestion Contract & Physical Range Validation');
  try {
    const validPayload: Esp32SensorPayload = {
      version: '1.0',
      device_id: 'ESP32-PN-001',
      timestamp: new Date().toISOString(),
      sht40: {
        valid: true,
        air_temperature_c: 28.5,
        relative_humidity_pct: 64.0
      },
      modbus: {
        valid: true,
        soil_moisture_pct: 36.2,
        soil_temperature_c: 27.4,
        soil_ph: 7.25,
        electrical_conductivity_ds_m: 0.68,
        nitrogen_kg_ha: 215.0,
        phosphorus_kg_ha: 17.5,
        potassium_kg_ha: 310.0
      },
      rain_gauge: {
        valid: true,
        pulse_count: 5,
        pulse_resolution_mm: 0.1498,
        accumulation_period_seconds: 60,
        rainfall_period_mm: 0.749,
        rainfall_cumulative_mm: 14.5
      },
      diagnostics: {
        battery_pct: 92.0
      }
    };

    const resValid = validateTelemetryPayload(validPayload);
    assert(resValid.valid, 'Valid full telemetry payload passes contract validation');

    // Test rejection of Modbus failed read stored as zero
    const invalidModbusPayload = {
      ...validPayload,
      modbus: {
        valid: true,
        soil_moisture_pct: -5.0, // physically invalid!
        soil_temperature_c: 25.0,
        soil_ph: 15.0, // invalid pH > 14
        electrical_conductivity_ds_m: 0.5,
        nitrogen_kg_ha: 200,
        phosphorus_kg_ha: 15,
        potassium_kg_ha: 250
      }
    };
    const resInvalidModbus = validateTelemetryPayload(invalidModbusPayload);
    assert(!resInvalidModbus.valid, 'Payload validator rejects negative moisture and pH > 12');

    // Test valid Modbus failure flag with null values
    const modbusFailurePayload: Esp32SensorPayload = {
      ...validPayload,
      modbus: {
        valid: false,
        error_code: 0xE2, // Modbus communication timeout
        soil_moisture_pct: null,
        soil_temperature_c: null,
        soil_ph: null,
        electrical_conductivity_ds_m: null,
        nitrogen_kg_ha: null,
        phosphorus_kg_ha: null,
        potassium_kg_ha: null
      }
    };
    const resModbusFailure = validateTelemetryPayload(modbusFailurePayload);
    assert(resModbusFailure.valid, 'Modbus failure with explicit nulls passes contract (no 0 conversion)');

    // Test raw register unit conversion (uS/cm -> dS/m and mg/kg -> kg/ha)
    const rawRegisterPayload = {
      ...validPayload,
      modbus: {
        valid: true,
        soil_moisture_pct: 35.0,
        soil_temperature_c: 26.5,
        soil_ph: 7.1,
        electrical_conductivity_us_cm: 650, // 650 uS/cm -> 0.65 dS/m
        nitrogen_mg_kg: 110.0, // 110 mg/kg -> 220.0 kg/ha
        phosphorus_mg_kg: 9.5, // 9.5 mg/kg -> 19.0 kg/ha
        potassium_mg_kg: 165.0 // 165 mg/kg -> 330.0 kg/ha
      }
    };
    const resRawRegister = validateTelemetryPayload(rawRegisterPayload);
    assert(resRawRegister.valid, 'Raw register units (uS/cm and mg/kg) pass validation');
    assert(resRawRegister.normalizedModbus?.electrical_conductivity_ds_m === 0.65, 'EC converted accurately: 650 uS/cm -> 0.65 dS/m');
    assert(resRawRegister.normalizedModbus?.nitrogen_kg_ha === 220.0, 'N converted accurately: 110 mg/kg -> 220 kg/ha (2.0 furrow factor)');

    // Test rejection of future timestamp drift (>10 min)
    const futurePayload = {
      ...validPayload,
      timestamp: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    };
    const resFuture = validateTelemetryPayload(futurePayload);
    assert(!resFuture.valid, 'Payload validator rejects future timestamp drift (>10 min)');
  } catch (err: unknown) {
    assert(false, 'Contract validation suite', (err as Error).message);
  }

  // TEST 5: HTTP Endpoints End-to-End Test (using local fetch)
  console.log('\nTest Group 5: HTTP Server API End-to-End Tests');
  try {
    const baseUrl = 'http://127.0.0.1:3000';

    // 5.1 Health Check
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthJson = await healthRes.json() as { status: string; database: { status: string } };
    assert(healthRes.status === 200, 'GET /api/health returns 200 OK');
    assert(healthJson.status === 'ok' && healthJson.database?.status === 'connected', 'Health report shows database connected');

    // 5.2 Contract Specification
    const contractRes = await fetch(`${baseUrl}/api/v1/telemetry/contract`);
    const contractJson = await contractRes.json() as { version: string };
    assert(contractRes.status === 200 && contractJson.version === '1.0', 'GET /api/v1/telemetry/contract returns 1.0 contract');

    // 5.3 Authentication - Failed Login
    const badLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@smartfarm.demo', password: 'IncorrectPassword!' })
    });
    assert(badLoginRes.status === 401, 'POST /api/auth/login with incorrect credentials returns 401 Unauthorized');

    // 5.4 Authentication - Successful Admin Login
    const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@smartfarm.demo', password: 'SmartFarmPassword2026!' })
    });
    const adminLoginJson = await adminLoginRes.json() as { token: string; user: { role: string; name: string } };
    assert(adminLoginRes.status === 200, 'POST /api/auth/login with valid credentials returns 200 OK');
    assert(adminLoginJson.user?.role === 'Admin', 'Admin user profile returned');
    const adminToken = adminLoginJson.token;

    // 5.5 Authentication - Successful Farmer Login
    const farmerLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'pushkar@smartfarm.demo', password: 'SmartFarmPassword2026!' })
    });
    const farmerLoginJson = await farmerLoginRes.json() as { token: string; user: { role: string } };
    assert(farmerLoginRes.status === 200 && farmerLoginJson.user.role === 'Farmer', 'Farmer login returns role Farmer');
    const farmerToken = farmerLoginJson.token;

    // 5.6 Authorization - Farmer forbidden from Admin device creation
    const forbiddenRes = await fetch(`${baseUrl}/api/devices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${farmerToken}`
      },
      body: JSON.stringify({ id: 'ESP32-FORBIDDEN', name: 'Unauthorized Node', farmId: 'f1' })
    });
    assert(forbiddenRes.status === 403, 'Server enforces role authorization: Farmer POST /api/devices returns 403 Forbidden');

    // 5.7 Authorization - Admin allowed to list devices
    const adminDevicesRes = await fetch(`${baseUrl}/api/devices`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const adminDevicesJson = await adminDevicesRes.json() as { devices: unknown[] };
    assert(adminDevicesRes.status === 200 && Array.isArray(adminDevicesJson.devices), 'Admin GET /api/devices returns 200 with device list');

    // 5.8 Telemetry Ingestion - Unauthorized device token
    const unauthIngest = await fetch(`${baseUrl}/api/v1/telemetry/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Token': 'gfd_invalid_token_123456789'
      },
      body: JSON.stringify({ version: '1.0' })
    });
    assert(unauthIngest.status === 401, 'POST /api/v1/telemetry/ingest with invalid device token returns 401 Unauthorized');

    // 5.9 Telemetry Ingestion - Create registered device and ingest real telemetry
    const newDeviceId = `ESP32-INGEST-${Date.now()}`;
    const regRes = await fetch(`${baseUrl}/api/devices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        id: newDeviceId,
        name: 'Automated Ingestion Test Node',
        farmId: 'f1',
        hardwareType: 'ESP32 + SHT40 + Modbus RS485'
      })
    });
    const regJson = await regRes.json() as { deviceToken: string };
    assert(regRes.status === 201 && !!regJson.deviceToken, 'Admin registers new device and receives revocable token');

    const ingestPayload: Esp32SensorPayload = {
      version: '1.0',
      device_id: newDeviceId,
      timestamp: new Date().toISOString(),
      sht40: {
        valid: true,
        air_temperature_c: 27.2,
        relative_humidity_pct: 58.5
      },
      modbus: {
        valid: true,
        soil_moisture_pct: 38.4,
        soil_temperature_c: 26.1,
        soil_ph: 7.42,
        electrical_conductivity_ds_m: 0.72,
        nitrogen_kg_ha: 224.0,
        phosphorus_kg_ha: 19.0,
        potassium_kg_ha: 335.0
      },
      rain_gauge: {
        valid: true,
        pulse_count: 2,
        pulse_resolution_mm: 0.1498,
        accumulation_period_seconds: 60,
        rainfall_period_mm: 0.2996,
        rainfall_cumulative_mm: 18.2
      },
      diagnostics: {
        battery_pct: 95.0,
        wifi_rssi_dbm: -62
      }
    };

    const ingestRes = await fetch(`${baseUrl}/api/v1/telemetry/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Token': regJson.deviceToken
      },
      body: JSON.stringify(ingestPayload)
    });
    const ingestJson = await ingestRes.json() as { status: string; readingId: number };
    assert(ingestRes.status === 201 && ingestJson.status === 'success', 'Authenticated device ingests telemetry payload (returns 201 Created)');

    // 5.10 Query latest reading
    const latestRes = await fetch(`${baseUrl}/api/v1/telemetry/latest?deviceId=${newDeviceId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const latestJson = await latestRes.json() as { reading: { soil_moisture_pct: number; soil_ph: number } };
    assert(latestRes.status === 200, 'GET /api/v1/telemetry/latest returns 200 OK');
    assert(latestJson.reading?.soil_moisture_pct === 38.4 && latestJson.reading?.soil_ph === 7.42, 'Ingested readings faithfully retrieved from database');

    // 5.11 Query telemetry history
    const historyRes = await fetch(`${baseUrl}/api/v1/telemetry/history?deviceId=${newDeviceId}&hours=24`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const historyJson = await historyRes.json() as { count: number; readings: unknown[] };
    assert(historyRes.status === 200 && historyJson.count >= 1, 'GET /api/v1/telemetry/history returns time-series array');

    // 5.12 Demo Accounts endpoint (client-side demo mode preservation)
    const demoAccountsRes = await fetch(`${baseUrl}/api/auth/demo-accounts`);
    const demoAccountsJson = await demoAccountsRes.json() as { demoAccounts: { name: string }[] };
    assert(demoAccountsRes.status === 200, 'GET /api/auth/demo-accounts returns 200 OK');
    const demoNames = demoAccountsJson.demoAccounts?.map(a => a.name) || [];
    assert(demoNames.includes('Sumit Singh') && demoNames.includes('Pushkar Kandalgaonkar'), 'Demo accounts preserved with Sumit Singh and Pushkar Kandalgaonkar');

    // 5.13 Frontend serving check at root
    const frontendRes = await fetch(`${baseUrl}/`);
    const frontendHtml = await frontendRes.text();
    assert(frontendRes.status === 200 && frontendHtml.includes('<div id="root"></div>'), 'Root URL "/" serves frontend application HTML');

    // 5.14 Unmatched API route returns 404 JSON, not SPA HTML
    const unknownApiRes = await fetch(`${baseUrl}/api/nonexistent-endpoint-test`);
    const unknownApiJson = await unknownApiRes.json() as { error: string; path: string };
    assert(unknownApiRes.status === 404, 'Unmatched API endpoint returns 404 status');
    assert(unknownApiJson.error === 'Endpoint not found', 'Unmatched API endpoint returns JSON error object');

    // 5.15 Nested unmatched API route returns 404 JSON
    const nestedUnknownApiRes = await fetch(`${baseUrl}/api/v1/unknown/nested`);
    const nestedUnknownApiJson = await nestedUnknownApiRes.json() as { error: string; path: string };
    assert(nestedUnknownApiRes.status === 404 && nestedUnknownApiJson.error === 'Endpoint not found', 'Unmatched nested API endpoint returns 404 JSON');

    // 5.16 Client-side route serves frontend application HTML
    const clientRouteRes = await fetch(`${baseUrl}/dashboard`);
    const clientRouteHtml = await clientRouteRes.text();
    assert(clientRouteRes.status === 200 && clientRouteHtml.includes('<div id="root"></div>'), 'Client-side route "/dashboard" serves frontend application HTML');

    // 5.17 Production SPA fallback router registration regression check
    const expressModule = (await import('express')).default;
    const testApp = expressModule();
    let routeRegisteredWithoutError = false;
    try {
      testApp.get('{*path}', (_req, res) => res.send('ok'));
      routeRegisteredWithoutError = true;
    } catch {
      routeRegisteredWithoutError = false;
    }
    assert(routeRegisteredWithoutError, 'Express 5 route registration with "{*path}" succeeds without PathError');
  } catch (err: unknown) {
    assert(false, 'HTTP Server E2E Suite', (err as Error).message);
  }

  console.log('\n========================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log('========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2Tests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
