/**
 * Unified Query Wrapper
 * Auto-switches between direct PostgreSQL and HTTP API based on environment config
 *
 * Usage:
 * - Set UMBREL_CONNECTION_MODE='api' to use HTTP API (Cloudflare-proxied)
 * - Set UMBREL_CONNECTION_MODE='direct' or leave unset to use direct PostgreSQL
 *
 * API Mode requires:
 * - UMBREL_API_URL (default: https://api.aggrandizedigital.com)
 * - UMBREL_API_KEY
 */

import type { QueryResult, QueryResultRow } from 'pg';

// Connection mode type
type ConnectionMode = 'api' | 'direct';

// Determine connection mode from environment
function getConnectionMode(): ConnectionMode {
  const mode = process.env.UMBREL_CONNECTION_MODE?.trim().toLowerCase();
  if (mode === 'api') {
    return 'api';
  }
  return 'direct';
}

// API client configuration
interface ApiConfig {
  baseUrl: string;
  apiKey: string;
}

function getApiConfig(): ApiConfig & { adminKey: string } {
  return {
    baseUrl: (process.env.UMBREL_API_URL?.trim() || 'https://api.aggrandizedigital.com').replace(/\/$/, ''),
    apiKey: process.env.UMBREL_API_KEY?.trim() || '',
    adminKey: process.env.UMBREL_ADMIN_KEY?.trim() || '',
  };
}

// API query implementation
async function queryViaApi<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const config = getApiConfig();

  if (!config.apiKey) {
    throw new Error('UMBREL_API_KEY is required for API mode');
  }

  const url = `${config.baseUrl}/query`;
  console.log(`[QueryWrapper:API] Executing query via ${url}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey,
        'X-ADMIN-KEY': config.adminKey,
      },
      body: JSON.stringify({
        sql: text,
        params: params || [],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[QueryWrapper:API] HTTP ${response.status}: ${errorText}`);
      throw new Error(`API query failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    // Transform API response to match pg QueryResult interface
    const result: QueryResult<T> = {
      rows: data.rows || [],
      rowCount: data.rowCount || 0,
      command: data.command || '',
      oid: data.oid || 0,
      fields: data.fields || [],
    };

    console.log(`[QueryWrapper:API] Query successful, rows: ${result.rowCount}`);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('[QueryWrapper:API] Request timeout');
        throw new Error('Query request timeout');
      }
      console.error('[QueryWrapper:API] Request failed:', error.message);
      throw error;
    }
    throw new Error('Unknown error occurred during API query');
  }
}

// Direct PostgreSQL query implementation (lazy import)
async function queryViaDirect<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  console.log('[QueryWrapper:Direct] Executing query via direct PostgreSQL');

  // Dynamic import to avoid loading pg pool when in API mode
  const { query: directQuery } = await import('./client');
  return directQuery<T>(text, params);
}

// Main query function - auto-switches based on mode
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const mode = getConnectionMode();
  console.log(`[QueryWrapper] Using connection mode: ${mode}`);

  if (mode === 'api') {
    return queryViaApi<T>(text, params);
  } else {
    return queryViaDirect<T>(text, params);
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

// Test connection (works in both modes)
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW() as now, version() as version');
    console.log('[QueryWrapper] Connection test successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('[QueryWrapper] Connection test failed:', error);
    return false;
  }
}

// Get current connection mode (useful for debugging)
export function getMode(): ConnectionMode {
  return getConnectionMode();
}

// Export types
export type { QueryResult, QueryResultRow, ConnectionMode };
