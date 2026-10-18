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
router.get('/', requireUserAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  let rawDevices: DbDevice[] = [];

  if (req.user!.role === 'Admin' || req.user!.role === 'Technician') {
    rawDevices = db.prepare('SELECT id, name, farm_id, hardware_type, status, battery_pct, last_seen_at, created_at FROM devices').all() as unknown as DbDevice[];
  } else {
    // For farmers and partners, only show devices assigned to their farms
    const userFarms = req.user!.farmIds;
    if (userFarms.length === 0) {
      rawDevices = [];
    } else {
      const placeholders = userFarms.map(() => '?').join(',');
      rawDevices = db.prepare(`SELECT id, name, farm_id, hardware_type, status, battery_pct, last_seen_at, created_at FROM devices WHERE farm_id IN (${placeholders})`).all(...userFarms) as unknown as DbDevice[];
    }
  }

  const devices = rawDevices.map(d => ({
    ...d,
    status: evaluateDeviceStatus(d.status, d.last_seen_at)
  }));

  res.json({ devices });
});

// POST /api/devices - Register new hardware device (Admin only)
router.post('/', requireUserAuth, requireRole(['Admin']), (req: AuthenticatedRequest, res: Response) => {
  const { id, name, farmId, hardwareType } = req.body || {};

  if (!id || !name || !farmId) {
    res.status(400).json({ error: 'Validation Error', message: 'Fields id, name, and farmId are required' });
    return;
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM devices WHERE id = ?').get(id.trim());
  if (existing) {
    res.status(409).json({ error: 'Conflict', message: `Device with ID ${id} already exists` });
    return;
  }

  const { rawToken, tokenHash } = generateDeviceToken();
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO devices (id, name, farm_id, hardware_type, token_hash, status, battery_pct, last_seen_at, created_at)
      VALUES (?, ?, ?, ?, ?, 'Offline', 100.0, NULL, ?)
    `).run(id.trim(), name.trim(), farmId.trim(), hardwareType || 'ESP32 + MultiSensor', tokenHash, now);

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
router.post('/:id/rotate-token', requireUserAuth, requireRole(['Admin', 'Technician']), (req: AuthenticatedRequest, res: Response) => {
  const deviceId = String(req.params.id);
  const db = getDb();

  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(deviceId) as DbDevice | undefined;
  if (!device) {
    res.status(404).json({ error: 'Not Found', message: 'Device not found' });
    return;
  }

  const { rawToken, tokenHash } = generateDeviceToken();
  db.prepare('UPDATE devices SET token_hash = ? WHERE id = ?').run(tokenHash, deviceId);

  res.json({
    message: 'Device token rotated successfully. Update firmware config with the new token.',
    deviceId,
    newDeviceToken: rawToken
  });
});

export default router;
