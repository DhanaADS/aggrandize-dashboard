// Website Inventory API Client
// Handles all API calls for website inventory management

import { 
  WebsiteInventory, 
  WebsiteFormData, 
  InventoryFilters, 
  InventoryResponse, 
  InventoryMetrics,
  SortConfig,
  BulkActionPayload,
  ExportConfig
} from '@/types/inventory';

class InventoryAPI {
  private baseUrl = '/api/inventory';

  // Fetch websites with filters and pagination
  async getWebsites(
    filters: InventoryFilters = {},
    page: number = 1,
    limit: number = 50,
    sort?: SortConfig
  ): Promise<InventoryResponse> {
    const searchParams = new URLSearchParams();
    
    // Pagination
    searchParams.append('page', page.toString());
    searchParams.append('limit', limit.toString());
    
    // Sorting
    if (sort) {
      searchParams.append('sort_by', sort.column as string);
      searchParams.append('sort_order', sort.direction);
    }

    // Filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(`${this.baseUrl}?${searchParams.toString()}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch websites');
    }
    
    return response.json();
  }

  // Get website metrics/summary
  async getMetrics(): Promise<InventoryMetrics> {
    const response = await fetch(`${this.baseUrl}?action=metrics`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch metrics');
    }
    
    const data = await response.json();
    return data.metrics;
  }

  // Get single website by ID
  async getWebsite(id: string): Promise<WebsiteInventory> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch website');
    }
    
    const data = await response.json();
    return data.website;
  }

  // Create new website
  async createWebsite(websiteData: WebsiteFormData): Promise<WebsiteInventory> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(websiteData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create website');
    }

    const data = await response.json();
    return data.website;
  }

  // Update website
  async updateWebsite(id: string, websiteData: Partial<WebsiteFormData>): Promise<WebsiteInventory> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(websiteData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update website');
    }

    const data = await response.json();
    return data.website;
  }

  // Delete website
  async deleteWebsite(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete website');
    }
  }

  // Bulk operations
  async bulkAction(payload: BulkActionPayload): Promise<{ success: boolean; message: string; affected_count: number }> {
    const response = await fetch(`${this.baseUrl}/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to perform bulk action');
    }

    return response.json();
  }

  // Export data
  async exportData(config: ExportConfig): Promise<Blob | any> {
    const response = await fetch(`${this.baseUrl}/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to export data');
    }

    // Handle different export formats
    if (config.format === 'csv') {
      return response.blob();
    } else if (config.format === 'xlsx') {
      // For Excel, we'll return the data and handle conversion on the client
      return response.json();
    } else {
      return response.json();
    }
  }

  // Download export file
  async downloadExport(config: ExportConfig): Promise<void> {
    try {
      const data = await this.exportData(config);
      
      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = config.filename || `website-inventory-${timestamp}`;
      
      if (config.format === 'csv') {
        // Handle CSV blob
        const url = window.URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else if (config.format === 'json') {
        // Handle JSON download
        const blob = new Blob([JSON.stringify(data, null, 2)], { 
          type: 'application/json' 
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else if (config.format === 'xlsx') {
        // For Excel, we would need a library like SheetJS
        // For now, fallback to CSV
        console.warn('Excel export not implemented, falling back to JSON');
        const blob = new Blob([JSON.stringify(data, null, 2)], { 
          type: 'application/json' 
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export download failed:', error);
      throw error;
    }
  }

  // Search suggestions (for autocomplete)
  async getSearchSuggestions(query: string, field: 'website' | 'contact' | 'category' = 'website'): Promise<string[]> {
    try {
      const filters: InventoryFilters = {};
      filters[field] = query;
      
      const response = await this.getWebsites(filters, 1, 10);
      return response.websites.map(website => website[field]).filter(Boolean) as string[];
    } catch (error) {
      console.error('Failed to get search suggestions:', error);
      return [];
    }
  }

  // Get unique categories
  async getCategories(): Promise<string[]> {
    try {
      const response = await this.getWebsites({}, 1, 1000); // Get all to extract unique categories
      const categories = [...new Set(
        response.websites
          .map(website => website.category)
          .filter(Boolean)
      )].sort();
      
      return categories as string[];
    } catch (error) {
      console.error('Failed to get categories:', error);
      return [];
    }
  }

  // Get unique contacts
  async getContacts(): Promise<string[]> {
    try {
      const response = await this.getWebsites({}, 1, 1000); // Get all to extract unique contacts
      const contacts = [...new Set(
        response.websites
          .map(website => website.contact)
          .filter(Boolean)
      )].sort();
      
      return contacts as string[];
    } catch (error) {
      console.error('Failed to get contacts:', error);
      return [];
    }
  }

  // Validate website URL
  async validateWebsite(website: string): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Basic URL validation
      const urlPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
      
      if (!website || website.trim() === '') {
        return { isValid: false, error: 'Website URL is required' };
      }

      // Remove protocol if present
      const cleanedWebsite = website.replace(/^https?:\/\//, '').replace(/^www\./, '');
      
      if (!urlPattern.test(cleanedWebsite)) {
        return { isValid: false, error: 'Invalid website URL format' };
      }

      // Check if website already exists
      try {
        const existingResponse = await this.getWebsites({ website: cleanedWebsite }, 1, 1);
        if (existingResponse.websites.length > 0) {
          return { isValid: false, error: 'Website already exists in inventory' };
        }
      } catch (error) {
        // If error checking existing websites, continue with validation
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'Validation failed' };
    }
  }

  // Get dashboard stats for quick overview
  async getDashboardStats(): Promise<{
    total: number;
    active: number;
    highAuthority: number; // DR 80+
    highTraffic: number; // 1M+ organic traffic
    premiumSites: number; // $5000+ client price
    nicheSites: number; // CBD, Casino, Dating, Crypto
  }> {
    try {
      const metrics = await this.getMetrics();
      
      return {
        total: metrics.total_websites,
        active: metrics.active_websites,
        highAuthority: metrics.authority_distribution.high_authority,
        highTraffic: metrics.traffic_distribution.high_traffic,
        premiumSites: 0, // Would need to calculate from price data
        nicheSites: metrics.niche_breakdown.cbd_count + 
                   metrics.niche_breakdown.casino_count + 
                   metrics.niche_breakdown.dating_count + 
                   metrics.niche_breakdown.crypto_count
      };
    } catch (error) {
      console.error('Failed to get dashboard stats:', error);
      return {
        total: 0,
        active: 0,
        highAuthority: 0,
        highTraffic: 0,
        premiumSites: 0,
        nicheSites: 0
      };
    }
  }
}

// Create singleton instance
const inventoryApi = new InventoryAPI();

export default inventoryApi;

// Export class for testing or custom instances
export { InventoryAPI };