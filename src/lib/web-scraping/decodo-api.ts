interface DecodoConfig {
  url: string;
  target?: 'universal';
  parse?: boolean;
  headless?: 'html' | 'png';
  device_type?: 'desktop' | 'mobile' | 'tablet';
  country_code?: string;
  timeout?: number;
  callback_url?: string;
}

interface DecodoResponse {
  success: boolean;
  data?: {
    content: string;
    status_code: number;
    url: string;
    task_id?: string;
  };
  error?: string;
}

export class DecodoAPI {
  private username: string;
  private password: string;
  private baseUrl: string;

  constructor(username: string, password: string) {
    this.username = username;
    this.password = password;
    this.baseUrl = 'https://scraper-api.decodo.com/v2';
  }

  private getAuthHeader(): string {
    return `Basic ${Buffer.from(`${this.username}:${this.password}`).toString('base64')}`;
  }

  async scrape(config: DecodoConfig): Promise<DecodoResponse> {
    try {
      // For real-time scraping
      const requestBody = {
        url: config.url,
        target: config.target || 'universal',
        parse: config.parse || false,
        headless: config.headless || 'html',
        device_type: config.device_type || 'desktop',
        country_code: config.country_code || 'us',
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      console.log('Decodo API Request:', {
        url: `${this.baseUrl}/scrape`,
        body: requestBody,
        auth: this.getAuthHeader().substring(0, 20) + '...'
      });

      const response = await fetch(`${this.baseUrl}/scrape`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();
      console.log('Decodo API Response:', {
        status: response.status,
        statusText: response.statusText,
        data: data
      });

      if (response.ok) {
        return {
          success: true,
          data: data, // Return the full response to preserve structure
        };
      } else {
        return {
          success: false,
          error: data.error || data.message || 'Unknown error',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  async createTask(config: DecodoConfig): Promise<{ success: boolean; task_id?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/task`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: config.url,
          target: config.target || 'universal',
          parse: config.parse || false,
          headless: config.headless || 'html',
          device_type: config.device_type || 'desktop',
          callback_url: config.callback_url,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          task_id: data.id,
        };
      } else {
        return {
          success: false,
          error: data.error || data.message || 'Failed to create task',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  async getTaskResult(task_id: string): Promise<DecodoResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/task/${task_id}/results`, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
        },
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          data: data, // Return the full response to preserve structure
        };
      } else {
        return {
          success: false,
          error: data.error || data.message || 'Failed to get result',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  async scrapeMultiple(urls: string[], config: Omit<DecodoConfig, 'url'> = {}): Promise<DecodoResponse[]> {
    const results: DecodoResponse[] = [];

    for (const url of urls) {
      const result = await this.scrape({ ...config, url });
      results.push(result);

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }

  async createBatchTasks(urls: string[], config: Omit<DecodoConfig, 'url'> = {}): Promise<{ success: boolean; task_ids?: string[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/task/batch`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: urls,
          target: config.target || 'universal',
          parse: config.parse || false,
          headless: config.headless || 'html',
          device_type: config.device_type || 'desktop',
          callback_url: config.callback_url,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          task_ids: data.task_ids || data.ids || [],
        };
      } else {
        return {
          success: false,
          error: data.error || data.message || 'Failed to create batch tasks',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }
}