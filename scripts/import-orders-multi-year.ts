#!/usr/bin/env npx ts-node

/**
 * Multi-Year Orders Import Script
 * Imports orders from 2021-2025 Excel files
 *
 * Usage:
 *   UMBREL_API_KEY=xxx UMBREL_ADMIN_KEY=xxx npx ts-node scripts/import-orders-multi-year.ts --year=2021
 *   UMBREL_API_KEY=xxx UMBREL_ADMIN_KEY=xxx npx ts-node scripts/import-orders-multi-year.ts --all
 *
 * Options:
 *   --year=YYYY    Import specific year
 *   --all          Import all years (2021-2025)
 *   --dry-run      Preview without importing
 *   --verbose      Show detailed logs
 */

import * as XLSX from 'xlsx';
import {
  ExcelRow,
  TransformedOrder,
  groupRowsByOrder,
  transformOrderGroup,
  validateOrder,
  parsePrice,
  cleanClientName,
  extractDomain,
  mapOrderStatus,
  mapItemStatus,
  mapProcessingStatus,
  parseDate,
} from '../src/lib/import/orders-transformer';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerbose = args.includes('--verbose');
const importAll = args.includes('--all');
const yearArg = args.find(a => a.startsWith('--year='))?.split('=')[1];

// Year configurations
interface YearConfig {
  year: number;
  file: string;
  sheets: string[];
  format: 'legacy' | 'new' | 'quarterly';
  orderPrefix: string;
}

