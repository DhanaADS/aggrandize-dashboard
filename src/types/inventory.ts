// Website Inventory Management Types
// Digital Marketing Website Inventory with SEO metrics and content policy flags

export interface WebsiteInventory {
  id: string;
  website: string;
  contact?: string;
  client_price?: number;
  price?: number;
  domain_rating?: number; // DR (0-100)
  da?: number; // Domain Authority (0-100)
  backlinks?: number;
  organic_traffic?: number;
  us_traffic?: number;
  uk_traffic?: number;
  canada_traffic?: number;
  is_indexed: boolean;
  ai_overview: boolean;
  chatgpt: boolean;
  perplexity: boolean;
  gemini: boolean;
  copilot: boolean;
  do_follow: boolean;
  news: boolean;
  sponsored: boolean;
  cbd: boolean;
  casino: boolean;
  dating: boolean;
  crypto: boolean;
  category?: string;
  tat?: number; // Turnaround time in days
  status: 'active' | 'inactive' | 'pending' | 'blacklisted';
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Form interface for creating/editing websites
export interface WebsiteFormData {
  website: string;
  contact?: string;
  client_price?: number;
  price?: number;
  domain_rating?: number;
  da?: number;
  backlinks?: number;
  organic_traffic?: number;
  us_traffic?: number;
  uk_traffic?: number;
  canada_traffic?: number;
  is_indexed: boolean;
  ai_overview: boolean;
  chatgpt: boolean;
  perplexity: boolean;
  gemini: boolean;
  copilot: boolean;
  do_follow: boolean;
  news: boolean;
  sponsored: boolean;
  cbd: boolean;
  casino: boolean;
  dating: boolean;
  crypto: boolean;
  category?: string;
  tat?: number;
  status: 'active' | 'inactive' | 'pending' | 'blacklisted';
  notes?: string;
}

// Filter interface for advanced filtering
export interface InventoryFilters {
  // Text search
  search?: string;
  website?: string;
  contact?: string;
  category?: string;
  
  // Authority metrics
  domain_rating_min?: number;
  domain_rating_max?: number;
  da_min?: number;
  da_max?: number;
  backlinks_min?: number;
  backlinks_max?: number;
  
  // Traffic metrics
  organic_traffic_min?: number;
  organic_traffic_max?: number;
  us_traffic_min?: number;
  us_traffic_max?: number;
  uk_traffic_min?: number;
  uk_traffic_max?: number;
  canada_traffic_min?: number;
  canada_traffic_max?: number;
  
  // Price filters
  client_price_min?: number;
  client_price_max?: number;
  price_min?: number;
  price_max?: number;
  
  // Boolean filters
  is_indexed?: boolean;
  do_follow?: boolean;
  news?: boolean;
  sponsored?: boolean;
  
  // AI flags
  ai_overview?: boolean;
  chatgpt?: boolean;
  perplexity?: boolean;
  gemini?: boolean;
  copilot?: boolean;
  
  // Niche filters
  cbd?: boolean;
  casino?: boolean;
  dating?: boolean;
  crypto?: boolean;
  
  // Business filters
  tat_min?: number;
  tat_max?: number;
  status?: string;
  
