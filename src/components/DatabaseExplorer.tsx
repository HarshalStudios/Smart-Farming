import { useEffect, useState, useCallback } from 'react';
import {
  Database, RefreshCw, AlertTriangle, CheckCircle2, Search, ArrowUpDown,
  ChevronLeft, ChevronRight, Eye, ShieldAlert, X, Copy, Check, Table, Server
} from 'lucide-react';

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

interface DbOverview {
  status: string;
  engine: 'postgresql' | 'sqlite';
  engineLabel: string;
  postgresConfigured: boolean;
  postgresActive: boolean;
  warning: string | null;
  lastCheck: string;
  tables: TableMetadata[];
}

interface DbTableData {
  tableName: string;
  description: string;
  engine: string;
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
  search: string;
  columns: ColumnInfo[];
  rows: Record<string, any>[];
}

interface Props {
  sessionToken: string | null;
  onAuthenticate: () => Promise<string | null>;
}

export default function DatabaseExplorer({ sessionToken, onAuthenticate }: Props) {
  const [overview, setOverview] = useState<DbOverview | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>('telemetry_readings');
  const [tableData, setTableData] = useState<DbTableData | null>(null);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [searchInput, setSearchInput] = useState<string>('');
  const [activeSearch, setActiveSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [inspectedRecord, setInspectedRecord] = useState<Record<string, any> | null>(null);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [showSchemaDrawer, setShowSchemaDrawer] = useState<boolean>(false);

  const getValidToken = useCallback(async (): Promise<string | null> => {
    if (sessionToken) return sessionToken;
    return await onAuthenticate();
  }, [sessionToken, onAuthenticate]);

  // Fetch database overview
  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getValidToken();
      if (!token) {
        setError('Authentication required as Administrator to inspect the database.');
        setIsLoading(false);
        return;
      }

      const res = await fetch('/api/admin/database/overview', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `HTTP ${res.status}: Failed to inspect database.`);
      }

      const data: DbOverview = await res.json();
      setOverview(data);

      // Default selected table if not set or invalid
      if (data.tables.length > 0 && !data.tables.some(t => t.name === selectedTable)) {
        setSelectedTable(data.tables[0].name);
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to connect to database inspection service.');
    } finally {
      setIsLoading(false);
    }
  }, [getValidToken, selectedTable]);

  // Fetch paginated table records
  const loadTableRecords = useCallback(async (
    targetTable: string,
    p: number,
    size: number,
    sort: string,
    order: 'ASC' | 'DESC',
    searchQuery: string
  ) => {
    if (!targetTable) return;
    setIsLoading(true);
    setError(null);

    try {
      const token = await getValidToken();
      if (!token) {
        setError('Authentication required as Administrator.');
        setIsLoading(false);
        return;
      }

      const params = new URLSearchParams({
        page: String(p),
        pageSize: String(size),
        sortBy: sort,
        sortOrder: order,
        search: searchQuery
      });

      const res = await fetch(`/api/admin/database/table/${encodeURIComponent(targetTable)}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `HTTP ${res.status}: Failed to query table ${targetTable}.`);
      }

      const data: DbTableData = await res.json();
      setTableData(data);
      setSortBy(data.sortBy);
      setSortOrder(data.sortOrder);
    } catch (err: unknown) {
      setError((err as Error).message || `Failed to query table ${targetTable}.`);
    } finally {
      setIsLoading(false);
    }
  }, [getValidToken]);

  // Initial load
  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  // Trigger table fetch on table change or pagination/sort/search change
  useEffect(() => {
    if (selectedTable) {
      loadTableRecords(selectedTable, page, pageSize, sortBy, sortOrder, activeSearch);
    }
  }, [selectedTable, page, pageSize, sortBy, sortOrder, activeSearch, loadTableRecords]);

  const handleTableSwitch = (tableName: string) => {
    setSelectedTable(tableName);
    setPage(1);
    setSortBy('');
    setSearchInput('');
    setActiveSearch('');
  };

  const handleSort = (colName: string) => {
    if (sortBy === colName) {
      setSortOrder(prev => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(colName);
      setSortOrder('DESC');
    }
    setPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchInput.trim());
    setPage(1);
  };

  const handleSearchClear = () => {
    setSearchInput('');
    setActiveSearch('');
    setPage(1);
  };

  const currentTableMeta = overview?.tables.find(t => t.name === selectedTable);

  const formatCellValue = (val: any, colName: string) => {
    if (val === null || val === undefined) {
      return <span className="null-val">NULL</span>;
    }
    if (typeof val === 'string' && val.startsWith('[REDACTED')) {
      return <span className="redacted-val">🔒 REDACTED</span>;
    }
    if (typeof val === 'boolean') {
      return <span className={`bool-val ${val ? 'true' : 'false'}`}>{val ? 'true' : 'false'}</span>;
    }
    if (colName.endsWith('_at') || colName.endsWith('_time') || colName === 'timestamp') {
      const d = new Date(val);
      if (!Number.isNaN(d.getTime())) {
        return <span className="code-val">{d.toLocaleString()}</span>;
      }
    }
    if (typeof val === 'object') {
      return <span className="code-val">{JSON.stringify(val).slice(0, 40)}...</span>;
    }
    const str = String(val);
    if (str.length > 50) {
      return <span>{str.slice(0, 47)}...</span>;
    }
    return str;
  };

  return (
    <section>
      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <div className="eyebrow">ADMINISTRATIVE DATA ENGINE</div>
          <h1>Database Explorer <span>· SQL Inspector</span></h1>
          <p className="subheading">
            Live relational database browser querying the active PostgreSQL / SQLite instance with parameterized security.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn btn-outline" onClick={() => { loadOverview(); if (selectedTable) loadTableRecords(selectedTable, page, pageSize, sortBy, sortOrder, activeSearch); }} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh DB
          </button>
        </div>
      </div>

      {/* Warning Banner if PostgreSQL was configured in env but fallback is active */}
      {overview?.warning && (
        <div className="db-warning-banner">
          <AlertTriangle size={20} style={{ flex: 'none', marginTop: '2px' }} />
          <div>
            <strong>PostgreSQL Connection Unreachable: Fallback Storage Active</strong>
            <p style={{ margin: '2px 0 0', lineHeight: 1.5 }}>
              {overview.warning}
            </p>
          </div>
        </div>
      )}

      {/* Engine Status Grid */}
      <div className="stat-grid compact-stats">
        <div className="stat-card">
          <span className="stat-icon green"><Server size={18} /></span>
          <span className="stat-label">ACTIVE DATABASE ENGINE</span>
          <div className="stat-value" style={{ fontSize: '18px', fontWeight: 800 }}>
            {overview?.engineLabel || 'Detecting...'}
          </div>
          <span className="stat-detail">
            {overview?.engine === 'postgresql' ? 'Hostless Cloud PostgreSQL 17' : 'node:sqlite in-process engine'}
          </span>
          <div className="stat-trend">
            <span style={{ background: overview?.engine === 'postgresql' ? '#2ca459' : '#e0933e' }} />
            {overview?.engine === 'postgresql' ? 'Production Online' : 'Local Fallback'}
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon blue"><CheckCircle2 size={18} /></span>
          <span className="stat-label">CONNECTION STATUS</span>
          <div className="stat-value" style={{ fontSize: '18px', fontWeight: 800 }}>
            {overview?.status === 'connected' ? 'Connected' : 'Connecting'}
          </div>
          <span className="stat-detail">
            Last health check: {overview?.lastCheck ? new Date(overview.lastCheck).toLocaleTimeString() : 'Pending'}
          </span>
          <div className="stat-trend">
            <span style={{ background: '#2ca459' }} /> Live Ping OK
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon purple"><Table size={18} /></span>
          <span className="stat-label">SCHEMA TABLES</span>
          <div className="stat-value" style={{ fontSize: '24px', fontWeight: 800 }}>
            {overview?.tables.length || 0}
          </div>
          <span className="stat-detail">
            {overview?.tables.map(t => t.name).join(', ') || 'No tables'}
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-icon orange"><Database size={18} /></span>
          <span className="stat-label">TOTAL DATABASE RECORDS</span>
          <div className="stat-value" style={{ fontSize: '24px', fontWeight: 800 }}>
            {overview?.tables.reduce((acc, t) => acc + t.rowCount, 0) || 0}
          </div>
          <span className="stat-detail">
            Persistent rows across public schema
          </span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="db-warning-banner">
          <ShieldAlert size={18} style={{ flex: 'none' }} />
          <div>
            <strong>Database Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Table Selector Tabs */}
      <div className="db-tabs-bar">
        {overview?.tables.map(t => (
          <button
            key={t.name}
            className={`db-tab-btn ${selectedTable === t.name ? 'active' : ''}`}
            onClick={() => handleTableSwitch(t.name)}
          >
            <Database size={14} />
            <span>{t.name}</span>
            <em>{t.rowCount}</em>
          </button>
        ))}
      </div>

      {/* Table Panel */}
      <div className="db-table-panel">
        {/* Table Schema Header */}
        <div className="db-schema-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <strong style={{ fontFamily: 'Manrope, sans-serif', fontSize: '14px', color: '#273c2e' }}>
                Table: <code>{selectedTable}</code>
              </strong>
              <span className="live-tag">
                <span /> Real Backend SQL
              </span>
            </div>
            <p style={{ fontSize: '11px', color: '#68776b', margin: '4px 0 0' }}>
              {currentTableMeta?.description || 'Relational schema table'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className="btn btn-light btn-xs"
              onClick={() => setShowSchemaDrawer(!showSchemaDrawer)}
            >
              <Table size={13} /> {showSchemaDrawer ? 'Hide Schema' : 'View Schema Columns'}
            </button>
          </div>
        </div>

        {/* Schema Columns Drawer */}
        {showSchemaDrawer && currentTableMeta && (
          <div style={{ background: '#f5f8f3', padding: '12px 18px', borderBottom: '1px solid #e5ebe2' }}>
            <strong style={{ fontSize: '10px', color: '#576b5c', textTransform: 'uppercase', letterSpacing: '.5px' }}>
              Columns Definition ({currentTableMeta.columns.length}):
            </strong>
            <div className="db-schema-badges" style={{ marginTop: '8px' }}>
              {currentTableMeta.columns.map(col => (
                <div key={col.name} className="db-schema-badge">
                  <span style={{ fontWeight: 700, color: col.isPrimaryKey ? '#236642' : '#334839' }}>
                    {col.name}
                  </span>
                  <span style={{ fontSize: '9px', color: '#7a8c7e' }}>({col.type})</span>
                  {col.isPrimaryKey && <span style={{ fontSize: '8px', color: '#fff', background: '#236642', padding: '1px 4px', borderRadius: '3px' }}>PK</span>}
                  {!col.nullable && <span style={{ fontSize: '8px', color: '#b42318' }}>NOT NULL</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #edf1eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="searchbox" style={{ height: '32px', width: '280px' }}>
              <Search size={14} />
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder={`Search records in ${selectedTable}...`}
              />
              {searchInput && (
                <button type="button" onClick={handleSearchClear} style={{ border: 0, background: 'transparent', color: '#889', cursor: 'pointer' }}>
                  <X size={12} />
                </button>
              )}
            </div>
            <button type="submit" className="btn btn-light btn-xs">Search</button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', color: '#68776b' }}>
            <span>Page size:</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              style={{ border: '1px solid #dfe5dc', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', background: '#fff' }}
            >
              <option value={10}>10 records</option>
              <option value={20}>20 records</option>
              <option value={50}>50 records</option>
              <option value={100}>100 records</option>
            </select>
          </div>
        </div>

        {/* Real Records Table */}
        <div className="db-table-container">
          {tableData && tableData.rows.length > 0 ? (
            <table className="db-data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  {tableData.columns.map(col => (
                    <th
                      key={col.name}
                      className="sortable"
                      onClick={() => handleSort(col.name)}
                      title={`Sort by ${col.name}`}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span>{col.name}</span>
                        {sortBy === col.name && (
                          <ArrowUpDown size={11} style={{ color: '#236642' }} />
                        )}
                      </div>
                    </th>
                  ))}
                  <th style={{ width: '70px', textAlign: 'center' }}>VIEW</th>
                </tr>
              </thead>
              <tbody>
                {tableData.rows.map((row, idx) => (
                  <tr key={row.id ?? idx} onClick={() => setInspectedRecord(row)}>
                    <td style={{ color: '#97a69a', fontSize: '10px' }}>
                      {(tableData.page - 1) * tableData.pageSize + idx + 1}
                    </td>
                    {tableData.columns.map(col => (
                      <td key={col.name}>
                        {formatCellValue(row[col.name], col.name)}
                      </td>
                    ))}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="icon-btn"
                        style={{ width: '26px', height: '26px' }}
                        title="Inspect record details"
                        onClick={e => { e.stopPropagation(); setInspectedRecord(row); }}
                      >
                        <Eye size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="chart-state-msg">
              <strong>No Records Found</strong>
              <span>
                {activeSearch ? `No records matched query "${activeSearch}" in ${selectedTable}.` : `Table ${selectedTable} has no rows.`}
              </span>
            </div>
          )}
        </div>

        {/* Pagination Bar */}
        {tableData && (
          <div className="db-pagination-bar">
            <div>
              Showing {tableData.totalRows === 0 ? 0 : (tableData.page - 1) * tableData.pageSize + 1} to{' '}
              {Math.min(tableData.page * tableData.pageSize, tableData.totalRows)} of{' '}
              <strong>{tableData.totalRows}</strong> records
              {activeSearch && ` (filtered by "${activeSearch}")`}
            </div>

            <div className="db-pagination-controls">
              <button
                className="btn btn-light btn-xs"
                disabled={tableData.page <= 1 || isLoading}
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
              >
                <ChevronLeft size={13} /> Prev
              </button>
              <span>
                Page <strong>{tableData.page}</strong> of <strong>{tableData.totalPages}</strong>
              </span>
              <button
                className="btn btn-light btn-xs"
                disabled={tableData.page >= tableData.totalPages || isLoading}
                onClick={() => setPage(prev => Math.min(tableData.totalPages, prev + 1))}
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Record Inspection Modal */}
      {inspectedRecord && (
        <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setInspectedRecord(null); }}>
          <section className="modal record-detail-modal" style={{ width: 'min(100%, 640px)' }}>
            <div className="modal-head">
              <h2>Record Details · {selectedTable}</h2>
              <button className="icon-btn" onClick={() => setInspectedRecord(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: '10px', maxHeight: '480px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="eyebrow" style={{ margin: 0 }}>COLUMN VALUES</span>
                <button
                  className="btn btn-light btn-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(inspectedRecord, null, 2));
                    setCopiedJson(true);
                    setTimeout(() => setCopiedJson(false), 2000);
                  }}
                >
                  {copiedJson ? <Check size={13} /> : <Copy size={13} />}
                  {copiedJson ? 'Copied' : 'Copy JSON'}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', fontSize: '11px', background: '#fafbf9', padding: '12px', borderRadius: '8px', border: '1px solid #edf1eb' }}>
                {Object.entries(inspectedRecord).map(([key, val]) => (
                  <div key={key} style={{ display: 'contents' }}>
                    <span style={{ fontWeight: 700, color: '#445648', wordBreak: 'break-all' }}>{key}:</span>
                    <span style={{ wordBreak: 'break-all' }}>
                      {formatCellValue(val, key)}
                    </span>
                  </div>
                ))}
              </div>

              {inspectedRecord.raw_payload && (
                <div>
                  <strong style={{ fontSize: '11px', color: '#334839' }}>Decoded raw_payload JSON:</strong>
                  <pre>
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(inspectedRecord.raw_payload), null, 2);
                      } catch {
                        return inspectedRecord.raw_payload;
                      }
                    })()}
                  </pre>
                </div>
              )}
            </div>

            <div className="modal-actions" style={{ marginTop: '16px' }}>
              <button className="btn btn-primary" onClick={() => setInspectedRecord(null)}>Close</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
