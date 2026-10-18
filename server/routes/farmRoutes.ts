import { Router, type Response } from 'express';
import { getDb, type DbFarm } from '../db/database';
import { requireUserAuth, type AuthenticatedRequest } from '../auth/middleware';

const router = Router();

// GET /api/farms
router.get('/', requireUserAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  let farms: DbFarm[] = [];

  if (req.user!.role === 'Admin') {
    farms = db.prepare('SELECT * FROM farms ORDER BY name ASC').all() as unknown as DbFarm[];
  } else {
    const userFarms = req.user!.farmIds;
    if (userFarms.length > 0) {
      const placeholders = userFarms.map(() => '?').join(',');
      farms = db.prepare(`SELECT * FROM farms WHERE id IN (${placeholders}) OR owner_id = ? ORDER BY name ASC`).all(...userFarms, req.user!.userId) as unknown as DbFarm[];
    } else {
      farms = db.prepare('SELECT * FROM farms WHERE owner_id = ? ORDER BY name ASC').all(req.user!.userId) as unknown as DbFarm[];
    }
  }

  res.json({ farms });
});

// GET /api/farms/:id
router.get('/:id', requireUserAuth, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const farm = db.prepare('SELECT * FROM farms WHERE id = ?').get(String(req.params.id)) as DbFarm | undefined;

  if (!farm) {
    res.status(404).json({ error: 'Not Found', message: 'Farm not found' });
    return;
  }

  // Access check
  if (req.user!.role !== 'Admin' && !req.user!.farmIds.includes(farm.id) && farm.owner_id !== req.user!.userId) {
    res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this farm' });
    return;
  }

  res.json({ farm });
});

export default router;
