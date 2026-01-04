/**
 * ICICI Bank Statement Parser
 *
 * Parses ICICI Bank statement XLS files with the following structure:
 * - Rows 0-5: Title and account information
 * - Row 6: Header row (No., Transaction ID, Value Date, etc.)
 * - Rows 7+: Transaction data
 */

import * as XLSX from 'xlsx';

interface ICICITransaction {
  no: number;
  transactionID: string;
  valueDate: string;
  txnPostedDate: string;
  chequeNo: string;
  description: string;
  crDr: 'CR' | 'DR';
  transactionAmount: number;
  availableBalance: number;
}

interface ICICIStatementMetadata {
  accountName: string;
  accountNumber: string;
  periodStart: string;
  periodEnd: string;
  openingBalance?: number;
  closingBalance?: number;
  totalDebits?: number;
  totalCredits?: number;
}

interface ICICIParseResult {
  metadata: ICICIStatementMetadata;
  transactions: ICICITransaction[];
}

/**
 * Convert DD/MM/YYYY to ISO date string
 */
function parseIndianDate(dateStr: string): string {
  if (!dateStr || dateStr.trim() === '') return '';

  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;

  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * Parse full timestamp: DD/MM/YYYY HH:MM:SS AM/PM
 */
function parseICICITimestamp(timestamp: string): string {
  if (!timestamp || timestamp.trim() === '') return '';

  // Extract date part
  const datePart = timestamp.split(' ')[0];
  return parseIndianDate(datePart);
}

/**
 * Extract payment method from description
 */
function extractPaymentMethod(description: string): string {
  const upper = description.toUpperCase();

  if (upper.startsWith('MMT/IMPS')) return 'IMPS';
  if (upper.startsWith('NEFT-')) return 'NEFT';
  if (upper.startsWith('MIN/')) return 'SUBSCRIPTION';
  if (upper.startsWith('MSI/')) return 'SUBSCRIPTION';
  if (upper.startsWith('UPI/')) return 'UPI';
  if (upper.startsWith('POS/')) return 'POS';

  return 'OTHER';
}

/**
 * Extract beneficiary/sender name from description
 */
function extractCounterpartyName(description: string): string | undefined {
  // MMT/IMPS pattern: MMT/IMPS/533510425722/Salary/ABBAS/KVBL0001270
  const impsMatch = description.match(/MMT\/IMPS\/\d+\/[^\/]+\/([^\/]+)\//);
  if (impsMatch) return impsMatch[1].trim();

  // NEFT pattern: NEFT-AXOIC.../AGGRANDIZE DIGITAL SOLUTIONS-///...
  const neftMatch = description.match(/NEFT-[^-]+-([^-]+)-/);
  if (neftMatch) return neftMatch[1].trim();

  // MIN/MSI pattern: MIN/CLAUDE AI S/...
  const subMatch = description.match(/M[IS]I\/([^\/]+)\//);
  if (subMatch) return subMatch[1].trim();

  return undefined;
}

/**
 * Extract IFSC code from description
 */
function extractCounterpartyBank(description: string): string | undefined {
  // Look for IFSC pattern (4 letters + 7 digits)
  const ifscMatch = description.match(/([A-Z]{4}\d{7})/);
  return ifscMatch ? ifscMatch[1] : undefined;
}

/**
 * Extract transaction purpose/category from description
 */
function extractPurpose(description: string): string | undefined {
  const upper = description.toUpperCase();

  // Check for explicit purpose markers in IMPS
  if (description.includes('/Salary/')) return 'Salary';
  if (description.includes('/Rent/')) return 'Rent';
  if (description.includes('/Bills/')) return 'Bills';

  // Subscription detection
  if (upper.includes('CLAUDE AI') || upper.includes('OPENAI') ||
      upper.includes('CURSOR') || upper.includes('PERPLEX')) {
    return 'Subscription';
  }

  // Inter-account transfer
  if (upper.includes('AGGRANDIZE DIGITAL SOLUTIONS') ||
      upper.includes('AGGRANDIZE DIGITAL SOL')) {
    return 'Internal Transfer';
  }

  return undefined;
}

/**
 * Extract transaction reference/ID
 */
function extractReferenceNumber(description: string): string | undefined {
  // IMPS reference: MMT/IMPS/533510425722/...
  const impsRefMatch = description.match(/MMT\/IMPS\/(\d+)\//);
  if (impsRefMatch) return impsRefMatch[1];

  // NEFT reference: NEFT-AXOIC35323401584-...
  const neftRefMatch = description.match(/NEFT-([A-Z0-9]+)-/);
  if (neftRefMatch) return neftRefMatch[1];

  // MSI/MIN reference: MSI/OPENAI  CHA/202512261736/770282/
  const msiRefMatch = description.match(/M[IS]I\/[^\/]+\/(\d+)\/(\d+)\//);
  if (msiRefMatch) return msiRefMatch[2]; // Use transaction ID

  return undefined;
}

/**
 * Parse ICICI Bank XLS statement
 */
export async function parseICICIStatement(file: File): Promise<ICICIParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  // ICICI statements typically have sheet named like "OpTransactionHistoryUX3"
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to array of arrays
  const data: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false
  });

  // Extract account information from row 5
  // Format: "Transactions List - -AGGRANDIZE DIGITAL SOLUTIONS (INR) - 755505000156"
  const accountInfoRow = String(data[5][0]);
  const accountNameMatch = accountInfoRow.match(/-([^-]+)\(INR\)/);
  const accountName = accountNameMatch ? accountNameMatch[1].trim() : '';

  const accountNumberMatch = accountInfoRow.match(/(\d{12,16})$/);
  const accountNumber = accountNumberMatch ? accountNumberMatch[1] : '';

  // Headers are in row 6
  // Data starts from row 7

  // Parse transactions
  const transactions: ICICITransaction[] = [];
  let openingBalance: number | undefined;
  let closingBalance: number | undefined;
  let totalDebits = 0;
  let totalCredits = 0;

  for (let i = 7; i < data.length; i++) {
    const row = data[i];

    // Skip empty rows
    if (!row[0] || row[0] === '') continue;

    const no = parseInt(String(row[0])) || 0;
    const transactionID = String(row[1]);
    const valueDate = parseIndianDate(String(row[2]));
    const txnPostedDate = String(row[3]);
    const chequeNo = String(row[4]);
    const description = String(row[5]);
    const crDr = String(row[6]).toUpperCase() as 'CR' | 'DR';
    const transactionAmount = parseFloat(String(row[7])) || 0;
    const availableBalance = parseFloat(String(row[8])) || 0;

    // Track opening balance (first transaction's balance + first transaction amount)
    if (i === 7) {
      if (crDr === 'DR') {
        openingBalance = availableBalance + transactionAmount;
      } else {
        openingBalance = availableBalance - transactionAmount;
      }
    }

    // Track last balance as closing balance
    closingBalance = availableBalance;

    // Sum up debits and credits
    if (crDr === 'DR') {
      totalDebits += transactionAmount;
    } else {
      totalCredits += transactionAmount;
    }

    transactions.push({
      no,
      transactionID,
      valueDate,
      txnPostedDate,
      chequeNo,
      description,
      crDr,
      transactionAmount,
      availableBalance
    });
  }

  // Determine period from first and last transactions
  const periodStart = transactions.length > 0 ? transactions[0].valueDate : '';
  const periodEnd = transactions.length > 0 ?
    transactions[transactions.length - 1].valueDate : '';

  const metadata: ICICIStatementMetadata = {
    accountName,
    accountNumber,
    periodStart,
    periodEnd,
    openingBalance,
    closingBalance,
    totalDebits,
    totalCredits
  };

  return {
    metadata,
    transactions
  };
}

/**
 * Convert ICICI transaction to unified format
 */
export function convertICICITransaction(
  transaction: ICICITransaction,
  statementId: string,
  accountNumber: string
) {
  const isDebit = transaction.crDr === 'DR';

  return {
    statement_id: statementId,
    bank_code: 'ICICI' as const,
    account_number: accountNumber,
    transaction_date: transaction.valueDate,
    posted_date: transaction.txnPostedDate,
    value_date: transaction.valueDate,
    description: transaction.description,
    reference_number: transaction.transactionID || extractReferenceNumber(transaction.description),
    amount: transaction.transactionAmount,
    transaction_type: isDebit ? ('debit' as const) : ('credit' as const),
    balance_after: transaction.availableBalance,
    payment_method: extractPaymentMethod(transaction.description),
    counterparty_name: extractCounterpartyName(transaction.description),
    counterparty_bank: extractCounterpartyBank(transaction.description),
    purpose: extractPurpose(transaction.description),
    match_status: 'unmatched' as const
  };
}
