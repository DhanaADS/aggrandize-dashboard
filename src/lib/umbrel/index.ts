// Umbrel PostgreSQL Database Layer
// Auto-switches between direct PostgreSQL (local) and HTTP API (Vercel)
// via query-wrapper based on UMBREL_CONNECTION_MODE environment variable

export * from './query-wrapper';
export * from './api';
export * from './api-client';
// Note: unified-client removed to avoid loading pg on Vercel
