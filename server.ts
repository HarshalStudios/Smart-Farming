import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDatabase, getDb, getDevDeviceToken } from './server/db/database';
import authRoutes from './server/routes/authRoutes';
import deviceRoutes from './server/routes/deviceRoutes';
import telemetryRoutes from './server/routes/telemetryRoutes';
import farmRoutes from './server/routes/farmRoutes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--production') || process.argv.includes('--prod');

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health and readiness check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const db = getDb();
    const userCountRow = await db.queryOne<{ count: number | string }>('SELECT COUNT(*) as count FROM users');
    const deviceCountRow = await db.queryOne<{ count: number | string }>('SELECT COUNT(*) as count FROM devices');
    const readingCountRow = await db.queryOne<{ count: number | string }>('SELECT COUNT(*) as count FROM telemetry_readings');

    const engine = db.getEngine();
    const engineLabel = engine === 'postgresql' ? 'PostgreSQL 17 (Hostless)' : 'SQLite (node:sqlite)';

    res.json({
      status: 'ok',
      service: 'smart-precision-farming-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        engine: engineLabel,
        status: 'connected',
        usersCount: Number(userCountRow?.count || 0),
        devicesCount: Number(deviceCountRow?.count || 0),
        telemetryRecords: Number(readingCountRow?.count || 0)
      },
      environment: isProduction ? 'production' : 'development'
    });
  } catch (err: unknown) {
    res.status(500).json({ status: 'error', error: (err as Error).message });
  }
});

// Telemetry contract reference endpoint for embedded engineers
app.get('/api/v1/telemetry/contract', (req, res) => {
  res.json({
    version: '1.0',
    protocol: 'HTTPS POST /api/v1/telemetry/ingest',
    authentication: 'Header: X-Device-Token: gfd_<token> OR Authorization: Bearer gfd_<token>',
    samplePayload: {
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
        pulse_count: 3,
        pulse_resolution_mm: 0.1498,
        accumulation_period_seconds: 60,
        rainfall_period_mm: 0.4494,
        rainfall_cumulative_mm: 12.8
      },
      diagnostics: {
        uptime_seconds: 3600,
        wifi_rssi_dbm: -58,
        battery_pct: 94.0,
        free_heap_bytes: 184520
      }
    }
  });
});

// Mount modular API routers
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/v1/telemetry', telemetryRoutes);
app.use('/api/farms', farmRoutes);

// Frontend integration: Vite dev middleware in dev, static serving in prod
async function setupFrontend() {
  // Initialize database first
  await initDatabase();

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        host: HOST,
        port: PORT
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[SmartFarm API] Unified server running at http://${HOST}:${PORT}`);
    console.log(`[SmartFarm API] Environment: ${isProduction ? 'production' : 'development'}`);
    if (!isProduction) {
      const token = getDevDeviceToken();
      if (token) {
        console.log(`[SmartFarm API] Seed device token (ESP32-PN-001): ${token}`);
      }
    }
  });
}

setupFrontend().catch(err => {
  console.error('[SmartFarm API] Failed to start server:', err);
  process.exit(1);
});
