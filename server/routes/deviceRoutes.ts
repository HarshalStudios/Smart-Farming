import { Router, type Response } from 'express';
import { getDb, type DbDevice } from '../db/database';
import { requireUserAuth, requireRole, type AuthenticatedRequest } from '../auth/middleware';
import { generateDeviceToken } from '../auth/security';

const router = Router();

// Device status threshold evaluation:
// Online: active within last 3 minutes (180s)
// Needs attention / Stale: 3 to 15 minutes (180s - 900s)
// Offline: > 15 minutes (900s) or no contact
export function evaluateDeviceStatus(currentStatus: string, lastSeenAt: string | null): 'Online' | 'Offline' | 'Needs attention' | 'Maintenance' {
  if (currentStatus === 'Maintenance') return 'Maintenance';
  if (!lastSeenAt) return 'Offline';
  const ageSec = (Date.now() - new Date(lastSeenAt).getTime()) / 1000;
  if (ageSec <= 180) return 'Online';
  if (ageSec <= 900) return 'Needs attention';
  return 'Offline';
}

// GET /api/devices - List devices (omits token hashes)
router.get('/', requireUserAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDb();
    let rawDevices: DbDevice[] = [];

    if (req.user!.role === 'Admin' || req.user!.role === 'Technician') {
      const result = await db.query<DbDevice>(
        'SELECT id, name, farm_id, hardware_type, status, battery_pct, last_seen_at, created_at FROM devices ORDER BY name ASC'
      );
      rawDevices = result.rows;
    } else {
      // For farmers and partners, only show devices assigned to their farms
      const userFarms = req.user!.farmIds;
      if (userFarms.length === 0) {
        rawDevices = [];
      } else {
        const placeholders = userFarms.map((_, i) => `$${i + 1}`).join(', ');
        const result = await db.query<DbDevice>(
          `SELECT id, name, farm_id, hardware_type, status, battery_pct, last_seen_at, created_at FROM devices WHERE farm_id IN (${placeholders}) ORDER BY name ASC`,
          userFarms
        );
        rawDevices = result.rows;
      }
    }

    const devices = rawDevices.map(d => ({
      ...d,
      status: evaluateDeviceStatus(d.status, d.last_seen_at)
    }));

    res.json({ devices });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Database Error', message: (err as Error).message });
  }
});

// POST /api/devices - Register new hardware device (Admin only)
router.post('/', requireUserAuth, requireRole(['Admin']), async (req: AuthenticatedRequest, res: Response) => {
  const { id, name, farmId, hardwareType } = req.body || {};

  if (!id || !name || !farmId) {
    res.status(400).json({ error: 'Validation Error', message: 'Fields id, name, and farmId are required' });
    return;
  }

  try {
    const db = getDb();
    const existing = await db.queryOne<{ id: string }>('SELECT id FROM devices WHERE id = $1', [id.trim()]);
    if (existing) {
      res.status(409).json({ error: 'Conflict', message: `Device with ID ${id} already exists` });
      return;
    }

    const { rawToken, tokenHash } = generateDeviceToken();
    const now = new Date().toISOString();

    await db.query(`
      INSERT INTO devices (id, name, farm_id, hardware_type, token_hash, status, battery_pct, last_seen_at, created_at)
      VALUES ($1, $2, $3, $4, $5, 'Offline', 100.0, NULL, $6)
    `, [id.trim(), name.trim(), farmId.trim(), hardwareType || 'ESP32 + MultiSensor', tokenHash, now]);

    // Return the raw token ONCE upon registration
    res.status(201).json({
      message: 'Device successfully registered. Copy this device token now; it will not be displayed again.',
      device: {
        id: id.trim(),
        name: name.trim(),
        farmId: farmId.trim(),
        hardwareType: hardwareType || 'ESP32 + MultiSensor'
      },
      deviceToken: rawToken
    });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Database Error', message: (err as Error).message });
  }
});

// POST /api/devices/:id/rotate-token - Rotate device token (Admin or Technician)
router.post('/:id/rotate-token', requireUserAuth, requireRole(['Admin', 'Technician']), async (req: AuthenticatedRequest, res: Response) => {
  const deviceId = String(req.params.id);

  try {
    const db = getDb();
    const device = await db.queryOne<DbDevice>('SELECT * FROM devices WHERE id = $1', [deviceId]);
    if (!device) {
      res.status(404).json({ error: 'Not Found', message: 'Device not found' });
      return;
    }

    const { rawToken, tokenHash } = generateDeviceToken();
    await db.query('UPDATE devices SET token_hash = $1 WHERE id = $2', [tokenHash, deviceId]);

    res.json({
      message: 'Device token rotated successfully. Update firmware config with the new token.',
      deviceId,
      newDeviceToken: rawToken
    });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Database Error', message: (err as Error).message });
  }
});

export default router;
