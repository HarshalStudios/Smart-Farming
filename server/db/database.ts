import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';
import { hashPassword, generateDeviceToken } from '../auth/security';

const { Pool } = pg;

export interface DbUser {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: 'Admin' | 'Farmer' | 'Partner' | 'Technician';
  description: string;
  farm_ids: string; // JSON array of farm IDs
  active: boolean | number;
  created_at: string;
}

export interface DbFarm {
  id: string;
  name: string;
  location: string;
  owner_id: string;
  area_ha: number;
  soil_type: string;
  field_count: number;
  primary_crop: string;
  status: string;
  created_at: string;
}

export interface DbDevice {
  id: string;
  name: string;
  farm_id: string;
  hardware_type: string;
  token_hash: string;
  status: 'Online' | 'Offline' | 'Needs attention' | 'Maintenance';
  battery_pct: number;
  last_seen_at: string | null;
  created_at: string;
}

export interface DbTelemetryReading {
  id: number;
  device_id: string;
  farm_id: string;
  recorded_at: string;
  ingested_at: string;
  air_temperature_c: number | null;
  relative_humidity_pct: number | null;
  soil_moisture_pct: number | null;
  soil_temperature_c: number | null;
  soil_ph: number | null;
  electrical_conductivity_ds_m: number | null;
  nitrogen_kg_ha: number | null;
  phosphorus_kg_ha: number | null;
  potassium_kg_ha: number | null;
  rain_pulses: number;
  rain_accumulation_mm: number;
  rain_duration_seconds: number;
  modbus_valid: boolean | number;
  sht40_valid: boolean | number;
  rain_valid: boolean | number;
  raw_payload: string | null;
}

export interface DatabaseClient {
  query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }>;
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
  getEngine(): 'postgresql' | 'sqlite';
}

let dbInstance: DatabaseClient | null = null;
let devDeviceToken: string | null = null;

export function getDevDeviceToken(): string | null {
  return devDeviceToken;
}

/**
 * Safely mask database credentials for logging and diagnostics.
 * Replaces any password in the format user:password@ with user:***@.
 */
export function maskConnectionString(rawUrl?: string | null): string {
  if (!rawUrl) return '';
  return rawUrl.replace(/:([^:@/]+)@/g, ':***@');
}

/**
 * Clean and normalize a database URL.
 * Strips surrounding quotes, trailing semicolons, handles duplicate or malformed scheme prefixes,
 * and ensures standard postgresql:// prefix without altering user credentials.
 */
export function sanitizeDatabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let clean = rawUrl.trim();

  // Strip surrounding quotes or backticks (e.g., "postgresql://...", 'postgresql://...', `postgresql://...`)
  while (
    (clean.startsWith('"') && clean.endsWith('"')) ||
    (clean.startsWith("'") && clean.endsWith("'")) ||
    (clean.startsWith('`') && clean.endsWith('`'))
  ) {
    clean = clean.slice(1, -1).trim();
  }

  // Strip trailing semicolon if present
  if (clean.endsWith(';')) {
    clean = clean.slice(0, -1).trim();
  }

  // Strip duplicate scheme prefix like postgresql://postgresql// or postgresql://postgresql/
  // Only strips if followed by / (never matches if followed by user:pass)
  clean = clean.replace(/^postgres(ql)?:\/\/postgres(ql)?\/+/i, 'postgresql://');

  // Fix missing colon in scheme: postgresql// or postgres//
  clean = clean.replace(/^postgres(ql)?\/\//i, 'postgresql://');

  // Fix single slash after colon in scheme: postgresql:/ or postgres:/
  clean = clean.replace(/^postgres(ql)?:\/(?!\/)/i, 'postgresql://');

  // Fix missing slashes after postgresql scheme: postgresql:user:pass...
  clean = clean.replace(/^postgresql:(?!\/)/i, 'postgresql://');

  // If protocol scheme is missing completely, prepend postgresql://
  if (!/^postgres(ql)?:\/\//i.test(clean)) {
    clean = `postgresql://${clean}`;
  }

  return clean;
}

/**
 * PostgreSQL Database Adapter backed by pg.Pool
 */
