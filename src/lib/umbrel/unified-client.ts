/**
 * Unified Umbrel Client
 * Manages connection mode switching between direct PostgreSQL and API
 * Supports 'direct', 'api', and 'auto' modes with automatic fallback
 */

import { testConnection as testDirectConnection } from './client';
import { apiClient } from './api-client';

export type ConnectionMode = 'direct' | 'api' | 'auto';

export interface ConnectionStatus {
  mode: ConnectionMode;
  activeConnection: 'direct' | 'api' | 'none';
  directAvailable: boolean;
  apiAvailable: boolean;
  lastChecked: Date;
  error?: string;
}

class UnifiedClient {
  private mode: ConnectionMode;
  private status: ConnectionStatus;
  private statusCache: Map<string, { value: boolean; timestamp: number }>;
  private cacheTTL: number = 60000; // 1 minute cache

  constructor() {
    this.mode = this.getConfiguredMode();
    this.status = {
      mode: this.mode,
      activeConnection: 'none',
      directAvailable: false,
      apiAvailable: false,
      lastChecked: new Date(),
    };
    this.statusCache = new Map();

    console.log(`[UnifiedClient] Initialized with mode: ${this.mode}`);
  }

  /**
   * Get connection mode from environment
   */
  private getConfiguredMode(): ConnectionMode {
    const envMode = process.env.UMBREL_CONNECTION_MODE?.toLowerCase();

    if (envMode === 'direct' || envMode === 'api' || envMode === 'auto') {
      return envMode as ConnectionMode;
    }

    // Default to 'auto' if not specified or invalid
    console.log('[UnifiedClient] No valid UMBREL_CONNECTION_MODE, defaulting to "auto"');
    return 'auto';
  }

  /**
   * Check if direct PostgreSQL connection is available (with caching)
   */
  private async checkDirectConnection(): Promise<boolean> {
    const cacheKey = 'direct';
    const cached = this.statusCache.get(cacheKey);

    // Return cached result if still valid
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      console.log(`[UnifiedClient] Using cached direct connection status: ${cached.value}`);
      return cached.value;
    }

    try {
      console.log('[UnifiedClient] Testing direct PostgreSQL connection...');
      const isAvailable = await testDirectConnection();

      // Cache the result
      this.statusCache.set(cacheKey, {
        value: isAvailable,
        timestamp: Date.now(),
      });

      console.log(`[UnifiedClient] Direct connection ${isAvailable ? 'available' : 'unavailable'}`);
      return isAvailable;
    } catch (error) {
      console.error('[UnifiedClient] Direct connection check failed:', error);

      // Cache the failure
      this.statusCache.set(cacheKey, {
        value: false,
        timestamp: Date.now(),
      });

      return false;
    }
  }

  /**
   * Check if API connection is available (with caching)
   */
  private async checkApiConnection(): Promise<boolean> {
    const cacheKey = 'api';
    const cached = this.statusCache.get(cacheKey);

    // Return cached result if still valid
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      console.log(`[UnifiedClient] Using cached API connection status: ${cached.value}`);
      return cached.value;
    }

    try {
      console.log('[UnifiedClient] Testing API connection...');
      await apiClient.healthCheck();

      // Cache the result
      this.statusCache.set(cacheKey, {
        value: true,
        timestamp: Date.now(),
      });

      console.log('[UnifiedClient] API connection available');
      return true;
    } catch (error) {
      console.error('[UnifiedClient] API connection check failed:', error);

      // Cache the failure
      this.statusCache.set(cacheKey, {
        value: false,
        timestamp: Date.now(),
      });

      return false;
    }
  }

  /**
   * Determine which connection to use based on mode and availability
   */
  async determineConnection(): Promise<'direct' | 'api'> {
    console.log(`[UnifiedClient] Determining connection (mode: ${this.mode})...`);

    // Mode: 'direct' - only use direct connection
    if (this.mode === 'direct') {
      const directAvailable = await this.checkDirectConnection();

      this.status = {
        mode: this.mode,
        activeConnection: directAvailable ? 'direct' : 'none',
        directAvailable,
        apiAvailable: false,
        lastChecked: new Date(),
        error: directAvailable ? undefined : 'Direct connection not available',
      };

      if (!directAvailable) {
        throw new Error('Direct PostgreSQL connection not available');
      }

      console.log('[UnifiedClient] Using direct connection (mode: direct)');
      return 'direct';
    }

    // Mode: 'api' - only use API connection
    if (this.mode === 'api') {
      const apiAvailable = await this.checkApiConnection();

      this.status = {
        mode: this.mode,
        activeConnection: apiAvailable ? 'api' : 'none',
        directAvailable: false,
        apiAvailable,
        lastChecked: new Date(),
        error: apiAvailable ? undefined : 'API connection not available',
      };

      if (!apiAvailable) {
        throw new Error('API connection not available');
      }

      console.log('[UnifiedClient] Using API connection (mode: api)');
      return 'api';
    }

    // Mode: 'auto' - try direct first, fallback to API
    console.log('[UnifiedClient] Auto mode: checking both connections...');

    const [directAvailable, apiAvailable] = await Promise.all([
      this.checkDirectConnection(),
      this.checkApiConnection(),
    ]);

    // Prefer direct connection if available
    if (directAvailable) {
      this.status = {
        mode: this.mode,
        activeConnection: 'direct',
        directAvailable,
        apiAvailable,
        lastChecked: new Date(),
      };

      console.log('[UnifiedClient] Using direct connection (auto mode, direct available)');
      return 'direct';
    }

    // Fallback to API
    if (apiAvailable) {
      this.status = {
        mode: this.mode,
        activeConnection: 'api',
        directAvailable,
        apiAvailable,
        lastChecked: new Date(),
      };

      console.log('[UnifiedClient] Using API connection (auto mode, fallback)');
      return 'api';
    }

    // Neither available
    this.status = {
      mode: this.mode,
      activeConnection: 'none',
      directAvailable: false,
      apiAvailable: false,
      lastChecked: new Date(),
      error: 'No connections available',
    };

    throw new Error('No Umbrel connections available (direct and API both failed)');
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return { ...this.status };
  }

  /**
   * Get current connection mode
   */
  getMode(): ConnectionMode {
    return this.mode;
  }

  /**
   * Clear connection cache (force re-check)
   */
  clearCache(): void {
    console.log('[UnifiedClient] Clearing connection cache');
    this.statusCache.clear();
  }

  /**
   * Update connection mode (requires re-initialization)
   */
  setMode(mode: ConnectionMode): void {
    console.log(`[UnifiedClient] Changing mode from ${this.mode} to ${mode}`);
    this.mode = mode;
    this.clearCache();
  }
}

// Export singleton instance
export const unifiedClient = new UnifiedClient();

/**
 * Helper functions for external use
 */

/**
 * Get current connection mode
 */
export function getConnectionMode(): ConnectionMode {
  return unifiedClient.getMode();
}

/**
 * Get current connection status
 */
export function getConnectionStatus(): ConnectionStatus {
  return unifiedClient.getStatus();
}

/**
 * Determine which connection to use
 */
export async function determineConnection(): Promise<'direct' | 'api'> {
  return unifiedClient.determineConnection();
}

/**
 * Clear connection cache
 */
export function clearConnectionCache(): void {
  unifiedClient.clearCache();
}

/**
 * Set connection mode
 */
export function setConnectionMode(mode: ConnectionMode): void {
  unifiedClient.setMode(mode);
}
