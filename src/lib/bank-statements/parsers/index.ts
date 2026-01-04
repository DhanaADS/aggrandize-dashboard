/**
 * Bank Statement Parser Registry
 *
 * Auto-detects bank format and routes to the appropriate parser
 */

import * as XLSX from 'xlsx';
import {
  parseAxisStatement,
  convertAxisTransaction
} from './axis-parser';
import {
  parseICICIStatement,
  convertICICITransaction
} from './icici-parser';

export type BankCode = 'AXIS' | 'ICICI' | 'HDFC' | 'SBI' | 'OTHER';

export interface UnifiedBankTransaction {
  statement_id: string;
  bank_code: BankCode;
  account_number: string;
  transaction_date: string;
  posted_date?: string;
  value_date: string;
  description: string;
  reference_number?: string;
  amount: number;
  transaction_type: 'debit' | 'credit';
  balance_after?: number;
  payment_method?: string;
  counterparty_name?: string;
  counterparty_bank?: string;
  purpose?: string;
  match_status: 'unmatched' | 'matched' | 'manual' | 'ignored';
}

export interface StatementParseResult {
  bankCode: BankCode;
  accountNumber: string;
  accountName: string;
  periodStart: string;
  periodEnd: string;
  openingBalance?: number;
  closingBalance?: number;
  totalDebits?: number;
  totalCredits?: number;
  transactions: UnifiedBankTransaction[];
}

/**
 * Detect bank from file structure
 */
async function detectBank(file: File): Promise<BankCode> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Get first few rows to inspect
  const data: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false
  });

  // AXIS Bank detection
  // Row 8 contains "IFSC Code" and row 14 contains "Scheme"
  if (data.length > 14) {
    const row8 = String(data[8]?.[0] || '');
    const row14 = String(data[14]?.[0] || '');

    if (row8.includes('IFSC Code') && row14.includes('Scheme')) {
      return 'AXIS';
    }
  }

  // ICICI Bank detection
  // Sheet name typically "OpTransactionHistoryUX3"
  // Row 5 contains account info with pattern: "...AGGRANDIZE... (INR) - {account_number}"
  if (sheetName.toLowerCase().includes('optransactionhistory')) {
    return 'ICICI';
  }

  if (data.length > 5) {
    const row5 = String(data[5]?.[0] || '');
    if (row5.includes('(INR)') && /\d{12,16}$/.test(row5)) {
      return 'ICICI';
    }
  }

  // HDFC detection (future)
  // Can add HDFC-specific patterns here

  // SBI detection (future)
  // Can add SBI-specific patterns here

  return 'OTHER';
}

/**
 * Parse bank statement file and return unified format
 */
export async function parseStatement(
  file: File,
  statementId: string
): Promise<StatementParseResult> {
  // Detect bank
  const bankCode = await detectBank(file);

  if (bankCode === 'AXIS') {
    const result = await parseAxisStatement(file);

    const transactions = result.transactions.map(tx =>
      convertAxisTransaction(tx, statementId, result.metadata.accountNumber)
    );

    return {
      bankCode: 'AXIS',
      accountNumber: result.metadata.accountNumber,
      accountName: result.metadata.accountName,
      periodStart: result.metadata.periodStart,
      periodEnd: result.metadata.periodEnd,
      openingBalance: result.metadata.openingBalance,
      closingBalance: result.metadata.closingBalance,
      totalDebits: result.metadata.totalDebits,
      totalCredits: result.metadata.totalCredits,
      transactions
    };
  }

  if (bankCode === 'ICICI') {
    const result = await parseICICIStatement(file);

    const transactions = result.transactions.map(tx =>
      convertICICITransaction(tx, statementId, result.metadata.accountNumber)
    );

    return {
      bankCode: 'ICICI',
      accountNumber: result.metadata.accountNumber,
      accountName: result.metadata.accountName,
      periodStart: result.metadata.periodStart,
      periodEnd: result.metadata.periodEnd,
      openingBalance: result.metadata.openingBalance,
      closingBalance: result.metadata.closingBalance,
      totalDebits: result.metadata.totalDebits,
      totalCredits: result.metadata.totalCredits,
      transactions
    };
  }

  throw new Error(`Unsupported bank format: ${bankCode}`);
}

/**
 * Get bank name from bank code
 */
export function getBankName(bankCode: BankCode): string {
  const names: Record<BankCode, string> = {
    AXIS: 'Axis Bank',
    ICICI: 'ICICI Bank',
    HDFC: 'HDFC Bank',
    SBI: 'State Bank of India',
    OTHER: 'Other Bank'
  };

  return names[bankCode];
}

/**
 * Validate if file type is supported
 */
export function isSupportedFileType(fileName: string): boolean {
  const ext = fileName.toLowerCase().split('.').pop();
  return ext === 'xlsx' || ext === 'xls' || ext === 'csv';
}

// Re-export parsers for direct use if needed
export { parseAxisStatement, convertAxisTransaction } from './axis-parser';
export { parseICICIStatement, convertICICITransaction } from './icici-parser';
