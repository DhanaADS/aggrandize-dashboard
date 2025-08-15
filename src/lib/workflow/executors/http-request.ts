// HTTP Request Node Executor
import { BaseNodeExecutor } from './registry';
import { WorkflowNode, NodeExecutionContext, NodeExecutionResult, HttpOptions } from '../types';

export class HttpRequestExecutor extends BaseNodeExecutor {
  async execute(node: WorkflowNode, context: NodeExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { url, method = 'GET', headers = {}, body, auth, timeout = 30000 } = node.properties;
      
      if (!url) {
        throw new Error('URL is required for HTTP Request node');
      }

      // Build request options
      const options: RequestInit = {
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Scryptr-Workflow-Bot/1.0',
          ...headers
        },
        signal: AbortSignal.timeout(timeout)
      };

      // Add authentication
      if (auth) {
        switch (auth.type) {
          case 'bearer':
            options.headers = {
              ...options.headers,
              'Authorization': `Bearer ${auth.token}`
            };
            break;
          case 'basic':
            const basicAuth = btoa(`${auth.username}:${auth.password}`);
            options.headers = {
              ...options.headers,
              'Authorization': `Basic ${basicAuth}`
            };
            break;
          case 'apikey':
            options.headers = {
              ...options.headers,
              [auth.keyName || 'X-API-Key']: auth.apiKey
            };
            break;
        }
      }

      // Add body for POST/PUT requests
      if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && body) {
        if (typeof body === 'object') {
          options.body = JSON.stringify(body);
        } else {
          options.body = body;
        }
      }

      // Make the request
      const response = await fetch(url, options);
      
      // Parse response based on content type
      let responseData: any;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else if (contentType?.includes('text/')) {
        responseData = await response.text();
      } else {
        responseData = await response.blob();
      }

      const executionTime = Date.now() - startTime;

      if (!response.ok) {
        return this.createResult(
          false,
          {
            status: response.status,
            statusText: response.statusText,
            data: responseData
          },
          `HTTP ${response.status}: ${response.statusText}`,
          executionTime
        );
      }

      return this.createResult(
        true,
        {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data: responseData,
          url: response.url
        },
        undefined,
        executionTime
      );

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return this.createResult(false, {}, 'Request timeout', executionTime);
        }
        return this.createResult(false, {}, error.message, executionTime);
      }
      
      return this.createResult(false, {}, 'Unknown error occurred', executionTime);
    }
  }
}