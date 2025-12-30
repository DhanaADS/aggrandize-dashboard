/**
 * Orders Transformer
 * Transforms Excel data from ADS_orders_2020.xlsx to system format
 */

import { OrderStatus, PaymentStatus, OrderItemStatus } from '@/types/orders';

// Excel row interface
export interface ExcelRow {
  No: string | null;
  Date: string | Date | null;
  Client: string | null;
  'Client URL': string | null;
  Keywords: string | null;
  Publication: string | null;
  Price: number | string | null;
  Status: string | null;
  Link: string | null;
}

// Transformed order for database
export interface TransformedOrder {
  order_number: string;
  client_name: string;
  client_email: string | null;
  client_company: string | null;
  project_name: string | null;
  order_date: string;
  due_date: string | null;
  total_amount: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  notes: string | null;
  items: TransformedOrderItem[];
}

// Transformed order item for database
export interface TransformedOrderItem {
  website: string;
  keyword: string;
  client_url: string;
  price: number;
  status: OrderItemStatus;
  live_url: string | null;
  processing_status: string;
}

// Group of rows belonging to same order
export interface OrderGroup {
  orderNo: string;
  client: string;
  date: string | Date;
  price: number | string;
  clientUrl: string;
  rows: ExcelRow[];
}

/**
 * Keep order number as-is from Excel
 * TA20_01 → TA20_01
 * ADS23_01 → ADS23_01
 * No conversion - preserve original format
 */
export function parseOrderNumber(no: string): string {
  if (!no) return '';
  return no.toString().trim();
}

/**
 * Check if order number is valid
 * Supports: TA{YY}_{XXX}, ADS{YY}_{XXX}
 */
export function isValidOrderNumber(no: string): boolean {
  if (!no) return false;
  const str = no.toString().trim();
  // TA20_01, TA21_100, ADS23_01, ADS24_50
  return /^(TA|ADS)\d{2}_\d+$/i.test(str);
}

/**
 * Extract year from order number
 * TA20_01 → 2020
 * ADS23_01 → 2023
 */
export function extractYearFromOrderNo(no: string): number {
  if (!no) return 2020;
  const match = no.match(/^(?:TA|ADS)(\d{2})_/i);
  if (match) {
    return 2000 + parseInt(match[1], 10);
  }
  return 2020;
}

/**
 * Clean client name by removing source suffix
 * "Vasily S - BHW" → "Vasily S"
 * "Rockstar - SWAPD" → "Rockstar"
 */
export function cleanClientName(client: string | null): string {
  if (!client) return 'Unknown';

  // Remove common suffixes
  const suffixes = [' - BHW', ' - SWAPD', ' - bhw', ' - swapd'];
  let cleaned = client.trim();

  for (const suffix of suffixes) {
    if (cleaned.endsWith(suffix)) {
      cleaned = cleaned.slice(0, -suffix.length).trim();
      break;
    }
  }

  return cleaned || 'Unknown';
}

/**
 * Extract domain from URL for client_company
 * https://www.instagram.com/doreckstein/ → instagram.com/doreckstein
 */
export function extractDomain(url: string | null): string | null {
  if (!url) return null;

  try {
    // Handle URLs without protocol
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    const parsed = new URL(fullUrl);

    // Remove www. prefix and trailing slash
    let domain = parsed.hostname.replace(/^www\./, '');

    // Add pathname for social media profiles
    if (parsed.pathname && parsed.pathname !== '/') {
      domain += parsed.pathname.replace(/\/$/, '');
    }

    return domain;
  } catch {
    return url; // Return original if parsing fails
  }
}

/**
 * Map Excel status to system OrderStatus
 * Live → completed
 * Canceled → cancelled
 * Verified → completed
 * JKR → in_progress
 */
export function mapOrderStatus(status: string | null): OrderStatus {
  if (!status) return 'completed';

  const normalized = status.toLowerCase().trim();

  switch (normalized) {
    case 'live':
    case 'verified':
      return 'completed';
    case 'canceled':
    case 'cancelled':
      return 'cancelled';
    case 'jkr':
    case 'in progress':
    case 'in_progress':
      return 'in_progress';
    default:
      return 'completed';
  }
}

/**
 * Map Excel status to system OrderItemStatus
 * Live → live
 * Canceled → rejected
 */
