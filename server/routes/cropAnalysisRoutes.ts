import { Router, type Response } from 'express';
import { getDb } from '../db/database';
import { requireUserAuth, type AuthenticatedRequest } from '../auth/middleware';

const router = Router();

export interface DbCropAnalysis {
  id: number;
  analysis_id: string;
  farm_id: string;
  crop_id: string;
  crop_name: string;
  growth_stage: string;
  health_score: number;
  health_rating: string;
  data_source: string;
  readings_json: string;
  results_json: string;
  created_at: string;
}

// POST /api/v1/crop-analyses - Save a calculated crop analysis
router.post('/', requireUserAuth, async (req: AuthenticatedRequest, res: Response) => {
  const {
    analysisId,
    farmId,
    cropId,
    cropName,
    stageName,
    healthScore,
    healthRating,
    source,
    readings,
    results
  } = req.body;

  if (!farmId || !cropId || !cropName || !stageName || healthScore === undefined) {
    res.status(400).json({ error: 'Missing Required Fields', message: 'farmId, cropId, cropName, stageName and healthScore are required' });
    return;
  }

  // Permission check: Admin or assigned to farm
  if (req.user!.role !== 'Admin' && !req.user!.farmIds.includes(farmId)) {
    // Check if user owns the farm
    const db = getDb();
    const farm = await db.queryOne<{ owner_id: string }>('SELECT owner_id FROM farms WHERE id = $1', [farmId]);
    if (!farm || farm.owner_id !== req.user!.userId) {
      res.status(403).json({ error: 'Forbidden', message: 'You do not have access to save analyses for this farm' });
      return;
    }
  }

  const db = getDb();
  const idToSave = analysisId || `ca-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  try {
    const insertSql = `
      INSERT INTO crop_analyses (
        analysis_id, farm_id, crop_id, crop_name, growth_stage,
        health_score, health_rating, data_source, readings_json, results_json, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, analysis_id, created_at
    `;

    const result = await db.query<{ id: number | string; analysis_id: string; created_at: string }>(insertSql, [
      idToSave,
      farmId,
      cropId,
      cropName,
      stageName,
      Math.round(Number(healthScore)),
      String(healthRating || 'Good'),
      String(source || 'manual'),
      JSON.stringify(readings || {}),
      JSON.stringify(results || {}),
      now
    ]);

    const row = result.rows[0];
    res.status(201).json({
      success: true,
      id: Number(row?.id || 0),
      analysisId: row?.analysis_id || idToSave,
      createdAt: row?.created_at || now
    });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Database Error', message: (err as Error).message });
  }
});

// GET /api/v1/crop-analyses - List analyses with filters
router.get('/', requireUserAuth, async (req: AuthenticatedRequest, res: Response) => {
  const farmId = req.query.farmId ? String(req.query.farmId) : null;
  const cropId = req.query.cropId ? String(req.query.cropId) : null;
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));

  const db = getDb();

  try {
    let whereClauses: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    // Access control: Non-admins can only see their farms
    if (req.user!.role !== 'Admin') {
      const userFarms = req.user!.farmIds;
      if (userFarms.length > 0) {
        const placeholders = userFarms.map((_, i) => `$${paramIndex + i}`).join(', ');
        whereClauses.push(`(farm_id IN (${placeholders}) OR farm_id IN (SELECT id FROM farms WHERE owner_id = $${paramIndex + userFarms.length}))`);
        params.push(...userFarms, req.user!.userId);
        paramIndex += userFarms.length + 1;
      } else {
        whereClauses.push(`farm_id IN (SELECT id FROM farms WHERE owner_id = $${paramIndex})`);
        params.push(req.user!.userId);
        paramIndex += 1;
      }
    }

    if (farmId) {
      whereClauses.push(`farm_id = $${paramIndex}`);
      params.push(farmId);
      paramIndex += 1;
    }

    if (cropId) {
      whereClauses.push(`crop_id = $${paramIndex}`);
      params.push(cropId);
      paramIndex += 1;
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const querySql = `
      SELECT id, analysis_id, farm_id, crop_id, crop_name, growth_stage,
             health_score, health_rating, data_source, readings_json, results_json, created_at
      FROM crop_analyses
      ${whereStr}
      ORDER BY created_at DESC
      LIMIT $${paramIndex}
    `;
    params.push(limit);

    const result = await db.query<DbCropAnalysis>(querySql, params);

    res.json({
      analyses: result.rows.map(r => ({
        ...r,
        readings: (() => { try { return JSON.parse(r.readings_json); } catch { return {}; } })(),
        results: (() => { try { return JSON.parse(r.results_json); } catch { return {}; } })()
      }))
    });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Database Error', message: (err as Error).message });
  }
});

// DELETE /api/v1/crop-analyses/:id
router.delete('/:id', requireUserAuth, async (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const targetId = String(req.params.id);

  try {
    const existing = await db.queryOne<DbCropAnalysis>(
      'SELECT * FROM crop_analyses WHERE id = $1 OR analysis_id = $1',
      [targetId]
    );

    if (!existing) {
      res.status(404).json({ error: 'Not Found', message: 'Analysis not found' });
      return;
    }

    // Access check
    if (req.user!.role !== 'Admin' && !req.user!.farmIds.includes(existing.farm_id)) {
      res.status(403).json({ error: 'Forbidden', message: 'Permission denied to delete this record' });
      return;
    }

    await db.query('DELETE FROM crop_analyses WHERE id = $1', [existing.id]);
    res.json({ success: true, message: 'Crop analysis deleted successfully' });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Database Error', message: (err as Error).message });
  }
});

export default router;
