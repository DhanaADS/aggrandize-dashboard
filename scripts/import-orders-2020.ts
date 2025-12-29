#!/usr/bin/env npx ts-node

/**
 * Import Historical Orders from ADS_orders_2020.xlsx
 *
 * Usage:
 *   UMBREL_CONNECTION_MODE=api UMBREL_API_KEY=xxx UMBREL_ADMIN_KEY=xxx npx ts-node scripts/import-orders-2020.ts
 *
 * Options:
 *   --dry-run     Preview without inserting
 *   --month=Jan   Import only specific month
 *   --verbose     Show detailed logs
 */

import * as XLSX from 'xlsx';
import * as path from 'path';
import {
  ExcelRow,
  TransformedOrder,
  MONTH_SHEETS,
  transformSheet,
  validateOrder,
} from '../src/lib/import/orders-transformer';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerbose = args.includes('--verbose');
const monthArg = args.find(a => a.startsWith('--month='))?.split('=')[1];

// Excel file path
const EXCEL_FILE = '/Users/dhanapale/Downloads/ADS_orders_2020.xlsx';

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

// Query functions (inline to avoid import issues in script)
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
        // Rate limited - exponential backoff
        const waitTime = attempt * 3000; // 3s, 6s, 9s, 12s
        logVerbose(`Rate limited, waiting ${waitTime / 1000}s before retry ${attempt + 1}...`);
        await delay(waitTime);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

// Check if order already exists (with retry)
async function orderExists(orderNumber: string): Promise<boolean> {
  const result = await queryWithRetry(
    'SELECT id FROM orders WHERE order_number = $1',
    [orderNumber]
  );
  return result.rows.length > 0;
}