export function mapItemStatus(status: string | null): OrderItemStatus {
  if (!status) return 'live';

  const normalized = status.toLowerCase().trim();

  switch (normalized) {
    case 'live':
    case 'verified':
      return 'live';
    case 'canceled':
    case 'cancelled':
      return 'rejected';
    case 'jkr':
    case 'pending':
      return 'pending';
    default:
      return 'live';
  }
}

/**
 * Map Excel status to processing_status
 */
export function mapProcessingStatus(status: string | null): string {
  if (!status) return 'published';

  const normalized = status.toLowerCase().trim();

  switch (normalized) {
    case 'live':
    case 'verified':
      return 'published';
    case 'canceled':
    case 'cancelled':
      return 'cancelled';
    case 'jkr':
      return 'pending';
    default:
      return 'published';
  }
}

/**
 * Parse price from various formats
 * 2700 → 2700
 * "535.5" → 535.5
 * "$3700" → 3700
 * "-" → 0
 */
export function parsePrice(price: number | string | null): number {
  if (price === null || price === undefined || price === '-' || price === '') {
    return 0;
  }

  if (typeof price === 'number') {
    return isNaN(price) ? 0 : price;
  }

  // Remove $ and commas, then parse
  const cleaned = price.toString().replace(/[$,]/g, '').trim();
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Convert Excel serial date to ISO string
 * Excel dates are days since 1899-12-30 (Windows) or 1904-01-01 (Mac)
 * 43890 → 2020-03-11
 * 43982 → 2020-06-12
 */
function excelDateToISO(serial: number): string {
  // Excel incorrectly treats 1900 as a leap year
  // Dates after Feb 28, 1900 need adjustment
  const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
  const date = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
  return date.toISOString().split('T')[0];
}

/**
 * Parse date from various formats
 * 2020-01-12 00:00:00 → 2020-01-12
 * 15/12/2020 → 2020-12-15
 * 22/12/20 → 2020-12-22
 * 43890 (Excel serial) → 2020-03-11
 */
export function parseDate(date: string | Date | number | null, month?: string, year?: number): string {
  const defaultYear = year || 2020;

  if (!date && date !== 0) {
    // Use month sheet name as fallback
    const monthMap: Record<string, string> = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'March': '03', 'April': '04', 'Apr': '04',
      'May': '05', 'June': '06', 'Jun': '06', 'July': '07', 'Aug': '08',
      'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    if (month && monthMap[month]) {
      return `${defaultYear}-${monthMap[month]}-01`;
    }
    return `${defaultYear}-01-01`;
  }

  // Handle Date object
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }

  // Handle Excel serial number (typically 5 digits like 43890)
  if (typeof date === 'number' && date > 30000 && date < 50000) {
    return excelDateToISO(date);
  }

  const dateStr = date.toString().trim();

  // Check if it's a numeric string (Excel serial)
  if (/^\d{5}$/.test(dateStr)) {
    return excelDateToISO(parseInt(dateStr, 10));
  }

  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.split(' ')[0].split('T')[0];
  }

  // DD/MM/YYYY format
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    const [day, monthNum, year] = dateStr.split('/');
    return `${year}-${monthNum.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // DD/MM/YY format
  if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(dateStr)) {
    const [day, monthNum, year] = dateStr.split('/');
    return `20${year}-${monthNum.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try parsing with Date
  try {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  } catch {
    // Ignore parsing errors
  }

  return `${defaultYear}-01-01`;
}

/**
 * Get order number from row, handling different column names
 * Supports: TA{YY}_{XXX} and ADS{YY}_{XXX} formats
 * Column names: "No", "Order No", "Order_No", or spaces
 */
function getOrderNumber(row: ExcelRow & Record<string, unknown>): string | null {
  // Check for valid order number pattern (TA or ADS prefix)
  const isOrderNo = (val: unknown): boolean => {
    if (!val || typeof val !== 'string') return false;
    return /^(TA|ADS)\d{2}_\d+$/i.test(val.trim());
  };

  // Try standard "No" column
  if (isOrderNo(row.No)) {
    return (row.No as string).trim();
  }

  // Try "Order No" column (2025 format)
  const orderNoKey = 'Order No';
  if (isOrderNo(row[orderNoKey])) {
    return (row[orderNoKey] as string).trim();
  }

  // Try column with spaces (June sheet)
  const spacesKey = '  ';
  if (isOrderNo(row[spacesKey])) {
    return (row[spacesKey] as string).trim();
  }

  // Try first column that looks like an order number
  for (const key of Object.keys(row)) {
    const val = row[key];
    if (isOrderNo(val)) {
      return (val as string).trim();
    }
  }

  return null;
}

