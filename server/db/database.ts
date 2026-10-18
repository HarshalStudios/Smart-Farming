import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { hashPassword, generateDeviceToken } from '../auth/security';

export interface DbUser {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: 'Admin' | 'Farmer' | 'Partner' | 'Technician';
  description: string;
  farm_ids: string; // JSON array of farm IDs
  active: number;
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
  status: 'Online' | 'Offline' | 'Maintenance';
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
  modbus_valid: number;
  sht40_valid: number;
  rain_valid: number;
  raw_payload: string | null;
}

let dbInstance: DatabaseSync | null = null;
let devDeviceToken: string | null = null;

export function getDevDeviceToken(): string | null {
  return devDeviceToken;
}

export function getDb(dbFilePath?: string): DatabaseSync {
  if (dbInstance) return dbInstance;

  const targetPath = dbFilePath || process.env.DATABASE_PATH || './data/greenfield.db';

  if (targetPath !== ':memory:') {
    const dir = path.dirname(path.resolve(targetPath));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(targetPath);
  db.exec('PRAGMA foreign_keys = ON;');

  // Run schema migrations
  db.exec(`
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

  // Seed baseline records if empty
  seedBaselineData(db);

  dbInstance = db;
  return db;
}

function seedBaselineData(db: DatabaseSync): void {
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
  const now = new Date().toISOString();

  if (userCount === 0) {
    const defaultPassword = 'SmartFarmPassword2026!';
    const defaultHash = hashPassword(defaultPassword);

    const insertUser = db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, description, farm_ids, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertUser.run('u-admin', 'admin@smartfarm.demo', defaultHash, 'Sumit Singh', 'Admin', 'Platform administrator', JSON.stringify(['f1', 'f2', 'f3']), 1, now);
    insertUser.run('u-pushkar', 'pushkar@smartfarm.demo', defaultHash, 'Pushkar Kandalgaonkar', 'Farmer', 'Shivneri Farm manager', JSON.stringify(['f1']), 1, now);
    insertUser.run('u-ramesh', 'ramesh@smartfarm.demo', defaultHash, 'Ramesh Patil', 'Farmer', 'Sahyadri Sheti operator', JSON.stringify(['f2']), 1, now);
    insertUser.run('u-priya', 'priya@smartfarm.demo', defaultHash, 'Priya Deshmukh', 'Partner', 'Agricultural advisor', JSON.stringify(['f1', 'f2']), 1, now);
    insertUser.run('u-amit', 'amit@smartfarm.demo', defaultHash, 'Amit Jadhav', 'Technician', 'IoT field technician', JSON.stringify(['f1', 'f2', 'f3']), 1, now);
  }

  const farmCount = (db.prepare('SELECT COUNT(*) as count FROM farms').get() as { count: number }).count;
  if (farmCount === 0) {
    const insertFarm = db.prepare(`
      INSERT INTO farms (id, name, location, owner_id, area_ha, soil_type, field_count, primary_crop, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertFarm.run('f1', 'Shivneri Farm', 'Narhe, Pune, Maharashtra', 'u-pushkar', 4.5, 'Black cotton soil', 3, 'Tomato', 'Healthy', now);
    insertFarm.run('f2', 'Sahyadri Sheti', 'Karad, Satara, Maharashtra', 'u-ramesh', 7.2, 'Red loamy soil', 4, 'Sugarcane', 'Needs attention', now);
    insertFarm.run('f3', 'Green Valley Plot', 'Baramati, Pune, Maharashtra', 'u-admin', 2.8, 'Alluvial soil', 2, 'Onion', 'Healthy', now);
  }

  const deviceCount = (db.prepare('SELECT COUNT(*) as count FROM devices').get() as { count: number }).count;
  if (deviceCount === 0) {
    const { rawToken, tokenHash } = generateDeviceToken();
    devDeviceToken = rawToken;

    const insertDevice = db.prepare(`
      INSERT INTO devices (id, name, farm_id, hardware_type, token_hash, status, battery_pct, last_seen_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertDevice.run('ESP32-PN-001', 'Soil & Weather Node 01', 'f1', 'ESP32 + SHT40 + Modbus RS485 + RainGauge', tokenHash, 'Online', 94.0, now, now);
    insertDevice.run('ESP32-ST-002', 'Field Sensor Node 02', 'f2', 'ESP32 + Modbus RS485', hashPassword('dummy'), 'Offline', 22.0, null, now);
  }
}
