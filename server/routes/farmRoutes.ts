import { Router, type Response } from 'express';
import { getDb, type DbFarm } from '../db/database';
import { requireUserAuth, type AuthenticatedRequest } from '../auth/middleware';

const router = Router();

// GET /api/farms
router.get('/', requireUserAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDb();
    let farms: DbFarm[] = [];

    if (req.user!.role === 'Admin') {
      const result = await db.query<DbFarm>('SELECT * FROM farms ORDER BY name ASC');
      farms = result.rows;
    } else {
      const userFarms = req.user!.farmIds;
      if (userFarms.length > 0) {
        const placeholders = userFarms.map((_, i) => `$${i + 1}`).join(', ');
        const ownerParam = `$${userFarms.length + 1}`;
        const result = await db.query<DbFarm>(
          `SELECT * FROM farms WHERE id IN (${placeholders}) OR owner_id = ${ownerParam} ORDER BY name ASC`,
          [...userFarms, req.user!.userId]
        );
        farms = result.rows;
      } else {
        const result = await db.query<DbFarm>(
          'SELECT * FROM farms WHERE owner_id = $1 ORDER BY name ASC',
          [req.user!.userId]
        );
        farms = result.rows;
      }
    }

    res.json({ farms });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Database Error', message: (err as Error).message });
  }
});

// GET /api/farms/:id
router.get('/:id', requireUserAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDb();
    const farm = await db.queryOne<DbFarm>('SELECT * FROM farms WHERE id = $1', [String(req.params.id)]);

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
  } catch (err: unknown) {
    res.status(500).json({ error: 'Database Error', message: (err as Error).message });
  }
});

export default router;
