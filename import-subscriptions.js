/**
 * Import Subscriptions from Excel
 * Usage: node import-subscriptions.js
 */

const XLSX = require('xlsx');
const { v4: uuidv4 } = require('uuid');

// API Configuration
const API_URL = process.env.UMBREL_API_URL || 'https://api.aggrandizedigital.com';
const API_KEY = process.env.UMBREL_API_KEY || 'e622c42ee210f3ad0af8ec91ec92d164cfb16e3e9ecec5e991eb6fe2ece2180e';
const ADMIN_KEY = process.env.UMBREL_ADMIN_KEY || 'v4+qGvUcO3A0Gqhstn84pWu9v2E2xnZ5DlPCtvafvKs=';

// Excel file path
const EXCEL_FILE = '/Users/dhanapale/Downloads/Office_Subscriptions.xlsx';

// Helper: Execute SQL query via API
async function query(sql, params = []) {
  const response = await fetch(`${API_URL}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      'X-ADMIN-KEY': ADMIN_KEY,
    },
    body: JSON.stringify({ sql, params }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Query failed: ${error}`);
  }

  return response.json();
}

// Helper: Parse amount (remove currency symbols, commas)
function parseAmount(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Math.round(value * 100) / 100;

  // Remove currency symbols and commas
  const cleaned = String(value).replace(/[₹$,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
}

// Helper: Format date to YYYY-MM-DD
function formatDate(value) {
  if (!value) return null;

  // If it's already a Date object or Excel date number
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }

  // Excel serial date number
  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return date.toISOString().split('T')[0];
  }

  // Try to parse string date
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  return null;
}

// Helper: Map payment method
function mapPaymentMethod(value) {
  if (!value) return 'Office Credit Card';
  const lower = String(value).toLowerCase().trim();
  if (lower.includes('saran')) return 'Saran Card';
  if (lower.includes('office')) return 'Office Credit Card';
  return value;
}

// Helper: Parse auto-renewal
function parseAutoRenewal(value) {
  if (!value) return false;
  const lower = String(value).toLowerCase().trim();
  return lower === 'yes' || lower === 'true' || lower === '1';
}

// Main import function
async function importSubscriptions() {
  console.log('='.repeat(60));
  console.log('📊 SUBSCRIPTION IMPORT TOOL');
  console.log('='.repeat(60));
  console.log();

  // Step 1: Read Excel file
  console.log('📖 Reading Excel file...');
  const workbook = XLSX.readFile(EXCEL_FILE);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  // Find header row (row with 'S No' or 'Platform')
  let headerRowIndex = 0;
  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    if (row && (row[0] === 'S No' || row[1] === 'Platform')) {
      headerRowIndex = i;
      break;
    }
  }

  // Extract headers and data
  const headers = rawData[headerRowIndex];
  const dataRows = rawData.slice(headerRowIndex + 1);

  // Filter out empty rows and total rows
  const validRows = dataRows.filter(row => {
    if (!row || row.length === 0) return false;
    const firstCell = row[0];
    if (firstCell === null || firstCell === undefined || firstCell === '') return false;
    if (typeof firstCell === 'string' && (firstCell.includes('TOTAL') || firstCell.includes('S No'))) return false;
    return !isNaN(Number(firstCell));
  });

  console.log(`   Found ${validRows.length} subscription records`);
  console.log();

  // Step 2: Clear existing subscriptions
  console.log('🗑️  Clearing existing subscriptions...');
  try {
    const deleteResult = await query('DELETE FROM subscriptions');
    console.log(`   Deleted ${deleteResult.rowCount || 0} existing records`);
  } catch (error) {
    console.log('   Warning: Could not clear existing data:', error.message);
  }
  console.log();

  // Step 3: Transform and insert subscriptions
  console.log('📥 Importing subscriptions...');
  console.log();

  let successCount = 0;
  let failCount = 0;
  const errors = [];

  for (let i = 0; i < validRows.length; i++) {
    const row = validRows[i];

    // Map row to subscription object
    // Columns: S_No, Platform, Plan, Purpose, Amount_Mixed, INR, USD, Payment_Method, Renewal_Cycle, Due_Date, Next_Due_Date, Auto_Renew, Category, Used_By, Paid_By
    const subscription = {
      id: uuidv4(),
      platform: String(row[1] || '').trim(),
      plan_type: String(row[2] || '').trim(),
      purpose: String(row[3] || '').trim(),
      amount_inr: parseAmount(row[5]), // INR column
      amount_usd: parseAmount(row[6]), // USD column
      payment_method_id: mapPaymentMethod(row[7]),
      renewal_cycle: String(row[8] || 'Monthly').trim(),
      due_date: formatDate(row[9]),
      next_due_date: formatDate(row[10]),
      auto_renewal: parseAutoRenewal(row[11]),
      is_active: true,
      category: String(row[12] || '').trim(),
      used_by: String(row[13] || '').trim() || null,
      paid_by: String(row[14] || '').trim() || null,
    };

    // Validate required fields
    if (!subscription.platform || !subscription.plan_type) {
      console.log(`   ⚠️  [${i + 1}/${validRows.length}] Skipped - Missing platform or plan`);
      failCount++;
      continue;
    }

    try {
      // Insert subscription
      const sql = `
        INSERT INTO subscriptions (
          id, platform, plan_type, purpose, amount_inr, amount_usd,
          payment_method_id, renewal_cycle, due_date, next_due_date,
          auto_renewal, is_active, category, used_by, paid_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id
      `;

      const params = [
        subscription.id,
        subscription.platform,
        subscription.plan_type,
        subscription.purpose,
        subscription.amount_inr,
        subscription.amount_usd,
        subscription.payment_method_id,
        subscription.renewal_cycle,
        subscription.due_date,
        subscription.next_due_date,
        subscription.auto_renewal,
        subscription.is_active,
        subscription.category,
        subscription.used_by,
        subscription.paid_by,
      ];

      await query(sql, params);
      successCount++;
      console.log(`   ✓ [${i + 1}/${validRows.length}] ${subscription.platform} - ${subscription.plan_type}`);
    } catch (error) {
      failCount++;
      errors.push({ row: i + 1, platform: subscription.platform, error: error.message });
      console.log(`   ✗ [${i + 1}/${validRows.length}] ${subscription.platform} - ${error.message}`);
    }
  }

  // Step 4: Summary
  console.log();
  console.log('='.repeat(60));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`   Total records:  ${validRows.length}`);
  console.log(`   ✓ Success:      ${successCount}`);
  console.log(`   ✗ Failed:       ${failCount}`);
  console.log();

  if (errors.length > 0) {
    console.log('Errors:');
    errors.forEach(e => {
      console.log(`   Row ${e.row}: ${e.platform} - ${e.error}`);
    });
    console.log();
  }

  // Step 5: Verify import
  console.log('🔍 Verifying import...');
  try {
    const countResult = await query('SELECT COUNT(*) as count FROM subscriptions');
    const dbCount = countResult.rows[0]?.count || 0;
    console.log(`   Records in database: ${dbCount}`);

    if (Number(dbCount) === successCount) {
      console.log('   ✓ Verification passed!');
    } else {
      console.log(`   ⚠️  Count mismatch! Expected ${successCount}, got ${dbCount}`);
    }
  } catch (error) {
    console.log('   Could not verify:', error.message);
  }

  console.log();
  console.log('✅ Import complete!');
  console.log('='.repeat(60));
}

// Run import
importSubscriptions().catch(error => {
  console.error('Import failed:', error);
  process.exit(1);
});