  // Date filters
  created_from?: string;
  created_to?: string;
  updated_from?: string;
  updated_to?: string;
}

// Sort configuration
export interface SortConfig {
  column: keyof WebsiteInventory;
  direction: 'asc' | 'desc';
}

// Pagination configuration
export interface PaginationConfig {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// API response for paginated results
export interface InventoryResponse {
  websites: WebsiteInventory[];
  pagination: PaginationConfig;
  totalCount: number;
}

// Summary/metrics interfaces
export interface InventoryMetrics {
  total_websites: number;
  active_websites: number;
  inactive_websites: number;
  pending_websites: number;
  blacklisted_websites: number;
  avg_domain_rating: number;
  avg_da: number;
  total_organic_traffic: number;
  total_backlinks: number;
  avg_client_price: number;
  avg_price: number;
  total_client_value: number;
  total_value: number;
  niche_breakdown: {
    cbd_count: number;
    casino_count: number;
    dating_count: number;
    crypto_count: number;
    news_count: number;
    sponsored_count: number;
  };
  traffic_distribution: {
    high_traffic: number; // >1M organic traffic
    medium_traffic: number; // 100K-1M
    low_traffic: number; // <100K
  };
  authority_distribution: {
    high_authority: number; // DR 80+
    medium_authority: number; // DR 50-79
    low_authority: number; // DR <50
  };
}

// Category breakdown
export interface CategoryMetrics {
  category: string;
  count: number;
  avg_domain_rating: number;
  avg_da: number;
  total_organic_traffic: number;
  avg_client_price: number;
  avg_tat: number;
}

// Traffic geo breakdown
export interface TrafficMetrics {
  total_organic: number;
  us_traffic: number;
  uk_traffic: number;
  canada_traffic: number;
  us_percentage: number;
  uk_percentage: number;
  canada_percentage: number;
}

// Column visibility configuration
export interface ColumnConfig {
  key: keyof WebsiteInventory;
  label: string;
  visible: boolean;
  sortable: boolean;
  filterable: boolean;
  type: 'text' | 'number' | 'boolean' | 'currency' | 'url' | 'email' | 'date';
  icon?: string;
  width?: number;
}

// Bulk operation types
export type BulkAction = 'delete' | 'activate' | 'deactivate' | 'blacklist' | 'export' | 'update_category' | 'update_status';

export interface BulkActionPayload {
  action: BulkAction;
  website_ids: string[];
  data?: Partial<WebsiteFormData>; // For bulk updates
}

// Export configuration
export interface ExportConfig {
  format: 'csv' | 'xlsx' | 'json';
  columns: (keyof WebsiteInventory)[];
  filters?: InventoryFilters;
  filename?: string;
}

// Website validation interface
export interface WebsiteValidation {
  website: {
    isValid: boolean;
    error?: string;
  };
  contact: {
    isValid: boolean;
    error?: string;
  };
  domain_rating: {
    isValid: boolean;
    error?: string;
  };
  da: {
    isValid: boolean;
    error?: string;
  };
  prices: {
    isValid: boolean;
    error?: string;
  };
  traffic: {
    isValid: boolean;
    error?: string;
  };
}

// Constants for dropdown options and validation
export const WEBSITE_STATUSES = [
  { value: 'active', label: 'Active', color: '#10b981' },
  { value: 'inactive', label: 'Inactive', color: '#6b7280' },
  { value: 'pending', label: 'Pending', color: '#f59e0b' },
  { value: 'blacklisted', label: 'Blacklisted', color: '#ef4444' }
] as const;

export const CATEGORIES = [
  'Technology',
  'Finance', 
  'Health',
  'Lifestyle',
  'Gaming',
  'Business',
  'Entertainment',
  'Sports',
  'Education',
  'Travel',
  'Fashion',
  'Food',
  'Real Estate',
  'Automotive',
  'Science',
  'Politics',
  'Art',
  'Music',
  'Other'
] as const;

export const TRAFFIC_RANGES = [
  { label: 'Any', min: 0, max: null },
  { label: '< 10K', min: 0, max: 10000 },
  { label: '10K - 50K', min: 10000, max: 50000 },
  { label: '50K - 100K', min: 50000, max: 100000 },
  { label: '100K - 500K', min: 100000, max: 500000 },
  { label: '500K - 1M', min: 500000, max: 1000000 },
  { label: '1M - 5M', min: 1000000, max: 5000000 },
  { label: '5M - 10M', min: 5000000, max: 10000000 },
  { label: '10M+', min: 10000000, max: null }
] as const;

export const AUTHORITY_RANGES = [
  { label: 'Any', min: 0, max: 100 },
  { label: '0 - 20', min: 0, max: 20 },
  { label: '20 - 40', min: 20, max: 40 },
  { label: '40 - 60', min: 40, max: 60 },
  { label: '60 - 80', min: 60, max: 80 },
  { label: '80 - 90', min: 80, max: 90 },
  { label: '90+', min: 90, max: 100 }
] as const;

export const PRICE_RANGES = [
  { label: 'Any', min: 0, max: null },
  { label: '< $500', min: 0, max: 500 },
  { label: '$500 - $1,000', min: 500, max: 1000 },
  { label: '$1,000 - $2,500', min: 1000, max: 2500 },
  { label: '$2,500 - $5,000', min: 2500, max: 5000 },
  { label: '$5,000 - $10,000', min: 5000, max: 10000 },
  { label: '$10,000+', min: 10000, max: null }
] as const;

export const TAT_RANGES = [
  { label: 'Any', min: 0, max: null },
  { label: 'Same day', min: 0, max: 1 },
  { label: '1-2 days', min: 1, max: 2 },
  { label: '3-5 days', min: 3, max: 5 },
  { label: '1 week', min: 6, max: 7 },
  { label: '2 weeks', min: 8, max: 14 },
  { label: '3+ weeks', min: 15, max: null }
] as const;

// Default column configuration
export const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'website', label: 'Website', visible: true, sortable: true, filterable: true, type: 'url', icon: '🌐', width: 200 },
  { key: 'contact', label: 'Contact', visible: true, sortable: true, filterable: true, type: 'email', icon: '📧', width: 180 },
  { key: 'client_price', label: 'Client Price', visible: true, sortable: true, filterable: true, type: 'currency', icon: '💰', width: 120 },
  { key: 'price', label: 'Price', visible: true, sortable: true, filterable: true, type: 'currency', icon: '💵', width: 100 },
  { key: 'domain_rating', label: 'DR', visible: true, sortable: true, filterable: true, type: 'number', icon: '📊', width: 80 },
  { key: 'da', label: 'DA', visible: true, sortable: true, filterable: true, type: 'number', icon: '📈', width: 80 },
  { key: 'backlinks', label: 'Backlinks', visible: true, sortable: true, filterable: true, type: 'number', icon: '🔗', width: 100 },
  { key: 'organic_traffic', label: 'Organic Traffic', visible: true, sortable: true, filterable: true, type: 'number', icon: '📈', width: 120 },
  { key: 'us_traffic', label: 'US Traffic', visible: false, sortable: true, filterable: true, type: 'number', icon: '🇺🇸', width: 100 },
  { key: 'uk_traffic', label: 'UK Traffic', visible: false, sortable: true, filterable: true, type: 'number', icon: '🇬🇧', width: 100 },
  { key: 'canada_traffic', label: 'Canada Traffic', visible: false, sortable: true, filterable: true, type: 'number', icon: '🇨🇦', width: 100 },
  { key: 'is_indexed', label: 'Index', visible: true, sortable: true, filterable: true, type: 'boolean', icon: '✅', width: 80 },
  { key: 'ai_overview', label: 'AI Overview', visible: false, sortable: true, filterable: true, type: 'boolean', icon: '🤖', width: 100 },
  { key: 'chatgpt', label: 'ChatGPT', visible: false, sortable: true, filterable: true, type: 'boolean', icon: '🤖', width: 100 },
  { key: 'perplexity', label: 'Perplexity', visible: false, sortable: true, filterable: true, type: 'boolean', icon: '🤖', width: 100 },
  { key: 'gemini', label: 'Gemini', visible: false, sortable: true, filterable: true, type: 'boolean', icon: '🤖', width: 100 },
  { key: 'copilot', label: 'Copilot', visible: false, sortable: true, filterable: true, type: 'boolean', icon: '🤖', width: 100 },
  { key: 'do_follow', label: 'Do Follow', visible: true, sortable: true, filterable: true, type: 'boolean', icon: '🔗', width: 100 },
  { key: 'news', label: 'News', visible: true, sortable: true, filterable: true, type: 'boolean', icon: '📰', width: 80 },
  { key: 'sponsored', label: 'Sponsored', visible: true, sortable: true, filterable: true, type: 'boolean', icon: '💎', width: 100 },
  { key: 'cbd', label: 'CBD', visible: true, sortable: true, filterable: true, type: 'boolean', icon: '⚠️', width: 80 },
  { key: 'casino', label: 'Casino', visible: true, sortable: true, filterable: true, type: 'boolean', icon: '⚠️', width: 80 },
  { key: 'dating', label: 'Dating', visible: true, sortable: true, filterable: true, type: 'boolean', icon: '⚠️', width: 80 },
  { key: 'crypto', label: 'Crypto', visible: true, sortable: true, filterable: true, type: 'boolean', icon: '⚠️', width: 80 },
  { key: 'category', label: 'Category', visible: true, sortable: true, filterable: true, type: 'text', icon: '📂', width: 120 },
  { key: 'tat', label: 'TAT', visible: true, sortable: true, filterable: true, type: 'number', icon: '⏱️', width: 80 },
];