class PostgresDatabaseAdapter implements DatabaseClient {
  private pool: pg.Pool;

  constructor(rawConnectionString: string) {
    const connectionString = sanitizeDatabaseUrl(rawConnectionString);
    const useSsl = process.env.DATABASE_SSL !== 'false';

    // Verify and extract connection components using WHATWG URL parser
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(connectionString);

      // Defensively recover if malformed URL parsing made the scheme name become the hostname
      if (parsedUrl.hostname === 'postgresql' || parsedUrl.hostname === 'postgres') {
        const nested = parsedUrl.pathname.replace(/^\/+/, '');
        console.log(`[Database] Recovering from malformed scheme hostname: re-parsing nested target`);
        parsedUrl = new URL(sanitizeDatabaseUrl(nested));
      }

      if (parsedUrl.hostname === 'base' || !parsedUrl.hostname) {
        throw new Error(
          `Invalid PostgreSQL hostname resolved: "${parsedUrl.hostname}". Please ensure DATABASE_URL is formatted as postgresql://user:pass@host:port/dbname`
        );
      }

      console.log(`[Database] Initializing connection to PostgreSQL host: ${parsedUrl.hostname}, database: ${parsedUrl.pathname.replace(/^\//, '')}`);
    } catch (e: any) {
      if (e.message && e.message.includes('Invalid PostgreSQL hostname')) {
        throw e;
      }
      throw new Error(`Failed to parse PostgreSQL DATABASE_URL: ${e.message}`);
    }

