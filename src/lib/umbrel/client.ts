import { Pool, QueryResult, QueryResultRow } from 'pg';

// Direct PostgreSQL connection to Umbrel
// No SSH tunnel needed since app and Umbrel are on the same network

interface UmbrelConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

function getConfig(): UmbrelConfig {
  return {
    host: process.env.UMBREL_SSH_HOST || 'umbrel.local',
    port: parseInt(process.env.UMBREL_DB_PORT || '5432'),
    database: process.env.UMBREL_DB_NAME || 'aggrandize_business',
    user: process.env.UMBREL_DB_USER || 'aggrandize',
    password: process.env.UMBREL_DB_PASSWORD || 'AggrandizeDB2024',
  };
}

// Global pool singleton
let pgPool: Pool | null = null;

function getPool(): Pool {
  if (pgPool) {
    return pgPool;
  }

  const config = getConfig();

  pgPool = new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pgPool.on('error', (err) => {
    console.error('[Umbrel] Pool error:', err);
  });

  pgPool.on('connect', () => {
    console.log('[Umbrel] New client connected');
  });

  return pgPool;
}

// Main query function
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const pool = getPool();
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    console.log(`[Umbrel] Query executed in ${duration}ms, rows: ${result.rowCount}`);
    return result;
  } catch (error) {
    console.error('[Umbrel] Query error:', error);
    throw error;
  }
}

// Convenience method for single row queries
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const result = await query<T>(text, params);
  return result.rows[0] || null;
}

// Convenience method for checking connection
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW() as now, version() as version');
    console.log('[Umbrel] Connection test successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('[Umbrel] Connection test failed:', error);
    return false;
  }
}

// Close all connections
export async function closeConnection(): Promise<void> {
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
}

// Export types
export type { QueryResult, QueryResultRow };
