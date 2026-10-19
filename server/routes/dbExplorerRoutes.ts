import { Router, type Response } from 'express';
import { getDb } from '../db/database';
import { requireUserAuth, requireRole, type AuthenticatedRequest } from '../auth/middleware';

const router = Router();

// Table descriptions for admin context
const TABLE_DESCRIPTIONS: Record<string, string> = {
  users: 'Registered user accounts, RBAC roles, farm assignments, and active status',
  farms: 'Agricultural plots, geo-locations, soil types, acreage, and farm owners',
  devices: 'IoT sensor hardware nodes, hardware types, farm bindings, and heartbeat statuses',
  telemetry_readings: 'Edge sensor time-series records (SHT40, Modbus 7-in-1 NPK/soil, rain gauge)'
};

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
}

interface TableMetadata {
  name: string;
  description: string;
  rowCount: number;
  columns: ColumnInfo[];
}

/**
 * Fetch list of verified existing tables and their schema structure.
 */
async function getDatabaseTables(): Promise<{ tables: TableMetadata[]; engine: 'postgresql' | 'sqlite' }> {
  const db = getDb();
  const engine = db.getEngine();
  const tableList: string[] = [];

  if (engine === 'postgresql') {
    const res = await db.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name ASC"
    );
    for (const r of res.rows) {
      if (/^[a-zA-Z0-9_]+$/.test(r.table_name)) {
        tableList.push(r.table_name);
      }
    }
  } else {
    const res = await db.query<{ table_name: string }>(
      "SELECT name AS table_name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC"
    );
    for (const r of res.rows) {
      if (/^[a-zA-Z0-9_]+$/.test(r.table_name)) {
        tableList.push(r.table_name);
      }
    }
  }

  const tables: TableMetadata[] = [];

  for (const tName of tableList) {
    // 1. Get Row Count
    let count = 0;
    try {
      const countRes = await db.queryOne<{ count: number | string }>(`SELECT COUNT(*) as count FROM ${tName}`);
      count = Number(countRes?.count || 0);
    } catch {
      count = 0;
    }

    // 2. Get Column Schema
    const columns: ColumnInfo[] = [];
    if (engine === 'postgresql') {
      const colRes = await db.query<{
        column_name: string;
        data_type: string;
        is_nullable: string;
      }>(
        "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position ASC",
        [tName]
      );

      for (const col of colRes.rows) {
        columns.push({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
          isPrimaryKey: col.column_name === 'id'
        });
      }
    } else {
      const pragmaRes = await db.query<{
        name: string;
        type: string;
        notnull: number;
        pk: number;
      }>(`PRAGMA table_info(${tName})`);

      for (const col of pragmaRes.rows) {
        columns.push({
          name: col.name,
          type: col.type || 'TEXT',
          nullable: col.notnull === 0,
          isPrimaryKey: col.pk === 1
        });
      }
    }

    tables.push({
      name: tName,
      description: TABLE_DESCRIPTIONS[tName] || 'Application data table',
      rowCount: count,
      columns
    });
  }

  return { tables, engine };
}

// GET /api/admin/database/overview - Summary of database engine, connection health, and tables
router.get('/overview', requireUserAuth, requireRole(['Admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDb();
    const engine = db.getEngine();
    const isPostgresUrlConfigured = !!process.env.DATABASE_URL?.trim();
    const isRunningPostgres = engine === 'postgresql';

    let warning: string | null = null;
    if (isPostgresUrlConfigured && !isRunningPostgres) {
      warning = 'Production PostgreSQL database was requested via DATABASE_URL but could not be reached. The server has failed over to local storage.';
    }

    const { tables } = await getDatabaseTables();

    res.json({
      status: 'connected',
      engine,
      engineLabel: isRunningPostgres ? 'PostgreSQL 17 (Production)' : 'SQLite (Local Development / Fallback)',
      postgresConfigured: isPostgresUrlConfigured,
      postgresActive: isRunningPostgres,
      warning,
      lastCheck: new Date().toISOString(),
      tables
    });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Database Overview Error', message: (err as Error).message });
  }
});

