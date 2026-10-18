import { getDb, initDatabase, sanitizeDatabaseUrl } from '../db/database';
import { signSessionToken, generateDeviceToken } from '../auth/security';

async function runPostgresCompatibilityTests() {
  console.log('================================================================');
  console.log('      SMART PRECISION FARMING — POSTGRESQL COMPATIBILITY SUITE  ');
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

  const db = await initDatabase();

  // Test Group 1: Database Adapter Interface & Async Contract
  console.log('Test Group 1: Database Adapter Interface & Parameter Support');
  try {
    assert(typeof db.query === 'function', 'Database adapter exposes async query()');
    assert(typeof db.queryOne === 'function', 'Database adapter exposes async queryOne()');
    assert(typeof db.exec === 'function', 'Database adapter exposes async exec()');
    assert(typeof db.getEngine === 'function', 'Database adapter exposes getEngine()');

    // Test parameter substitution with $1, $2
    const testEmail = 'admin@smartfarm.demo';
    const user = await db.queryOne<{ id: string; email: string }>(
      'SELECT id, email FROM users WHERE email = $1',
      [testEmail]
    );
    assert(user?.email === testEmail, 'Parameterized $1 query succeeds');

    // Test multiple parameters ($1, $2)
    const activeAdmin = await db.queryOne<{ id: string }>(
      'SELECT id FROM users WHERE email = $1 AND role = $2',
      [testEmail, 'Admin']
    );
    assert(activeAdmin?.id === 'u-admin', 'Multi-parameter ($1, $2) query resolves correctly');
  } catch (err: unknown) {
    assert(false, 'Adapter interface error', (err as Error).message);
  }

  // Test Group 2: DDL Idempotency & Schema Structure
  console.log('\nTest Group 2: Schema Idempotency & Constraints');
  try {
    // Re-running initialization must be idempotent and not throw
    await initDatabase();
    assert(true, 'Repeated database initialization is idempotent');

    // Verify seeded users count
    const usersRes = await db.query<{ id: string }>('SELECT id FROM users');
    assert(usersRes.rows.length >= 5, `Seeded users preserved (found ${usersRes.rows.length})`);

    // Verify seeded farms
    const farmsRes = await db.query<{ id: string }>('SELECT id FROM farms');
    assert(farmsRes.rows.length >= 3, `Seeded farms preserved (found ${farmsRes.rows.length})`);

    // Verify seeded devices
    const devicesRes = await db.query<{ id: string }>('SELECT id FROM devices');
    assert(devicesRes.rows.length >= 2, `Seeded devices preserved (found ${devicesRes.rows.length})`);
  } catch (err: unknown) {
    assert(false, 'Schema idempotency error', (err as Error).message);
  }

  // Test Group 3: RETURNING id and Auto-Increment Semantics
  console.log('\nTest Group 3: RETURNING id & Mutation Semantics');
  try {
    const testReadingDeviceId = 'ESP32-PN-001';
    const nowIso = new Date().toISOString();

    const insertRes = await db.query<{ id: number }>(`
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
    `, [
      testReadingDeviceId, 'f1', nowIso, nowIso,
      25.4, 55.0,
      40.2, 24.1, 6.7,
      0.55, 180.0, 15.0, 220.0,
      0, 0.0, 60,
      true, true, true,
      JSON.stringify({ note: 'PostgreSQL compatibility probe' })
    ]);

    assert(insertRes.rows.length > 0, 'INSERT with RETURNING id returns a row');
    const newId = Number(insertRes.rows[0].id);
    assert(!isNaN(newId) && newId > 0, `Generated primary key is positive integer (${newId})`);

    // Query back using $1
    const fetched = await db.queryOne<{ id: number; air_temperature_c: number }>(
      'SELECT id, air_temperature_c FROM telemetry_readings WHERE id = $1',
      [newId]
    );
    assert(fetched?.id === newId, 'Record successfully queried back by generated ID');
    assert(fetched?.air_temperature_c === 25.4, 'Numeric reading values preserved with precision');
  } catch (err: unknown) {
    assert(false, 'RETURNING id error', (err as Error).message);
  }

  // Test Group 4: Null Sensor Safety Under PostgreSQL Types
  console.log('\nTest Group 4: Null Sensor Safety Under PostgreSQL Types');
  try {
    const nowIso = new Date().toISOString();
    const failInsert = await db.query<{ id: number }>(`
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
    `, [
      'ESP32-PN-001', 'f1', nowIso, nowIso,
      null, null,
      null, null, null,
      null, null, null, null,
      0, 0.0, 60,
      false, false, true,
      null
    ]);

    const failId = Number(failInsert.rows[0].id);
    const reading = await db.queryOne<{
      air_temperature_c: number | null;
      soil_moisture_pct: number | null;
      soil_ph: number | null;
      sht40_valid: boolean | number;
      modbus_valid: boolean | number;
    }>('SELECT air_temperature_c, soil_moisture_pct, soil_ph, sht40_valid, modbus_valid FROM telemetry_readings WHERE id = $1', [failId]);

    assert(reading?.air_temperature_c === null, 'air_temperature_c stored as NULL, not 0.0');
    assert(reading?.soil_moisture_pct === null, 'soil_moisture_pct stored as NULL, not 0.0');
    assert(reading?.soil_ph === null, 'soil_ph stored as NULL, not 0.0');
    assert(!reading?.sht40_valid || reading?.sht40_valid === 0, 'sht40_valid stored as false');
    assert(!reading?.modbus_valid || reading?.modbus_valid === 0, 'modbus_valid stored as false');
  } catch (err: unknown) {
    assert(false, 'Null safety error', (err as Error).message);
  }

  // Test Group 5: Time-Series Range Query With Parameterized Limits
  console.log('\nTest Group 5: Time-Series Range Querying');
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const historyRes = await db.query(
      'SELECT id, recorded_at, air_temperature_c FROM telemetry_readings WHERE recorded_at >= $1 ORDER BY recorded_at ASC LIMIT $2',
      [cutoff, 10]
    );

    assert(Array.isArray(historyRes.rows), 'History query returns rows array');
    assert(historyRes.rows.length <= 10, 'History query respects LIMIT parameter');
  } catch (err: unknown) {
    assert(false, 'Time series error', (err as Error).message);
  }

  // Test Group 6: Hostless DATABASE_URL Parsing & ENOTFOUND base Prevention
  console.log('\nTest Group 6: Hostless DATABASE_URL Parsing & Hostname Integrity');
  try {
    const rawQuotedUrl = '"postgresql://smartfarm_user:secret_pw@smartfarm-db.db.hostless.cloud:5432/smartfarm"';
    const rawSingleQuoted = "'postgresql://smartfarm_user:secret_pw@smartfarm-db.db.hostless.cloud:5432/smartfarm'";
    const rawWithSemicolon = 'postgresql://smartfarm_user:secret_pw@smartfarm-db.db.hostless.cloud:5432/smartfarm;';
    const rawWithoutScheme = 'smartfarm_user:secret_pw@smartfarm-db.db.hostless.cloud:5432/smartfarm';
    const rawStandard = 'postgresql://smartfarm_user:secret_pw@smartfarm-db.db.hostless.cloud:5432/smartfarm';

    const cleanQuoted = sanitizeDatabaseUrl(rawQuotedUrl);
    const cleanSingle = sanitizeDatabaseUrl(rawSingleQuoted);
    const cleanSemicolon = sanitizeDatabaseUrl(rawWithSemicolon);
    const cleanNoScheme = sanitizeDatabaseUrl(rawWithoutScheme);
    const cleanStandard = sanitizeDatabaseUrl(rawStandard);

    const parsedQuoted = new URL(cleanQuoted);
    const parsedSingle = new URL(cleanSingle);
    const parsedSemicolon = new URL(cleanSemicolon);
    const parsedNoScheme = new URL(cleanNoScheme);
    const parsedStandard = new URL(cleanStandard);

    assert(parsedQuoted.hostname === 'smartfarm-db.db.hostless.cloud', 'Double-quoted DATABASE_URL strips quotes and avoids hostname "base"');
    assert(parsedSingle.hostname === 'smartfarm-db.db.hostless.cloud', 'Single-quoted DATABASE_URL strips quotes and avoids hostname "base"');
    assert(parsedSemicolon.hostname === 'smartfarm-db.db.hostless.cloud', 'Trailing semicolon DATABASE_URL stripped safely');
    assert(parsedNoScheme.hostname === 'smartfarm-db.db.hostless.cloud', 'DATABASE_URL missing protocol automatically prepends postgresql://');
    assert(parsedStandard.hostname === 'smartfarm-db.db.hostless.cloud', 'Standard unquoted DATABASE_URL preserved intact');
    assert(parsedQuoted.hostname !== 'base' && parsedSingle.hostname !== 'base', 'Hostname "base" fallback is strictly prevented across all input variations');
  } catch (err: unknown) {
    assert(false, 'DATABASE_URL sanitization error', (err as Error).message);
  }

  console.log('\n================================================================');
  console.log(`POSTGRESQL COMPATIBILITY SUMMARY: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPostgresCompatibilityTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