/**
 * Group Excel rows by order number
 * Handles rows where order info is only on first row of group
 */
export function groupRowsByOrder(rows: (ExcelRow & Record<string, unknown>)[], sheetName: string): OrderGroup[] {
  const groups: OrderGroup[] = [];
  let currentGroup: OrderGroup | null = null;

  for (const row of rows) {
    // Skip completely empty rows
    if (!row.Publication && !row.Keywords && !row['Client URL']) {
      continue;
    }

    // Check if this is a new order (has order number)
    const orderNo = getOrderNumber(row);
    if (orderNo) {
      // Save previous group
      if (currentGroup) {
        groups.push(currentGroup);
      }

      // Start new group
      currentGroup = {
        orderNo: orderNo,
        client: row.Client || 'Unknown',
        date: row.Date || '',
        price: row.Price || 0,
        clientUrl: row['Client URL'] || '',
        rows: [row as ExcelRow]
      };
    } else if (currentGroup) {
      // Add to current group
      currentGroup.rows.push(row as ExcelRow);
    }
    // Skip rows before first order number
  }

  // Save last group
  if (currentGroup) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Transform an order group to system format
 */
export function transformOrderGroup(group: OrderGroup, sheetName: string, year?: number): TransformedOrder {
  const totalPrice = parsePrice(group.price);
  const itemCount = group.rows.length;
  const pricePerItem = itemCount > 0 ? Math.round((totalPrice / itemCount) * 100) / 100 : 0;

  // Extract year from order number if not provided
  const orderYear = year || extractYearFromOrderNo(group.orderNo);

  // Determine overall status from items
  const statuses = group.rows.map(r => r.Status?.toLowerCase().trim() || 'live');
  const hasAllLive = statuses.every(s => s === 'live' || s === 'verified' || s === 'completed');
  const hasAllCanceled = statuses.every(s => s === 'canceled' || s === 'cancelled');

  let orderStatus: OrderStatus = 'completed';
  let paymentStatus: PaymentStatus = 'paid';

  if (hasAllCanceled) {
    orderStatus = 'cancelled';
    paymentStatus = 'unpaid';
  } else if (!hasAllLive) {
    orderStatus = 'in_progress';
    paymentStatus = 'partial';
  }

  // Get first keyword as project name
  const firstKeyword = group.rows[0]?.Keywords || null;

  // Transform items
  const items: TransformedOrderItem[] = group.rows
    .filter(row => row.Publication) // Only rows with publication
    .map(row => ({
      website: row.Publication || '',
      keyword: row.Keywords || '',
      client_url: row['Client URL'] || group.clientUrl || '',
      price: pricePerItem,
      status: mapItemStatus(row.Status),
      live_url: row.Link || null,
      processing_status: mapProcessingStatus(row.Status)
    }));

  return {
    order_number: parseOrderNumber(group.orderNo),
    client_name: cleanClientName(group.client),
    client_email: null,
    client_company: extractDomain(group.clientUrl),
    project_name: firstKeyword,
    order_date: parseDate(group.date, sheetName, orderYear),
    due_date: null,
    total_amount: totalPrice,
    status: orderStatus,
    payment_status: paymentStatus,
    notes: `Imported from ${sheetName} ${orderYear}`,
    items
  };
}

/**
 * Transform all rows from a sheet
 */
export function transformSheet(rows: (ExcelRow & Record<string, unknown>)[], sheetName: string, year?: number): TransformedOrder[] {
  const groups = groupRowsByOrder(rows, sheetName);
  return groups.map(group => transformOrderGroup(group, sheetName, year));
}

/**
 * Validate transformed order
 */
export function validateOrder(order: TransformedOrder): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!order.order_number) {
    errors.push('Missing order number');
  }

  if (!order.client_name || order.client_name === 'Unknown') {
    errors.push('Missing client name');
  }

  if (order.items.length === 0) {
    errors.push('No items in order');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Month sheets to process (in order)
export const MONTH_SHEETS = ['Jan', 'Feb', 'Mar', 'April', 'May', 'June', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
