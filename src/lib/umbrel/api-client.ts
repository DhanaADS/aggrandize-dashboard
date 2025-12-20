/**
 * Umbrel API Client
 * HTTP client for communicating with Cloudflare-proxied Umbrel API
 * Endpoint: https://api.aggrandizedigital.com
 */

interface ApiClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
}

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  body?: unknown;
  timeout?: number;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export class UmbrelApiClient {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 30000; // Default 30s timeout
  }

  /**
   * Make HTTP request to API
   */
  private async request<T = unknown>(options: RequestOptions): Promise<T> {
    const { method, endpoint, body, timeout } = options;
    const url = `${this.baseUrl}${endpoint}`;

    console.log(`[UmbrelApiClient] ${method} ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout || this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[UmbrelApiClient] HTTP ${response.status}: ${errorText}`);
        throw new Error(`API request failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log(`[UmbrelApiClient] Response received:`, data);

      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('[UmbrelApiClient] Request timeout');
          throw new Error('Request timeout');
        }
        console.error('[UmbrelApiClient] Request failed:', error.message);
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }

  /**
   * GET request
   */
  async get<T = unknown>(endpoint: string, timeout?: number): Promise<T> {
    return this.request<T>({ method: 'GET', endpoint, timeout });
  }

  /**
   * POST request
   */
  async post<T = unknown>(endpoint: string, body?: unknown, timeout?: number): Promise<T> {
    return this.request<T>({ method: 'POST', endpoint, body, timeout });
  }

  /**
   * PUT request
   */
  async put<T = unknown>(endpoint: string, body?: unknown, timeout?: number): Promise<T> {
    return this.request<T>({ method: 'PUT', endpoint, body, timeout });
  }

  /**
   * DELETE request
   */
  async delete<T = unknown>(endpoint: string, timeout?: number): Promise<T> {
    return this.request<T>({ method: 'DELETE', endpoint, timeout });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await this.get<{ status: string; timestamp: string }>('/health', 5000);
      console.log('[UmbrelApiClient] Health check passed:', response);
      return response;
    } catch (error) {
      console.error('[UmbrelApiClient] Health check failed:', error);
      throw error;
    }
  }
}

/**
 * Create API client instance from environment variables
 */
export function createApiClient(): UmbrelApiClient {
  const baseUrl = process.env.UMBREL_API_URL || 'https://api.aggrandizedigital.com';
  const apiKey = process.env.UMBREL_API_KEY || '';

  if (!apiKey) {
    console.warn('[UmbrelApiClient] No API key configured (UMBREL_API_KEY)');
  }

  return new UmbrelApiClient({
    baseUrl,
    apiKey,
    timeout: 30000,
  });
}

// Export singleton instance
export const apiClient = createApiClient();
