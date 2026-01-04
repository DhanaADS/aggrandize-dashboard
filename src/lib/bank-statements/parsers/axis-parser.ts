/**
 * AXIS Bank Statement Parser
 *
 * Parses AXIS Bank statement XLSX files with the following structure:
 * - Rows 0-16: Account metadata (name, address, customer ID, etc.)
 * - Row 17: Period information
 * - Row 19: Header row
 * - Row 20: Opening balance
 * - Rows 21+: Transaction data
 * - Last rows: Transaction totals and closing balance
 */

import * as XLSX from 'xlsx';

interface AxisTransaction {
  serialNo: number;
  transactionDate: string;
  valueDate: string;
  particulars: string;
  debitAmount: number;
  creditAmount: number;
  balance: number;
  chequeNumber?: string;
  branchName: string;
}

interface AxisStatementMetadata {
  accountName: string;
  accountNumber: string;
  customerID: string;
  ifscCode: string;
  micrCode: string;
  scheme: string;
  currency: string;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  closingBalance: number;
  totalDebits: number;
  totalCredits: number;
}

interface AxisParseResult {
  metadata: AxisStatementMetadata;
  transactions: AxisTransaction[];
}

/**
 * Remove commas and convert Indian number format to float
 */
function parseIndianAmount(value: string | number): number {
  if (typeof value === 'number') return value;
  if (!value || value === '') return 0;

  // Remove commas and convert to number
  const cleaned = String(value).replace(/,/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Convert DD/MM/YYYY to ISO date string
 */
function parseIndianDate(dateStr: string): string {
  if (!dateStr || dateStr.trim() === '') return '';

  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;

  const [day, month, year] = parts;
  // Return ISO format: YYYY-MM-DD
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * Extract payment method from transaction particulars
 */
function extractPaymentMethod(particulars: string): string {
  const upper = particulars.toUpperCase();

  if (upper.includes('NEFT/')) return 'NEFT';
  if (upper.includes('IMPS/')) return 'IMPS';
  if (upper.includes('INB/IFT/')) return 'INTERNAL';
  if (upper.includes('INB/NEFT/')) return 'NEFT';
  if (upper.includes('POS/')) return 'POS';
  if (upper.includes('REFUND/')) return 'REFUND';
  if (upper.includes('BPR') && upper.includes('EMI')) return 'EMI';
  if (upper.includes('UPI/')) return 'UPI';

  return 'OTHER';
}

/**
 * Extract beneficiary/sender name from particulars
 */
function extractCounterpartyName(particulars: string): string | undefined {
  // NEFT pattern: NEFT/.../PAYPAL PAYMENTS PL-OPGSP COL/...
  const neftMatch = particulars.match(/NEFT\/[^\/]+\/([^\/]+)\//);
  if (neftMatch) return neftMatch[1].trim();

  // INB/NEFT pattern: INB/NEFT/AXOIC.../Company Name/BANK/
  const inbNeftMatch = particulars.match(/INB\/NEFT\/[^\/]+\/([^\/]+)\//);
  if (inbNeftMatch) return inbNeftMatch[1].trim();

  // INB/IFT pattern: INB/IFT/Shang/TPARTY TRANSFER
  const inbIftMatch = particulars.match(/INB\/IFT\/([^\/]+)\//);
  if (inbIftMatch) return inbIftMatch[1].trim();

  // IMPS pattern: IMPS/P2A/...//X178499/KARURVYSYABANKLTD/
  const impsMatch = particulars.match(/IMPS\/[^\/]+\/[^\/]+\/\/[^\/]+\/([^\/]+)\//);
  if (impsMatch) return impsMatch[1].trim();

  return undefined;
}

/**
 * Extract IFSC code from particulars
 */
function extractCounterpartyBank(particulars: string): string | undefined {
  // Look for IFSC pattern (4 letters + 7 digits)
  const ifscMatch = particulars.match(/([A-Z]{4}\d{7})/);
  return ifscMatch ? ifscMatch[1] : undefined;
}

/**
 * Extract transaction purpose/category
 */
function extractPurpose(particulars: string): string | undefined {
  const upper = particulars.toUpperCase();

  if (upper.includes('SALARY')) return 'Salary';
  if (upper.includes('RENT')) return 'Rent';
  if (upper.includes('EMI')) return 'EMI';
  if (upper.includes('REFUND')) return 'Refund';
  if (upper.includes('BILL')) return 'Bills';
  if (upper.includes('PAYPAL')) return 'Client Payment';
  if (upper.includes('TPARTY TRANSFER')) return 'Internal Transfer';

  return undefined;
}

/**
 * Parse AXIS Bank XLSX statement
 */
export async function parseAxisStatement(file: File): Promise<AxisParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  // AXIS statements typically have one sheet called "Statement Enquiry"
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to array of arrays
  const data: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false // Get formatted values
  });

  // Extract metadata from top rows
  const accountName = String(data[0][0]).replace('Name :- ', '').trim();

  // Extract account number from row 17
  const periodInfo = String(data[17][0]);
  const accountNumberMatch = periodInfo.match(/Account No - (\d+)/);
  const accountNumber = accountNumberMatch ? accountNumberMatch[1] : '';

  // Extract period dates
  const periodMatch = periodInfo.match(/From : (\d{2}\/\d{2}\/\d{4}) To : (\d{2}\/\d{2}\/\d{4})/);
  const periodStart = periodMatch ? parseIndianDate(periodMatch[1]) : '';
  const periodEnd = periodMatch ? parseIndianDate(periodMatch[2]) : '';

  const customerID = String(data[7][2]);
  const ifscCode = String(data[8][2]);
  const micrCode = String(data[9][2]);
  const scheme = String(data[14][2]);
  const currency = String(data[15][2]);

  // Row 20 contains opening balance
  const openingBalanceRow = data[20];
  const openingBalance = parseIndianAmount(openingBalanceRow[6]);

  // Find where transactions end (look for "TRANSACTION TOTAL")
  let transactionEndRow = 21;
  for (let i = 21; i < data.length; i++) {
    const firstCol = String(data[i][0]).toUpperCase();
    if (firstCol.includes('TRANSACTION TOTAL')) {
      transactionEndRow = i;
      break;
    }
  }

  // Extract totals (one row after transaction end)
  const totalsRow = data[transactionEndRow];
  const totalDebits = parseIndianAmount(totalsRow[4]);
  const totalCredits = parseIndianAmount(totalsRow[5]);

  // Extract closing balance (two rows after transaction end)
  const closingBalanceRow = data[transactionEndRow + 1];
  const closingBalance = parseIndianAmount(closingBalanceRow[6]);

  const metadata: AxisStatementMetadata = {
    accountName,
    accountNumber,
    customerID,
    ifscCode,
    micrCode,
    scheme,
    currency,
    periodStart,
    periodEnd,
    openingBalance,
    closingBalance,
    totalDebits,
    totalCredits
  };

  // Parse transactions (rows 21 to transactionEndRow - 1)
  const transactions: AxisTransaction[] = [];

  for (let i = 21; i < transactionEndRow; i++) {
    const row = data[i];

    // Skip opening balance row
    if (String(row[3]).toUpperCase().includes('OPENING BALANCE')) {
      continue;
    }

    const serialNo = parseInt(String(row[0])) || 0;
    const transactionDate = parseIndianDate(String(row[1]));
    const valueDate = parseIndianDate(String(row[2]));
    const particulars = String(row[3]);
    const debitAmount = parseIndianAmount(row[4]);
    const creditAmount = parseIndianAmount(row[5]);
    const balance = parseIndianAmount(row[6]);
    const chequeNumber = row[7] ? String(row[7]) : undefined;
    const branchName = String(row[8]);

    // Only add if we have a valid transaction
    if (transactionDate && particulars) {
      transactions.push({
        serialNo,
        transactionDate,
        valueDate,
        particulars,
        debitAmount,
        creditAmount,
        balance,
        chequeNumber,
        branchName
      });
    }
  }

  return {
    metadata,
    transactions
  };
}

/**
 * Convert AXIS transaction to unified format
 */
export function convertAxisTransaction(
  transaction: AxisTransaction,
  statementId: string,
  accountNumber: string
) {
  const isDebit = transaction.debitAmount > 0;
  const amount = isDebit ? transaction.debitAmount : transaction.creditAmount;

  return {
    statement_id: statementId,
    bank_code: 'AXIS' as const,
    account_number: accountNumber,
    transaction_date: transaction.transactionDate,
    value_date: transaction.valueDate,
    description: transaction.particulars,
    reference_number: transaction.chequeNumber,
    amount,
    transaction_type: isDebit ? ('debit' as const) : ('credit' as const),
    balance_after: transaction.balance,
    payment_method: extractPaymentMethod(transaction.particulars),
    counterparty_name: extractCounterpartyName(transaction.particulars),
    counterparty_bank: extractCounterpartyBank(transaction.particulars),
    purpose: extractPurpose(transaction.particulars),
    match_status: 'unmatched' as const
  };
}
