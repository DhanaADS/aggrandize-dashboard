#!/usr/bin/env npx ts-node

/**
 * Import Processing Data from Processing_2020.xlsx
 * Updates existing order_items with processing information
 *
 * Usage:
 *   UMBREL_CONNECTION_MODE=api UMBREL_API_KEY=xxx UMBREL_ADMIN_KEY=xxx npx ts-node scripts/import-processing-2020.ts
 *
 * Options:
 *   --dry-run     Preview without updating
 *   --month=Jan   Import only specific month
 *   --verbose     Show detailed logs
 */

import * as XLSX from 'xlsx';
import {
  ProcessingExcelRow,
  ProcessingUpdate,
  PROCESSING_MONTH_SHEETS,
  transformProcessingSheet,
  validateProcessingUpdate,
  matchWebsite,
  normalizeWebsite,
} from '../src/lib/import/processing-transformer';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerbose = args.includes('--verbose');
const monthArg = args.find(a => a.startsWith('--month='))?.split('=')[1];

// Excel file path
const EXCEL_FILE = '/Users/dhanapale/Downloads/Processing_2020.xlsx';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logVerbose(message: string) {
  if (isVerbose) {
    console.log(`${colors.dim}  ${message}${colors.reset}`);
  }
}

// Delay function to avoid rate limiting
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Query functions
async function query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
  const apiUrl = process.env.UMBREL_API_URL || 'https://api.aggrandizedigital.com';
  const apiKey = process.env.UMBREL_API_KEY || '';
  const adminKey = process.env.UMBREL_ADMIN_KEY || '';

  if (!apiKey) {
    throw new Error('UMBREL_API_KEY is required');
  }

  const response = await fetch(`${apiUrl}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      'X-ADMIN-KEY': adminKey,
    },
    body: JSON.stringify({ sql: text, params: params || [] }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Query failed: ${response.status} ${errorText}`);
  }

  const data = await response.json() as { rows: Record<string, unknown>[]; rowCount: number };
  return data;
}