const YEAR_CONFIGS: YearConfig[] = [
  {
    year: 2021,
    file: '/Users/dhanapale/Downloads/Orders-2021.xlsx',
    sheets: ['Jan', 'Feb', 'March', 'April', 'May', 'June', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    format: 'legacy',
    orderPrefix: 'ADS21_'
  },
  {
    year: 2022,
    file: '/Users/dhanapale/Downloads/Orders-2022.xlsx',
    sheets: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    format: 'legacy',
    orderPrefix: 'ADS22_'
  },
  {
    year: 2023,
    file: '/Users/dhanapale/Downloads/Orders-2023.xlsx',
    sheets: ['Jan', 'Feb', 'March', 'Apr', 'May', 'Jun', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    format: 'new',
    orderPrefix: 'ADS23_'
  },
  {
    year: 2024,
    file: '/Users/dhanapale/Downloads/Orders-2024.xlsx',
    sheets: ['Jan', 'Feb', 'March', 'April', 'May', 'June', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    format: 'new',
    orderPrefix: 'ADS24_'
  },
  {
    year: 2025,
    file: '/Users/dhanapale/Downloads/Orders-2025.xlsx',
    sheets: ['Q1 & Q2', 'Q3 & Q4'],
    format: 'quarterly',
    orderPrefix: 'ADS25_'
  }
];

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

// Query function
async function query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
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
    body: JSON.stringify({ sql, params: params || [] }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Query failed: ${response.status} ${errorText}`);
  }

  return response.json() as Promise<{ rows: Record<string, unknown>[]; rowCount: number }>;
}

// Query with retry logic
async function queryWithRetry(sql: string, params?: unknown[], maxRetries = 5): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await query(sql, params);
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

// Transform row based on format
function transformRowByFormat(row: Record<string, unknown>, format: 'legacy' | 'new' | 'quarterly'): ExcelRow {
  if (format === 'legacy') {
    // 2020-2022 format: No, Date, Client, Client URL, Keywords, Publication, Price, Status, Link
    return {
      No: row['No'] as string | null,
      Date: row['Date'] as string | Date | null,
      Client: row['Client'] as string | null,
      'Client URL': row['Client URL'] as string | null,
      Keywords: row['Keywords'] as string | null,
      Publication: row['Publication'] as string | null,
      Price: row['Price'] as number | string | null,
      Status: row['Status'] as string | null,
      Link: row['Link'] as string | null,
    };
  } else if (format === 'new') {
    // 2023-2024 format: No, Date, Client, URL, Details, Project, Price, Status, Link
    return {
      No: row['No'] as string | null,
      Date: row['Date'] as string | Date | null,
      Client: row['Client'] as string | null,
      'Client URL': row['URL'] as string | null,
      Keywords: row['Details'] as string | null,
      Publication: row['Project'] as string | null,
      Price: row['Price'] as number | string | null,
      Status: row['Status'] as string | null,
      Link: row['Link'] as string | null,
    };
  } else {
    // 2025 quarterly format: Month, Order No, Date, Client, Project, URL, Details, Price, Status, Link
    return {
      No: row['Order No'] as string | null,
      Date: row['Date'] as string | Date | null,
      Client: row['Client'] as string | null,
      'Client URL': row['URL'] as string | null,
      Keywords: row['Details'] as string | null,
      Publication: row['Project'] as string | null,
      Price: row['Price'] as number | string | null,
      Status: row['Status'] as string | null,
      Link: row['Link'] as string | null,
    };
  }
}

// Insert order into database
async function insertOrder(order: TransformedOrder): Promise<string | null> {
  try {
    await delay(200); // Delay before checking

    // Check if order already exists
    const existingResult = await queryWithRetry(
      'SELECT id FROM orders WHERE order_number = $1',
      [order.order_number]
    );

    if (existingResult.rows.length > 0) {
      logVerbose(`Order ${order.order_number} already exists, skipping`);
      return null;
    }

    await delay(200); // Delay before insert

    // Insert order
    const orderResult = await queryWithRetry(`
      INSERT INTO orders (
        order_number, client_name, client_email, client_company, project_name,
        order_date, due_date, total_amount, status, payment_status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `, [
      order.order_number,
      order.client_name,
      order.client_email,
      order.client_company,
      order.project_name,
      order.order_date,
      order.due_date,
      order.total_amount,
      order.status,
      order.payment_status,
      order.notes,
    ]);

    const orderId = orderResult.rows[0]?.id as string;
    if (!orderId) {
      throw new Error('Failed to get order ID');
    }

    // Insert order items with longer delays
    for (const item of order.items) {
      await delay(150); // Longer delay between items
      await queryWithRetry(`
        INSERT INTO order_items (
          order_id, website, keyword, client_url, price, status, live_url, processing_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        orderId,
        item.website,
        item.keyword,
        item.client_url,
        item.price,
        item.status,
        item.live_url,
        item.processing_status,
      ]);
    }

    return orderId;
  } catch (error) {
    console.error(`Error inserting order ${order.order_number}:`, error);
    return null;
  }
}

// Import a single year
async function importYear(config: YearConfig): Promise<{ orders: number; items: number; skipped: number; errors: number }> {
  log(`\n=== Importing ${config.year} ===`, colors.cyan);
  log(`File: ${config.file}`, colors.dim);
  log(`Format: ${config.format}`, colors.dim);

  let totalOrders = 0;
  let totalItems = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  try {
    const workbook = XLSX.readFile(config.file);

    for (const sheetName of config.sheets) {
      if (!workbook.SheetNames.includes(sheetName)) {
        log(`  Sheet "${sheetName}" not found, skipping`, colors.yellow);
        continue;
      }

      const worksheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

      // Transform rows to standard format
      const rows = rawRows.map(row => transformRowByFormat(row, config.format));

      // Group and transform
      const groups = groupRowsByOrder(rows as (ExcelRow & Record<string, unknown>)[], sheetName);
      const orders = groups.map(group => transformOrderGroup(group, sheetName, config.year));

      log(`  ${sheetName}: ${orders.length} orders`, colors.dim);

      for (const order of orders) {
        const validation = validateOrder(order);
        if (!validation.valid) {
          logVerbose(`  Skipping invalid: ${order.order_number} - ${validation.errors.join(', ')}`);
          totalSkipped++;
          continue;
        }

        if (isDryRun) {
          logVerbose(`  [DRY] Would import: ${order.order_number} - ${order.client_name} (${order.items.length} items)`);
          totalOrders++;
          totalItems += order.items.length;
        } else {
          const orderId = await insertOrder(order);
          if (orderId) {
            logVerbose(`  Imported: ${order.order_number} (${order.items.length} items)`);
            totalOrders++;
            totalItems += order.items.length;
          } else {
            totalSkipped++;
          }
          await delay(300); // Longer delay between orders
        }
      }

      // Delay between sheets
      await delay(1000);
    }
  } catch (error) {
    log(`Error reading ${config.file}: ${(error as Error).message}`, colors.red);
    totalErrors++;
  }

  return { orders: totalOrders, items: totalItems, skipped: totalSkipped, errors: totalErrors };
}

// Main function
async function main() {
  log('\n========================================', colors.cyan);
  log('  AGGRANDIZE Multi-Year Orders Import', colors.cyan);
  log('========================================\n', colors.cyan);

  if (isDryRun) {
    log('[DRY RUN MODE] No data will be imported\n', colors.yellow);
  }

  // Determine which years to import
  let yearsToImport: YearConfig[] = [];

  if (importAll) {
    yearsToImport = YEAR_CONFIGS;
    log('Importing all years: 2021, 2022, 2023, 2024, 2025\n', colors.dim);
  } else if (yearArg) {
    const year = parseInt(yearArg, 10);
    const config = YEAR_CONFIGS.find(c => c.year === year);
    if (config) {
      yearsToImport = [config];
    } else {
      log(`Year ${yearArg} not found. Available: 2021, 2022, 2023, 2024, 2025`, colors.red);
      return;
    }
  } else {
    log('Usage: npx ts-node scripts/import-orders-multi-year.ts --year=2021', colors.yellow);
    log('       npx ts-node scripts/import-orders-multi-year.ts --all', colors.yellow);
    log('', colors.reset);
    log('Available years: 2021, 2022, 2023, 2024, 2025', colors.dim);
    return;
  }

  // Import each year
  const results: { year: number; orders: number; items: number; skipped: number; errors: number }[] = [];

  for (const config of yearsToImport) {
    const result = await importYear(config);
    results.push({ year: config.year, ...result });
  }

  // Print summary
  log('\n========================================', colors.cyan);
  log('  Import Summary', colors.cyan);
  log('========================================\n', colors.cyan);

  console.log('Year   | Orders | Items  | Skipped | Errors');
  console.log('-------|--------|--------|---------|-------');

  let grandTotalOrders = 0;
  let grandTotalItems = 0;
  let grandTotalSkipped = 0;
  let grandTotalErrors = 0;

  for (const r of results) {
    console.log(
      `${r.year}   | ${String(r.orders).padStart(6)} | ${String(r.items).padStart(6)} | ${String(r.skipped).padStart(7)} | ${String(r.errors).padStart(6)}`
    );
    grandTotalOrders += r.orders;
    grandTotalItems += r.items;
    grandTotalSkipped += r.skipped;
    grandTotalErrors += r.errors;
  }

  console.log('-------|--------|--------|---------|-------');
  console.log(
    `TOTAL  | ${String(grandTotalOrders).padStart(6)} | ${String(grandTotalItems).padStart(6)} | ${String(grandTotalSkipped).padStart(7)} | ${String(grandTotalErrors).padStart(6)}`
  );

  log('\n', colors.reset);
  if (isDryRun) {
    log('This was a DRY RUN. Run without --dry-run to actually import.', colors.yellow);
  } else {
    log(`Import complete! ${grandTotalOrders} orders with ${grandTotalItems} items imported.`, colors.green);
  }
}

// Run
main().catch(error => {
  console.error('Import failed:', error);
  process.exit(1);
});
