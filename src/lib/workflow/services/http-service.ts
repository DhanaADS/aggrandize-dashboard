// HTTP Service Implementation
import { HttpService, HttpOptions } from '../types';

export class HttpServiceImpl implements HttpService {
  async get(url: string, options?: HttpOptions): Promise<any> {
    return this.makeRequest('GET', url, undefined, options);
  }

  async post(url: string, data: any, options?: HttpOptions): Promise<any> {
    return this.makeRequest('POST', url, data, options);
  }

  async put(url: string, data: any, options?: HttpOptions): Promise<any> {
    return this.makeRequest('PUT', url, data, options);
  }

  async delete(url: string, options?: HttpOptions): Promise<any> {
    return this.makeRequest('DELETE', url, undefined, options);
  }

  private async makeRequest(
    method: string,
    url: string,
    data?: any,
    options?: HttpOptions
  ): Promise<any> {
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Scryptr-Workflow/1.0',
        ...options?.headers
      }
    };

    // Add authentication
    if (options?.auth) {
      switch (options.auth.type) {
        case 'bearer':
          requestOptions.headers = {
            ...requestOptions.headers,
            'Authorization': `Bearer ${options.auth.token}`
          };
          break;
        case 'basic':
          const basicAuth = btoa(`${options.auth.username}:${options.auth.password}`);
          requestOptions.headers = {
            ...requestOptions.headers,
            'Authorization': `Basic ${basicAuth}`
          };
          break;
        case 'apikey':
          requestOptions.headers = {
            ...requestOptions.headers,
            'X-API-Key': options.auth.apiKey!
          };
          break;
      }
    }

    // Add body for POST/PUT requests
    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      requestOptions.body = typeof data === 'string' ? data : JSON.stringify(data);
    }

    // Set timeout
    if (options?.timeout) {
      requestOptions.signal = AbortSignal.timeout(options.timeout);
    }

    let lastError: Error | null = null;
    const maxRetries = options?.retries || 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, requestOptions);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          return await response.json();
        } else if (contentType?.includes('text/')) {
          return await response.text();
        } else {
          return await response.blob();
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError;
  }
}