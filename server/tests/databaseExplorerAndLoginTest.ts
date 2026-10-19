import express from 'express';
import { initDatabase, getDb } from '../db/database';
import { signSessionToken } from '../auth/security';
import authRoutes from '../routes/authRoutes';
import deviceRoutes from '../routes/deviceRoutes';
import telemetryRoutes from '../routes/telemetryRoutes';
import dbExplorerRoutes from '../routes/dbExplorerRoutes';

async function runTests() {
  console.log('================================================================');
  console.log('   SMART PRECISION FARMING — DB EXPLORER & LOGIN TEST SUITE     ');
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

  // 1. Initialize Database
  const db = await initDatabase(':memory:');

  // 2. Setup Express test server
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/devices', deviceRoutes);
  app.use('/api/v1/telemetry', telemetryRoutes);
  app.use('/api/admin/database', dbExplorerRoutes);

  const server = app.listen(0);
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // -------------------------------------------------------------
    // Test Group 1: Priority 1 — Production Login & active IS TRUE
    // -------------------------------------------------------------
    console.log('Test Group 1: Production Login & Boolean Query Compatibility');

    // Direct DB query test verifying active IS TRUE
    const adminUser = await db.queryOne<{ id: string; email: string }>(
      'SELECT id, email FROM users WHERE email = $1 AND active IS TRUE',
      ['admin@smartfarm.demo']
    );
    assert(adminUser?.id === 'u-admin', 'Direct DB query with "active IS TRUE" resolves admin user without syntax error');

    // HTTP POST /api/auth/login test
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@smartfarm.demo', password: 'SmartFarmPassword2026!' })
    });
    assert(loginRes.status === 200, `POST /api/auth/login returned HTTP 200 (got ${loginRes.status})`);

    const loginData = await loginRes.json() as any;
    assert(typeof loginData.token === 'string' && loginData.token.length > 20, 'Login returns valid signed JWT session token');
    assert(loginData.user?.role === 'Admin', 'Login user profile role is Admin');

    // Farmer login test
    const farmerRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'pushkar@smartfarm.demo', password: 'SmartFarmPassword2026!' })
    });
    assert(farmerRes.status === 200, 'Farmer login succeeded with HTTP 200');
    const farmerData = await farmerRes.json() as any;
    const farmerToken = farmerData.token;
    const adminToken = loginData.token;

    // -------------------------------------------------------------
    // Test Group 2: Priority 2 — Device Token Rotation & Ingestion
    // -------------------------------------------------------------
    console.log('\nTest Group 2: Device Token Rotation & Hardware Authentication');

    // Rotate token for ESP32-PN-001 as Admin
    const rotateRes = await fetch(`${baseUrl}/api/devices/ESP32-PN-001/rotate-token`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(rotateRes.status === 200, `POST /api/devices/:id/rotate-token returned HTTP 200 (got ${rotateRes.status})`);

    const rotateData = await rotateRes.json() as any;
    const newDeviceToken = rotateData.newDeviceToken;
    assert(typeof newDeviceToken === 'string' && newDeviceToken.startsWith('gfd_'), 'New device token has valid "gfd_" prefix');

    // Verify old or placeholder token fails
    const failIngestRes = await fetch(`${baseUrl}/api/v1/telemetry/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Token': 'gfd_invalid_or_revoked_token'
      },
      body: JSON.stringify({
        version: '1.0',
        device_id: 'ESP32-PN-001',
        timestamp: new Date().toISOString(),
        sht40: { valid: true, air_temperature_c: 26.5, relative_humidity_pct: 60.0 },
        modbus: {
          valid: true,
          soil_moisture_pct: 42.0,
          soil_temperature_c: 24.0,
          soil_ph: 6.8,
          electrical_conductivity_us_cm: 650,
          nitrogen_mg_kg: 100,
          phosphorus_mg_kg: 15,
          potassium_mg_kg: 180
        },
        rain_gauge: {
          valid: true,
          pulse_count: 2,
          pulse_resolution_mm: 0.1498,
          accumulation_period_seconds: 60,
          rainfall_period_mm: 0.2996,
          rainfall_cumulative_mm: 5.5
        }
      })
    });
    assert(failIngestRes.status === 401, 'Revoked/invalid token rejected with HTTP 401 Unauthorized');

    // Ingest with newly rotated token
    const successIngestRes = await fetch(`${baseUrl}/api/v1/telemetry/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Token': newDeviceToken
      },
      body: JSON.stringify({
        version: '1.0',
        device_id: 'ESP32-PN-001',
        timestamp: new Date().toISOString(),
        sht40: { valid: true, air_temperature_c: 28.2, relative_humidity_pct: 58.0 },
        modbus: {
          valid: true,
          soil_moisture_pct: 39.5,
          soil_temperature_c: 25.1,
          soil_ph: 6.75,
          electrical_conductivity_us_cm: 620,
          nitrogen_mg_kg: 105,
          phosphorus_mg_kg: 16,
          potassium_mg_kg: 190
        },
        rain_gauge: {
          valid: true,
          pulse_count: 4,
          pulse_resolution_mm: 0.1498,
          accumulation_period_seconds: 60,
          rainfall_period_mm: 0.5992,
          rainfall_cumulative_mm: 6.1
        },
        diagnostics: {
          battery_pct: 95.0,
          wifi_rssi_dbm: -55
        }
      })
    });
    assert(successIngestRes.status === 201, `Ingest with rotated token returned HTTP 201 Created (got ${successIngestRes.status})`);

    // Verify device status and last_seen updated in DB
    const updatedDevice = await db.queryOne<{ status: string; battery_pct: number; last_seen_at: string }>(
      'SELECT status, battery_pct, last_seen_at FROM devices WHERE id = $1',
      ['ESP32-PN-001']
    );
    assert(updatedDevice?.status === 'Online', 'Device status transitioned to Online in database');
    assert(updatedDevice?.battery_pct === 95.0, 'Device battery updated to 95%');
    assert(!!updatedDevice?.last_seen_at, 'Device last_seen_at timestamp recorded');

    // -------------------------------------------------------------
    // Test Group 3: Priority 3 — Database Explorer RBAC & API
    // -------------------------------------------------------------
    console.log('\nTest Group 3: Database Explorer RBAC & Safe Browsing');

    // Overview without auth -> 401
    const unauthRes = await fetch(`${baseUrl}/api/admin/database/overview`);
    assert(unauthRes.status === 401, 'DB Explorer overview without auth returns 401 Unauthorized');

    // Overview with Farmer auth -> 403
    const farmerForbiddenRes = await fetch(`${baseUrl}/api/admin/database/overview`, {
      headers: { 'Authorization': `Bearer ${farmerToken}` }
    });
    assert(farmerForbiddenRes.status === 403, 'DB Explorer access by non-Admin (Farmer) is forbidden (403)');

    // Overview with Admin auth -> 200
    const adminOverviewRes = await fetch(`${baseUrl}/api/admin/database/overview`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(adminOverviewRes.status === 200, `Admin DB Explorer overview returns 200 OK (got ${adminOverviewRes.status})`);

    const overviewData = await adminOverviewRes.json() as any;
    assert(overviewData.status === 'connected', 'DB Explorer reports connected status');
    assert(Array.isArray(overviewData.tables) && overviewData.tables.length >= 4, `DB Explorer lists schema tables (found ${overviewData.tables.length})`);

    const tableNames = overviewData.tables.map((t: any) => t.name);
    assert(tableNames.includes('telemetry_readings'), 'Table "telemetry_readings" present in overview');
    assert(tableNames.includes('devices'), 'Table "devices" present in overview');
    assert(tableNames.includes('users'), 'Table "users" present in overview');
    assert(tableNames.includes('farms'), 'Table "farms" present in overview');

    // Query table telemetry_readings
    const telemetryTableRes = await fetch(`${baseUrl}/api/admin/database/table/telemetry_readings?page=1&pageSize=10`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const telemetryTableData = await telemetryTableRes.json() as any;
    if (telemetryTableRes.status !== 200) {
      console.error('telemetryTableRes error:', telemetryTableRes.status, telemetryTableData);
    }
    assert(telemetryTableRes.status === 200, `Query table telemetry_readings returns 200 OK (got ${telemetryTableRes.status})`);
    assert(Array.isArray(telemetryTableData.rows) && telemetryTableData.rows.length > 0, `Returned rows from telemetry_readings (count: ${telemetryTableData.rows?.length})`);
    assert(telemetryTableData.totalRows >= 1, `Total rows recorded: ${telemetryTableData.totalRows}`);

    // Query table users and verify password_hash REDACTION
    const usersTableRes = await fetch(`${baseUrl}/api/admin/database/table/users`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const usersTableData = await usersTableRes.json() as any;
    const allPasswordHashesRedacted = usersTableData.rows.every(
      (r: any) => r.password_hash === '[REDACTED_PASSWORD_HASH]'
    );
    assert(allPasswordHashesRedacted, 'SECURITY: All password hashes are redacted to [REDACTED_PASSWORD_HASH]');

    // Query table devices and verify token_hash REDACTION
    const devicesTableRes = await fetch(`${baseUrl}/api/admin/database/table/devices`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const devicesTableData = await devicesTableRes.json() as any;
    const allTokensRedacted = devicesTableData.rows.every(
      (r: any) => r.token_hash === '[REDACTED_TOKEN_HASH]'
    );
    assert(allTokensRedacted, 'SECURITY: All device token hashes are redacted to [REDACTED_TOKEN_HASH]');

    // Test nonexistent table
    const nonExistRes = await fetch(`${baseUrl}/api/admin/database/table/non_existent_table`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(nonExistRes.status === 404, 'Querying non-existent table returns 404 Not Found');

    // Test SQL injection attempt in tableName
    const sqliRes = await fetch(`${baseUrl}/api/admin/database/table/users;DROP%20TABLE%20users--`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(sqliRes.status === 404, 'SQL injection in table name is strictly rejected with 404');

    // Verify search in table records
    const searchRes = await fetch(`${baseUrl}/api/admin/database/table/users?search=Pushkar`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const searchData = await searchRes.json() as any;
    if (searchRes.status !== 200) {
      console.error('searchRes error:', searchRes.status, searchData);
    }
    assert(searchRes.status === 200, `Search request returns 200 (got ${searchRes.status})`);
    assert(Array.isArray(searchData.rows) && searchData.rows.some((r: any) => r.name.includes('Pushkar')), 'Search parameter accurately filters records');
  } finally {
    server.close();
  }

  console.log('\n================================================================');
  console.log(`DB EXPLORER & LOGIN TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