// Query with retry logic for rate limiting
async function queryWithRetry(text: string, params?: unknown[], maxRetries = 5): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await query(text, params);
    } catch (error) {
      const errorMsg = (error as Error).message || '';
      if (errorMsg.includes('429') && attempt < maxRetries) {
        const waitTime = attempt * 3000;
        logVerbose(`Rate limited, waiting ${waitTime / 1000}s before retry ${attempt + 1}...`);
        await delay(waitTime);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

// Order item from database
interface OrderItemRecord {
  id: string;
  order_id: string;
  website: string;
  keyword: string;
  client_url: string;
  order_number: string;
}

// Cache for order items to speed up matching
let orderItemsCache: OrderItemRecord[] | null = null;

// Load all order items for matching
async function loadOrderItems(): Promise<OrderItemRecord[]> {
  if (orderItemsCache) {
    return orderItemsCache;
  }

  log('Loading order items from database...', colors.dim);

  const result = await queryWithRetry(`
    SELECT oi.id, oi.order_id, oi.website, oi.keyword, oi.client_url, o.order_number
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.order_number LIKE 'AGG-2020-%'
    ORDER BY o.order_number, oi.website
  `);

  orderItemsCache = result.rows as unknown as OrderItemRecord[];
  log(`Loaded ${orderItemsCache.length} order items`, colors.dim);

  return orderItemsCache;
}

// Find matching order item
async function findMatchingOrderItem(update: ProcessingUpdate): Promise<OrderItemRecord | null> {
  const items = await loadOrderItems();

  // Filter by order number first
  const orderItems = items.filter(item => item.order_number === update.order_number);

  if (orderItems.length === 0) {
    return null;
  }

  // Try to match by website
  for (const item of orderItems) {
    if (matchWebsite(update.website, item.website)) {
      return item;
    }
  }

  // Fallback: Try to match by keyword if provided
  if (update.keyword) {
    const keywordNormalized = update.keyword.toLowerCase().trim();
    for (const item of orderItems) {
      if (item.keyword && item.keyword.toLowerCase().trim() === keywordNormalized) {
        return item;
      }
    }
  }

  // If only one item for this order, assume it's the match
  if (orderItems.length === 1) {
    logVerbose(`Single item match for ${update.order_number}: ${orderItems[0].website} ≈ ${update.website}`);
    return orderItems[0];
  }

  return null;
}

// Update order item with processing data
async function updateOrderItem(itemId: string, update: ProcessingUpdate): Promise<boolean> {
  try {
    await delay(50); // Small delay before update

    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Add fields that have values
    if (update.blogger_name) {
      updates.push(`blogger_name = $${paramIndex++}`);
      params.push(update.blogger_name);
    }

    if (update.submission_date) {
      updates.push(`submission_date = $${paramIndex++}`);
      params.push(update.submission_date);
    }

    if (update.processing_status) {
      updates.push(`processing_status = $${paramIndex++}`);
      params.push(update.processing_status);
    }

    if (update.live_url) {
      updates.push(`live_url = $${paramIndex++}`);
      params.push(update.live_url);
    }

    if (updates.length === 0) {
      return false;
    }

    // Add item ID
    params.push(itemId);

    const sql = `UPDATE order_items SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`;

    await queryWithRetry(sql, params);
    return true;
  } catch (error) {
    console.error(`Error updating item ${itemId}:`, error);
    return false;
  }
}

// Main import function
async function importProcessing() {
  log('\n========================================', colors.cyan);
  log('  AGGRANDIZE Processing Import Script', colors.cyan);
  log('  File: Processing_2020.xlsx', colors.cyan);
  log('========================================\n', colors.cyan);

  if (isDryRun) {
    log('[DRY RUN MODE] No data will be updated\n', colors.yellow);
  }

  // Read Excel file
  log(`Reading Excel file: ${EXCEL_FILE}`, colors.dim);
  const workbook = XLSX.readFile(EXCEL_FILE);

  // Determine which sheets to process
  const sheetsToProcess = monthArg
    ? PROCESSING_MONTH_SHEETS.filter(s => s.toLowerCase() === monthArg.toLowerCase())
    : PROCESSING_MONTH_SHEETS;

  if (sheetsToProcess.length === 0) {
    log(`Month "${monthArg}" not found. Available: ${PROCESSING_MONTH_SHEETS.join(', ')}`, colors.red);
    return;
  }

  // Pre-load order items cache
  await loadOrderItems();

  let totalRecords = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalUnmatched = 0;
  let totalErrors = 0;

  const summary: { month: string; records: number; updated: number; skipped: number; unmatched: number; errors: number }[] = [];
  const unmatchedRecords: { month: string; order: string; website: string }[] = [];

  // Process each month
  for (const sheetName of sheetsToProcess) {
    if (!workbook.SheetNames.includes(sheetName)) {
      log(`Sheet "${sheetName}" not found, skipping`, colors.yellow);
      continue;
    }

    log(`\nProcessing ${sheetName}...`, colors.cyan);

    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<ProcessingExcelRow & Record<string, unknown>>(worksheet);

    // Transform rows to updates
    const updates = transformProcessingSheet(rows, sheetName);

    let monthUpdated = 0;
    let monthSkipped = 0;
    let monthUnmatched = 0;
    let monthErrors = 0;

    for (const update of updates) {
      const validation = validateProcessingUpdate(update);

      if (!validation.valid) {
        logVerbose(`Skipping invalid record: ${validation.errors.join(', ')}`);
        monthSkipped++;
        continue;
      }

      // Find matching order item
      const matchingItem = await findMatchingOrderItem(update);

      if (!matchingItem) {
        logVerbose(`No match: ${update.order_number} / ${update.website}`);
        monthUnmatched++;
        unmatchedRecords.push({
          month: sheetName,
          order: update.original_order_no,
          website: update.website
        });
        continue;
      }

      if (isDryRun) {
        logVerbose(`[DRY] Would update: ${update.order_number} / ${matchingItem.website} → ${update.processing_status}`);
        monthUpdated++;
      } else {
        const success = await updateOrderItem(matchingItem.id, update);
        if (success) {
          logVerbose(`Updated: ${update.order_number} / ${matchingItem.website}`);
          monthUpdated++;
        } else {
          monthErrors++;
        }
        // Add delay to avoid rate limiting
        await delay(100);
      }
    }

    summary.push({
      month: sheetName,
      records: updates.length,
      updated: monthUpdated,
      skipped: monthSkipped,
      unmatched: monthUnmatched,
      errors: monthErrors,
    });

    totalRecords += updates.length;
    totalUpdated += monthUpdated;
    totalSkipped += monthSkipped;
    totalUnmatched += monthUnmatched;
    totalErrors += monthErrors;

    log(`  ${sheetName}: ${monthUpdated}/${updates.length} updated, ${monthUnmatched} unmatched`,
      monthErrors > 0 ? colors.yellow : colors.green);
  }

  // Print summary
  log('\n========================================', colors.cyan);
  log('  Import Summary', colors.cyan);
  log('========================================\n', colors.cyan);

  console.log('Month      | Records | Updated | Skipped | Unmatched | Errors');
  console.log('-----------|---------|---------|---------|-----------|-------');
  for (const s of summary) {
    console.log(
      `${s.month.padEnd(10)} | ${String(s.records).padStart(7)} | ${String(s.updated).padStart(7)} | ${String(s.skipped).padStart(7)} | ${String(s.unmatched).padStart(9)} | ${String(s.errors).padStart(6)}`
    );
  }
  console.log('-----------|---------|---------|---------|-----------|-------');
  console.log(
    `${'TOTAL'.padEnd(10)} | ${String(totalRecords).padStart(7)} | ${String(totalUpdated).padStart(7)} | ${String(totalSkipped).padStart(7)} | ${String(totalUnmatched).padStart(9)} | ${String(totalErrors).padStart(6)}`
  );

  // Show unmatched records if verbose
  if (isVerbose && unmatchedRecords.length > 0) {
    log('\nUnmatched Records:', colors.yellow);
    for (const record of unmatchedRecords.slice(0, 20)) {
      console.log(`  ${record.order} / ${record.website} (${record.month})`);
    }
    if (unmatchedRecords.length > 20) {
      console.log(`  ... and ${unmatchedRecords.length - 20} more`);
    }
  }

  log('\n', colors.reset);
  if (isDryRun) {
    log('This was a DRY RUN. Run without --dry-run to actually update.', colors.yellow);
  } else {
    log(`Import complete! ${totalUpdated} order items updated.`, colors.green);
  }

  // Match rate
  const matchRate = totalRecords > 0 ? Math.round((totalUpdated / totalRecords) * 100) : 0;
  log(`Match rate: ${matchRate}% (${totalUpdated}/${totalRecords})`, matchRate >= 80 ? colors.green : colors.yellow);
}

// Run the import
importProcessing().catch(error => {
  console.error('Import failed:', error);
  process.exit(1);
});