// GET /api/admin/database/table/:tableName - Query table records with safe pagination, sorting, and search
router.get('/table/:tableName', requireUserAuth, requireRole(['Admin']), async (req: AuthenticatedRequest, res: Response) => {
  const tableName = typeof req.params.tableName === 'string' ? req.params.tableName : String(req.params.tableName || '');
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const pageSize = Math.min(100, Math.max(5, parseInt(String(req.query.pageSize || '20'), 10) || 20));
  const reqSortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy.trim() : '';
  const sortOrder = String(req.query.sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

  try {
    const { tables, engine } = await getDatabaseTables();
    const targetTable = tables.find(t => t.name.toLowerCase() === tableName.toLowerCase());

    if (!targetTable) {
      res.status(404).json({
        error: 'Table Not Found',
        message: `Table "${tableName}" does not exist in the database schema.`,
        availableTables: tables.map(t => t.name)
      });
      return;
    }

    // Validate sortBy column strictly against allowed columns in this table
    const validColNames = targetTable.columns.map(c => c.name);
    let sortBy = validColNames.includes(reqSortBy) ? reqSortBy : '';

    if (!sortBy) {
      // Default to recorded_at or created_at or id
      if (validColNames.includes('recorded_at')) sortBy = 'recorded_at';
      else if (validColNames.includes('created_at')) sortBy = 'created_at';
      else if (validColNames.includes('id')) sortBy = 'id';
      else sortBy = validColNames[0];
    }

    const db = getDb();
    const whereConditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    // Search filter across string columns
    if (search) {
      const textColumns = targetTable.columns.filter(c =>
        c.type.toLowerCase().includes('char') ||
        c.type.toLowerCase().includes('text') ||
        c.name === 'id' ||
        c.name === 'name' ||
        c.name === 'email' ||
        c.name === 'device_id' ||
        c.name === 'farm_id'
      );

      if (textColumns.length > 0) {
        const searchPattern = `%${search}%`;
        const colClauses: string[] = [];

        for (const col of textColumns) {
          if (engine === 'postgresql') {
            colClauses.push(`CAST(${col.name} AS TEXT) ILIKE $${paramIndex}`);
          } else {
            colClauses.push(`CAST(${col.name} AS TEXT) LIKE $${paramIndex}`);
          }
        }
        whereConditions.push(`(${colClauses.join(' OR ')})`);
        params.push(searchPattern);
        paramIndex++;
      }
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // 1. Get filtered total count
    const countSql = `SELECT COUNT(*) as count FROM ${targetTable.name} ${whereClause}`;
    const countRes = await db.queryOne<{ count: number | string }>(countSql, params);
    const totalRows = Number(countRes?.count || 0);
    const totalPages = Math.ceil(totalRows / pageSize) || 1;
    const offset = (page - 1) * pageSize;

    // 2. Build column select list with MANDATORY SECRETS REDACTION
    let selectCols = targetTable.columns.map(c => {
      // Strictly redact credentials and hashes
      if (targetTable.name === 'users' && c.name === 'password_hash') {
        return "'[REDACTED_PASSWORD_HASH]' AS password_hash";
      }
      if (targetTable.name === 'devices' && c.name === 'token_hash') {
        return "'[REDACTED_TOKEN_HASH]' AS token_hash";
      }
      return c.name;
    }).join(', ');

    if (!selectCols || selectCols.trim() === '') {
      selectCols = '*';
    }

    // 3. Query paginated records
    const querySql = `
      SELECT ${selectCols}
      FROM ${targetTable.name}
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const queryParams = [...params, pageSize, offset];
    const result = await db.query(querySql, queryParams);

    res.json({
      tableName: targetTable.name,
      description: targetTable.description,
      engine,
      page,
      pageSize,
      totalRows,
      totalPages,
      sortBy,
      sortOrder,
      search,
      columns: targetTable.columns,
      rows: result.rows
    });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Database Query Error', message: (err as Error).message });
  }
});

export default router;
