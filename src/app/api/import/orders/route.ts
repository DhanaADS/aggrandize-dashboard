import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { query } from '@/lib/umbrel/query-wrapper';
import {
  ExcelRow,
  TransformedOrder,
  MONTH_SHEETS,
  transformSheet,
  validateOrder,
} from '@/lib/import/orders-transformer';

// Delay function for rate limiting
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if order exists
async function orderExists(orderNumber: string): Promise<boolean> {
  const result = await query(
    'SELECT id FROM orders WHERE order_number = $1',
    [orderNumber]
  );
  return (result.rows?.length ?? 0) > 0;
}

// Insert a single order with its items
async function insertOrder(order: TransformedOrder): Promise<string | null> {
  try {
    // Check if already exists
    if (await orderExists(order.order_number)) {
      return null; // Skip existing
    }

    // Insert order
    const orderResult = await query(
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
        order.total_amount,
        0,
        order.total_amount,
        order.payment_status === 'paid' ? order.total_amount : 0,
        order.payment_status === 'paid' ? 0 : order.total_amount,
        order.status,
        order.payment_status,
        order.notes,
        'import-ui',
      ]
    );

    const orderId = orderResult.rows?.[0]?.id as string | undefined;
    if (!orderId) {
      throw new Error('Failed to get order ID');
    }

    // Insert order items
    for (const item of order.items) {
      await delay(30); // Small delay between items
      await query(
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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const dryRun = formData.get('dryRun') === 'true';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an Excel file (.xlsx or .xls)' },
        { status: 400 }
      );
    }

    // Read file buffer
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    // Process each month sheet
    const results: {
      month: string;
      orders: number;
      items: number;
      imported: number;
      skipped: number;
      errors: number;
    }[] = [];

    let totalOrders = 0;
    let totalItems = 0;
    let totalImported = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const sheetName of MONTH_SHEETS) {
      if (!workbook.SheetNames.includes(sheetName)) {
        continue;
      }

      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<ExcelRow & Record<string, unknown>>(worksheet);
      const orders = transformSheet(rows, sheetName);

      let monthImported = 0;
      let monthSkipped = 0;
      let monthErrors = 0;
      let monthItems = 0;

      for (const order of orders) {
        const validation = validateOrder(order);
        if (!validation.valid) {
          monthSkipped++;
          continue;
        }

        monthItems += order.items.length;

        if (dryRun) {
          // In dry run, check if would be imported or skipped
          if (await orderExists(order.order_number)) {
            monthSkipped++;
          } else {
            monthImported++;
          }
        } else {
          // Actually import
          const orderId = await insertOrder(order);
          if (orderId) {
            monthImported++;
          } else if (await orderExists(order.order_number)) {
            monthSkipped++;
          } else {
            monthErrors++;
          }
          // Rate limiting delay
          await delay(100);
        }
      }

      results.push({
        month: sheetName,
        orders: orders.length,
        items: monthItems,
        imported: monthImported,
        skipped: monthSkipped,
        errors: monthErrors,
      });

      totalOrders += orders.length;
      totalItems += monthItems;
      totalImported += monthImported;
      totalSkipped += monthSkipped;
      totalErrors += monthErrors;
    }

    return NextResponse.json({
      success: true,
      dryRun,
      summary: {
        totalOrders,
        totalItems,
        totalImported,
        totalSkipped,
        totalErrors,
      },
      details: results,
    });
  } catch (error) {
    console.error('[API] Import orders error:', error);
    return NextResponse.json(
      { error: 'Failed to import orders', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET endpoint to check import status or get template info
export async function GET() {
  return NextResponse.json({
    supportedFormats: ['.xlsx', '.xls'],
    expectedSheets: MONTH_SHEETS,
    expectedColumns: ['No', 'Date', 'Client', 'Client URL', 'Keywords', 'Publication', 'Price', 'Status', 'Link'],
    notes: [
      'Order numbers should be in format TA20_XXX (will be converted to AGG-2020-XXX)',
      'Multiple rows per order are grouped by order number',
      'Price on first row is distributed across all items',
      'Existing orders will be skipped',
    ],
  });
}