// Insert order with custom order number
async function insertOrder(order: TransformedOrder): Promise<string | null> {
  try {
    // Check if already exists
    if (await orderExists(order.order_number)) {
      logVerbose(`Order ${order.order_number} already exists, skipping`);
      return null;
    }

    await delay(100); // Small delay before insert

    // Insert order
    const orderResult = await queryWithRetry(
      `INSERT INTO orders (
        order_number, client_name, client_email, client_company,
        project_name, order_date, due_date,
        subtotal, discount, total_amount, amount_paid, balance_due,
        status, payment_status, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id`,
      [
        order.order_number,
        order.client_name,
        order.client_email,
        order.client_company,
        order.project_name,
        order.order_date,
        order.due_date,
        order.total_amount, // subtotal
        0, // discount
        order.total_amount,
        order.payment_status === 'paid' ? order.total_amount : 0, // amount_paid
        order.payment_status === 'paid' ? 0 : order.total_amount, // balance_due
        order.status,
        order.payment_status,
        order.notes,
        'import-script',
      ]
    );

    const orderId = orderResult.rows[0]?.id as string | undefined;
    if (!orderId) {
      throw new Error('Failed to get order ID');
    }

    // Insert order items with delay between each
    for (const item of order.items) {
      await delay(50); // 50ms delay between items
      await queryWithRetry(
        `INSERT INTO order_items (
          order_id, website, keyword, client_url, price,
          status, live_url, processing_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          orderId,
          item.website,
          item.keyword,
          item.client_url,
          item.price,
          item.status,
          item.live_url,
          item.processing_status,
        ]
      );
    }

    return orderId;
  } catch (error) {
    console.error(`Error inserting order ${order.order_number}:`, error);
    return null;
  }
}

// Main import function
async function importOrders() {
  log('\n========================================', colors.cyan);
  log('  AGGRANDIZE Order Import Script', colors.cyan);
  log('  File: ADS_orders_2020.xlsx', colors.cyan);
  log('========================================\n', colors.cyan);

  if (isDryRun) {
    log('[DRY RUN MODE] No data will be inserted\n', colors.yellow);
  }

  // Read Excel file
  log(`Reading Excel file: ${EXCEL_FILE}`, colors.dim);
  const workbook = XLSX.readFile(EXCEL_FILE);

  // Determine which sheets to process
  const sheetsToProcess = monthArg
    ? MONTH_SHEETS.filter(s => s.toLowerCase() === monthArg.toLowerCase())
    : MONTH_SHEETS;

  if (sheetsToProcess.length === 0) {
    log(`Month "${monthArg}" not found. Available: ${MONTH_SHEETS.join(', ')}`, colors.red);
    return;
  }

  let totalOrders = 0;
  let totalItems = 0;
  let importedOrders = 0;
  let skippedOrders = 0;
  let errorOrders = 0;

  const summary: { month: string; orders: number; items: number; imported: number; skipped: number; errors: number }[] = [];

  // Process each month
  for (const sheetName of sheetsToProcess) {
    if (!workbook.SheetNames.includes(sheetName)) {
      log(`Sheet "${sheetName}" not found, skipping`, colors.yellow);
      continue;
    }

    log(`\nProcessing ${sheetName}...`, colors.cyan);

    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<ExcelRow & Record<string, unknown>>(worksheet);

    // Transform rows to orders
    const orders = transformSheet(rows, sheetName);

    let monthImported = 0;
    let monthSkipped = 0;
    let monthErrors = 0;
    let monthItems = 0;

    for (const order of orders) {
      const validation = validateOrder(order);

      if (!validation.valid) {
        logVerbose(`Skipping invalid order: ${validation.errors.join(', ')}`);
        monthSkipped++;
        continue;
      }

      monthItems += order.items.length;

      if (isDryRun) {
        logVerbose(`[DRY] Would import: ${order.order_number} - ${order.client_name} (${order.items.length} items, $${order.total_amount})`);
        monthImported++;
      } else {
        const orderId = await insertOrder(order);
        if (orderId) {
          logVerbose(`Imported: ${order.order_number} - ${order.client_name}`);
          monthImported++;
        } else if (await orderExists(order.order_number)) {
          monthSkipped++;
        } else {
          monthErrors++;
        }
        // Add delay to avoid rate limiting (500ms between orders)
        await delay(500);
      }
    }

    summary.push({
      month: sheetName,
      orders: orders.length,
      items: monthItems,
      imported: monthImported,
      skipped: monthSkipped,
      errors: monthErrors,
    });

    totalOrders += orders.length;
    totalItems += monthItems;
    importedOrders += monthImported;
    skippedOrders += monthSkipped;
    errorOrders += monthErrors;

    log(`  ${sheetName}: ${monthImported}/${orders.length} orders, ${monthItems} items`,
      monthErrors > 0 ? colors.yellow : colors.green);
  }

  // Print summary
  log('\n========================================', colors.cyan);
  log('  Import Summary', colors.cyan);
  log('========================================\n', colors.cyan);

  console.log('Month      | Orders | Items | Imported | Skipped | Errors');
  console.log('-----------|--------|-------|----------|---------|-------');
  for (const s of summary) {
    console.log(
      `${s.month.padEnd(10)} | ${String(s.orders).padStart(6)} | ${String(s.items).padStart(5)} | ${String(s.imported).padStart(8)} | ${String(s.skipped).padStart(7)} | ${String(s.errors).padStart(6)}`
    );
  }
  console.log('-----------|--------|-------|----------|---------|-------');
  console.log(
    `${'TOTAL'.padEnd(10)} | ${String(totalOrders).padStart(6)} | ${String(totalItems).padStart(5)} | ${String(importedOrders).padStart(8)} | ${String(skippedOrders).padStart(7)} | ${String(errorOrders).padStart(6)}`
  );

  log('\n', colors.reset);
  if (isDryRun) {
    log('This was a DRY RUN. Run without --dry-run to actually import.', colors.yellow);
  } else {
    log(`Import complete! ${importedOrders} orders imported.`, colors.green);
  }
}

// Run the import
importOrders().catch(error => {
  console.error('Import failed:', error);
  process.exit(1);
});