    const port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : 5432;
    const database = parsedUrl.pathname && parsedUrl.pathname !== '/' ? parsedUrl.pathname.replace(/^\//, '') : undefined;
    const user = parsedUrl.username ? decodeURIComponent(parsedUrl.username) : undefined;
    const password = parsedUrl.password ? decodeURIComponent(parsedUrl.password) : undefined;
    const sslMode = parsedUrl.searchParams.get('sslmode');
    const ssl = sslMode === 'disable' ? false : (useSsl ? { rejectUnauthorized: false } : false);

    // Explicitly configure Pool with parsed components instead of passing connectionString.
    // Passing connectionString forces pg to delegate to pg-connection-string, which defaults host to 'base'.
    this.pool = new Pool({
      host: parsedUrl.hostname,
      port,
      database,
      user,
      password,
      ssl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    this.pool.on('error', (err) => {
      console.error('[PostgreSQL] Unexpected error on idle client:', err.message);
    });
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
    const res = await this.pool.query(sql, params);
    return {
      rows: res.rows as T[],
      rowCount: res.rowCount ?? 0,
    };
  }

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const res = await this.query<T>(sql, params);
    return res.rows.length > 0 ? res.rows[0] : null;
  }

  async exec(sql: string): Promise<void> {
    await this.pool.query(sql);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  getEngine(): 'postgresql' {
    return 'postgresql';
  }
}

/**
 * SQLite Fallback Adapter for local offline testing and CI
 * Supports PostgreSQL-style $1, $2 placeholders and RETURNING id
 */
class SqliteDatabaseAdapter implements DatabaseClient {
  private db: DatabaseSync;

  constructor(dbFilePath?: string) {
    const targetPath = dbFilePath || process.env.DATABASE_PATH || './data/greenfield.db';

    if (targetPath === ':memory:') {
      this.db = new DatabaseSync(':memory:');
    } else {
      const dir = path.dirname(path.resolve(targetPath));
      let useMemory = false;
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      } catch (err: any) {
        console.warn(`[Database] Unable to create local directory "${dir}" (${err.message}), using in-memory SQLite storage`);
        useMemory = true;
      }

      if (useMemory) {
        this.db = new DatabaseSync(':memory:');
      } else {
        try {
          this.db = new DatabaseSync(targetPath);
        } catch (err: any) {
          console.warn(`[Database] Unable to open SQLite file "${targetPath}" (${err.message}), using in-memory SQLite storage`);
          this.db = new DatabaseSync(':memory:');
        }
      }
    }

    this.db.exec('PRAGMA foreign_keys = ON;');
  }

  private transformPostgresSql(sql: string): { sql: string; hasReturningId: boolean } {
    let cleanSql = sql;
    let hasReturningId = false;

    // Check for RETURNING id (case-insensitive)
    if (/\breturning\s+id\b/i.test(cleanSql)) {
      hasReturningId = true;
      cleanSql = cleanSql.replace(/\breturning\s+id\b/gi, '').trim();
    }

    // Replace $1, $2, ... placeholders with ?
    cleanSql = cleanSql.replace(/\$\d+/g, '?');

    return { sql: cleanSql, hasReturningId };
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
    const { sql: transformedSql, hasReturningId } = this.transformPostgresSql(sql);

    // Normalize params (booleans to 1/0 for SQLite)
    const normalizedParams = params.map(p => {
      if (typeof p === 'boolean') return p ? 1 : 0;
      return p;
    });

    const isSelect = /^\s*SELECT\b/i.test(transformedSql);

    if (isSelect) {
      const stmt = this.db.prepare(transformedSql);
      const rows = stmt.all(...normalizedParams) as T[];
      return { rows, rowCount: rows.length };
    } else {
      const stmt = this.db.prepare(transformedSql);
      const result = stmt.run(...normalizedParams);
      const rowCount = Number(result.changes);

      if (hasReturningId) {
        return {
          rows: [{ id: Number(result.lastInsertRowid) } as unknown as T],
          rowCount
        };
      }
      return { rows: [], rowCount };
    }
  }

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const res = await this.query<T>(sql, params);
    return res.rows.length > 0 ? res.rows[0] : null;
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async close(): Promise<void> {
    this.db.close();
  }

  getEngine(): 'sqlite' {
    return 'sqlite';
  }
}

/**
 * Initialize PostgreSQL Schema DDL (Idempotent)
 */
async function initializePostgresSchema(db: DatabaseClient): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(32) NOT NULL CHECK (role IN ('Admin', 'Farmer', 'Partner', 'Technician')),
      description TEXT,
      farm_ids TEXT DEFAULT '[]',
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS farms (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      location VARCHAR(255) NOT NULL,
      owner_id VARCHAR(64) NOT NULL,
      area_ha DOUBLE PRECISION NOT NULL,
      soil_type VARCHAR(128) NOT NULL,
      field_count INTEGER NOT NULL DEFAULT 1,
      primary_crop VARCHAR(128) NOT NULL,
      status VARCHAR(64) NOT NULL DEFAULT 'Healthy',
      created_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS devices (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      farm_id VARCHAR(64) NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
      hardware_type VARCHAR(255) NOT NULL,
      token_hash VARCHAR(128) NOT NULL,
      status VARCHAR(64) NOT NULL DEFAULT 'Offline',
      battery_pct DOUBLE PRECISION DEFAULT 100.0,
      last_seen_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS telemetry_readings (
      id BIGSERIAL PRIMARY KEY,
      device_id VARCHAR(64) NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      farm_id VARCHAR(64) NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
      recorded_at TIMESTAMPTZ NOT NULL,
      ingested_at TIMESTAMPTZ NOT NULL,
      air_temperature_c DOUBLE PRECISION,
      relative_humidity_pct DOUBLE PRECISION,
      soil_moisture_pct DOUBLE PRECISION,
      soil_temperature_c DOUBLE PRECISION,
      soil_ph DOUBLE PRECISION,
      electrical_conductivity_ds_m DOUBLE PRECISION,
      nitrogen_kg_ha DOUBLE PRECISION,
      phosphorus_kg_ha DOUBLE PRECISION,
      potassium_kg_ha DOUBLE PRECISION,
      rain_pulses INTEGER DEFAULT 0,
      rain_accumulation_mm DOUBLE PRECISION DEFAULT 0.0,
      rain_duration_seconds INTEGER DEFAULT 60,
      modbus_valid BOOLEAN NOT NULL DEFAULT TRUE,
      sht40_valid BOOLEAN NOT NULL DEFAULT TRUE,
      rain_valid BOOLEAN NOT NULL DEFAULT TRUE,
      raw_payload TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_telemetry_device_time ON telemetry_readings(device_id, recorded_at DESC);
    CREATE INDEX IF NOT EXISTS idx_telemetry_farm_time ON telemetry_readings(farm_id, recorded_at DESC);
  `);
}

/**
 * Initialize SQLite Schema DDL (Idempotent)
 */
async function initializeSqliteSchema(db: DatabaseClient): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('Admin', 'Farmer', 'Partner', 'Technician')),
      description TEXT,
      farm_ids TEXT DEFAULT '[]',
      active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS farms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      area_ha REAL NOT NULL,
      soil_type TEXT NOT NULL,
      field_count INTEGER NOT NULL DEFAULT 1,
      primary_crop TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Healthy',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      farm_id TEXT NOT NULL,
      hardware_type TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Offline',
      battery_pct REAL DEFAULT 100.0,
      last_seen_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS telemetry_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      farm_id TEXT NOT NULL,
      recorded_at TEXT NOT NULL,
      ingested_at TEXT NOT NULL,
      air_temperature_c REAL,
      relative_humidity_pct REAL,
      soil_moisture_pct REAL,
      soil_temperature_c REAL,
      soil_ph REAL,
      electrical_conductivity_ds_m REAL,
      nitrogen_kg_ha REAL,
      phosphorus_kg_ha REAL,
      potassium_kg_ha REAL,
      rain_pulses INTEGER DEFAULT 0,
      rain_accumulation_mm REAL DEFAULT 0.0,
      rain_duration_seconds INTEGER DEFAULT 60,
      modbus_valid INTEGER NOT NULL DEFAULT 1,
      sht40_valid INTEGER NOT NULL DEFAULT 1,
      rain_valid INTEGER NOT NULL DEFAULT 1,
      raw_payload TEXT,
      FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
      FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_telemetry_device_time ON telemetry_readings(device_id, recorded_at DESC);
    CREATE INDEX IF NOT EXISTS idx_telemetry_farm_time ON telemetry_readings(farm_id, recorded_at DESC);
  `);
}

/**
 * Seed baseline demonstration data if database is empty.
 * Never overwrites existing production data.
 */
async function seedBaselineData(db: DatabaseClient): Promise<void> {
  const userCountRow = await db.queryOne<{ count: number | string }>('SELECT COUNT(*) as count FROM users');
  const userCount = Number(userCountRow?.count || 0);
  const now = new Date().toISOString();

  if (userCount === 0) {
    const defaultPassword = 'SmartFarmPassword2026!';
    const defaultHash = hashPassword(defaultPassword);

    const userInserts = [
      ['u-admin', 'admin@smartfarm.demo', defaultHash, 'Sumit Singh', 'Admin', 'Platform administrator', JSON.stringify(['f1', 'f2', 'f3'])],
      ['u-pushkar', 'pushkar@smartfarm.demo', defaultHash, 'Pushkar Kandalgaonkar', 'Farmer', 'Shivneri Farm manager', JSON.stringify(['f1'])],
      ['u-ramesh', 'ramesh@smartfarm.demo', defaultHash, 'Ramesh Patil', 'Farmer', 'Sahyadri Sheti operator', JSON.stringify(['f2'])],
      ['u-priya', 'priya@smartfarm.demo', defaultHash, 'Priya Deshmukh', 'Partner', 'Agricultural advisor', JSON.stringify(['f1', 'f2'])],
      ['u-amit', 'amit@smartfarm.demo', defaultHash, 'Amit Jadhav', 'Technician', 'IoT field technician', JSON.stringify(['f1', 'f2', 'f3'])],
    ];

    for (const [id, email, hash, name, role, desc, farms] of userInserts) {
      await db.query(`
        INSERT INTO users (id, email, password_hash, name, role, description, farm_ids, active, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [id, email, hash, name, role, desc, farms, true, now]);
    }
  }

  const farmCountRow = await db.queryOne<{ count: number | string }>('SELECT COUNT(*) as count FROM farms');
  const farmCount = Number(farmCountRow?.count || 0);

  if (farmCount === 0) {
    const farmInserts = [
      ['f1', 'Shivneri Farm', 'Narhe, Pune, Maharashtra', 'u-pushkar', 4.5, 'Black cotton soil', 3, 'Tomato', 'Healthy'],
      ['f2', 'Sahyadri Sheti', 'Karad, Satara, Maharashtra', 'u-ramesh', 7.2, 'Red loamy soil', 4, 'Sugarcane', 'Needs attention'],
      ['f3', 'Green Valley Plot', 'Baramati, Pune, Maharashtra', 'u-admin', 2.8, 'Alluvial soil', 2, 'Onion', 'Healthy'],
    ];

    for (const [id, name, location, ownerId, area, soil, fields, crop, status] of farmInserts) {
      await db.query(`
        INSERT INTO farms (id, name, location, owner_id, area_ha, soil_type, field_count, primary_crop, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [id, name, location, ownerId, area, soil, fields, crop, status, now]);
    }
  }

  const deviceCountRow = await db.queryOne<{ count: number | string }>('SELECT COUNT(*) as count FROM devices');
  const deviceCount = Number(deviceCountRow?.count || 0);

  if (deviceCount === 0) {
    const { rawToken, tokenHash } = generateDeviceToken();
    devDeviceToken = rawToken;

    await db.query(`
      INSERT INTO devices (id, name, farm_id, hardware_type, token_hash, status, battery_pct, last_seen_at, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, ['ESP32-PN-001', 'Soil & Weather Node 01', 'f1', 'ESP32 + SHT40 + Modbus RS485 + RainGauge', tokenHash, 'Online', 94.0, now, now]);

    await db.query(`
      INSERT INTO devices (id, name, farm_id, hardware_type, token_hash, status, battery_pct, last_seen_at, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, ['ESP32-ST-002', 'Field Sensor Node 02', 'f2', 'ESP32 + Modbus RS485', hashPassword('dummy'), 'Offline', 22.0, null, now]);
  }
}

/**
 * Initialize Database Singleton.
 * Uses PostgreSQL if DATABASE_URL is set; falls back to SQLite for local development and tests.
 */
export async function initDatabase(customDbPath?: string): Promise<DatabaseClient> {
  if (dbInstance) return dbInstance;

  const rawUrl = process.env.DATABASE_URL?.trim();
  const databaseUrl = rawUrl ? sanitizeDatabaseUrl(rawUrl) : undefined;

  if (databaseUrl) {
    console.log('[Database] DATABASE_URL detected for production environment');
    console.log(`[Database] Target: ${maskConnectionString(databaseUrl)}`);
    console.log('[Database] Connecting to PostgreSQL 17 database...');
    const adapter = new PostgresDatabaseAdapter(databaseUrl);
    await initializePostgresSchema(adapter);
    await seedBaselineData(adapter);
    dbInstance = adapter;
    return adapter;
  }

  // Local development / testing mode with SQLite
  console.log('[Database] No DATABASE_URL configured; initializing SQLite for local development');
  const adapter = new SqliteDatabaseAdapter(customDbPath);
  await initializeSqliteSchema(adapter);
  await seedBaselineData(adapter);
  dbInstance = adapter;
  return adapter;
}

export function getDb(): DatabaseClient {
  if (!dbInstance) {
    const rawUrl = process.env.DATABASE_URL?.trim();
    if (rawUrl) {
      const databaseUrl = sanitizeDatabaseUrl(rawUrl);
      console.log('[Database] getDb() called before initDatabase(); initializing PostgreSQL singleton');
      const adapter = new PostgresDatabaseAdapter(databaseUrl);
      // Non-blocking schema initialization if accessed before explicit initDatabase()
      initializePostgresSchema(adapter).then(() => seedBaselineData(adapter)).catch(err => {
        console.error('[Database] Failed to initialize default PostgreSQL schema:', err.message);
      });
      dbInstance = adapter;
      return adapter;
    }

    // Local development SQLite fallback only when DATABASE_URL is NOT configured
    const adapter = new SqliteDatabaseAdapter();
    initializeSqliteSchema(adapter).then(() => seedBaselineData(adapter)).catch(err => {
      console.error('[Database] Failed to initialize default SQLite schema:', err.message);
    });
    dbInstance = adapter;
    return adapter;
  }
  return dbInstance;
}
