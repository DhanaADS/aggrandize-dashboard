/**
 * Processing Transformer
 * Transforms Excel data from Processing_2020.xlsx to update order_items
 */

// Processing Excel row interface
export interface ProcessingExcelRow {
  'S No'?: number | null;
  'Order_No'?: string | null;
  'Sub_Date'?: string | Date | number | null;
  'Blogger'?: string | null;
  'Client link'?: string | null;
  'Anchor text / Topic'?: string | null;
  'Publishing Site'?: string | null;
  'Payment'?: string | null;
  'Status'?: string | null;
  'Link'?: string | null;
}

// Transformed processing update
export interface ProcessingUpdate {
  order_number: string;        // AGG-2020-180
  original_order_no: string;   // TA20_180 (for debugging)
  website: string;             // Publishing Site (normalized)
  blogger_name: string | null;
  submission_date: string | null;
  processing_status: string;
  live_url: string | null;
  keyword: string | null;      // For matching fallback
  client_url: string | null;   // For matching fallback
}

// Month sheets to process (in order)
export const PROCESSING_MONTH_SHEETS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Parse order number from Excel format to system format
 * TA20_180 → AGG-2020-180
 */
export function parseOrderNumber(orderNo: string | null | undefined): string {
  if (!orderNo) return '';

  const str = String(orderNo).trim();

  // Extract year and number from formats like TA20_180
  const match = str.match(/TA(\d{2})_(\d+)/i);
  if (match) {
    const year = `20${match[1]}`;
    const num = match[2].padStart(3, '0');
    return `AGG-${year}-${num}`;
  }

  return str;
}

/**
 * Normalize website name for matching
 * "Tgdaily - F" → "tgdaily"
 * "TimeBulletin - F" → "timebulletin"
 * "Londondailypost.com" → "londondailypost"
 */
export function normalizeWebsite(site: string | null | undefined): string {
  if (!site) return '';

  return site
    .toLowerCase()
    .replace(/\s*-\s*[a-z]$/i, '')  // Remove " - F" suffix
    .replace(/\.com$/i, '')          // Remove .com
    .replace(/\.org$/i, '')          // Remove .org
    .replace(/\.net$/i, '')          // Remove .net
    .replace(/[^a-z0-9]/g, '')       // Remove non-alphanumeric
    .trim();
}

/**
 * Map Excel status to system processing_status
 * Completed/Live/Paid → published
 * Hold/Assigned → in_progress
 * WFA/Submitted → pending_approval
 * Rejected → not_started
 * Edit → content_writing
 */
export function mapProcessingStatus(status: string | null | undefined, payment: string | null | undefined): string {
  if (!status) {
    // If no status but payment is "Paid", consider published
    if (payment && payment.toLowerCase() === 'paid') {
      return 'published';
    }
    return 'not_started';
  }

  const normalized = status.toLowerCase().trim();

  switch (normalized) {
    case 'completed':
    case 'live':
    case 'paid':
      return 'published';
    case 'hold':
    case 'assigned':
      return 'in_progress';
    case 'wfa':
    case 'submitted':
      return 'pending_approval';
    case 'edit':
      return 'content_writing';
    case 'rejected':
      return 'not_started';
    default:
      // If payment is "Paid", consider published
      if (payment && payment.toLowerCase() === 'paid') {
        return 'published';
      }
      return 'in_progress';
  }
}

/**
 * Convert Excel serial date to ISO string
 * Excel dates are days since 1899-12-30
 */
function excelDateToISO(serial: number): string {
  const excelEpoch = new Date(1899, 11, 30);
  const date = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
  return date.toISOString().split('T')[0];
}

/**
 * Parse submission date from various formats
 * 2020-12-04 → 2020-12-04
 * 44169 (Excel serial) → 2020-12-04
 * Date object → 2020-12-04
 */
export function parseSubmissionDate(date: string | Date | number | null | undefined, month?: string): string | null {
  if (date === null || date === undefined || date === '') {
    return null;
  }

  // Handle Date object
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }

  // Handle Excel serial number (typically 5 digits like 44169)
  if (typeof date === 'number' && date > 30000 && date < 50000) {
    return excelDateToISO(date);
  }

  const dateStr = String(date).trim();

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

  return null;
}

/**
 * Clean blogger name
 */
export function cleanBloggerName(blogger: string | null | undefined): string | null {
  if (!blogger) return null;

  const name = String(blogger).trim();
  if (!name || name.toLowerCase() === 'nan' || name === '-') {
    return null;
  }

  return name;
}

/**
 * Clean URL (live link)
 */
export function cleanUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  const cleaned = String(url).trim();
  if (!cleaned || cleaned.toLowerCase() === 'nan' || cleaned === '-' || cleaned === '#') {
    return null;
  }

  // Ensure URL starts with http
  if (cleaned && !cleaned.startsWith('http')) {
    return `https://${cleaned}`;
  }

  return cleaned;
}

/**
 * Transform a single Excel row to ProcessingUpdate
 */
export function transformProcessingRow(row: ProcessingExcelRow & Record<string, unknown>, sheetName: string): ProcessingUpdate | null {
  // Get order number from row
  const orderNo = row['Order_No'] || row['Order No'] || (row as Record<string, unknown>)['Order_No'];
  if (!orderNo) {
    return null;
  }

  const orderNoStr = String(orderNo).trim();
  if (!orderNoStr || !orderNoStr.startsWith('TA')) {
    return null;
  }

  // Get publishing site
  const site = row['Publishing Site'] || row['Publication'] || '';
  const siteStr = String(site).trim();
  if (!siteStr) {
    return null;
  }

  return {
    order_number: parseOrderNumber(orderNoStr),
    original_order_no: orderNoStr,
    website: siteStr,
    blogger_name: cleanBloggerName(row['Blogger']),
    submission_date: parseSubmissionDate(row['Sub_Date'], sheetName),
    processing_status: mapProcessingStatus(row['Status'], row['Payment']),
    live_url: cleanUrl(row['Link']),
    keyword: row['Anchor text / Topic'] ? String(row['Anchor text / Topic']).trim() : null,
    client_url: row['Client link'] ? String(row['Client link']).trim() : null,
  };
}

/**
 * Transform all rows from a sheet
 */
export function transformProcessingSheet(rows: (ProcessingExcelRow & Record<string, unknown>)[], sheetName: string): ProcessingUpdate[] {
  const updates: ProcessingUpdate[] = [];

  for (const row of rows) {
    const update = transformProcessingRow(row, sheetName);
    if (update) {
      updates.push(update);
    }
  }

  return updates;
}

/**
 * Match website names (fuzzy matching)
 * Returns true if the two websites likely refer to the same publication
 */
export function matchWebsite(excelSite: string, dbWebsite: string): boolean {
  const a = normalizeWebsite(excelSite);
  const b = normalizeWebsite(dbWebsite);

  if (!a || !b) return false;

  // Exact match after normalization
  if (a === b) return true;

  // One contains the other
  if (a.includes(b) || b.includes(a)) return true;

  // Check if one starts with the other (for partial names)
  if (a.length >= 4 && b.length >= 4) {
    const minLen = Math.min(a.length, b.length, 8);
    if (a.substring(0, minLen) === b.substring(0, minLen)) {
      return true;
    }
  }

  return false;
}

/**
 * Validate processing update
 */
export function validateProcessingUpdate(update: ProcessingUpdate): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!update.order_number) {
    errors.push('Missing order number');
  }

  if (!update.website) {
    errors.push('Missing website');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
