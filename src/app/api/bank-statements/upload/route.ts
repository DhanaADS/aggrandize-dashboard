import { NextRequest, NextResponse } from 'next/server';
import {
  createBankStatement,
  getBankAccountByNumber,
  updateBankStatement,
  bulkCreateTransactions
} from '@/lib/bank-statements-api';
import { parseStatement } from '@/lib/bank-statements/parsers';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bankName = formData.get('bank_name') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Get file type
    const fileType = file.name.split('.').pop()?.toLowerCase() || '';

    if (!['xlsx', 'xls', 'csv'].includes(fileType)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload XLSX, XLS, or CSV files.' },
        { status: 400 }
      );
    }

    // Create initial bank statement record
    const statement = await createBankStatement({
      user_id: 'system', // TODO: Get from auth session
      file_name: file.name,
      file_type: fileType as 'xlsx' | 'xls' | 'csv',
      file_size: file.size,
      bank_name: bankName || undefined,
      processing_status: 'processing',
    });

    if (!statement) {
      return NextResponse.json(
        { error: 'Failed to create bank statement record' },
        { status: 500 }
      );
    }

    try {
      // Parse the statement using bank-specific parsers
      const parseResult = await parseStatement(file, statement.id);

      // Find bank account
      const bankAccount = await getBankAccountByNumber(parseResult.accountNumber);

      // Update statement with parsed metadata
      await updateBankStatement(statement.id, {
        bank_name: parseResult.bankCode,
        account_number: parseResult.accountNumber.slice(-4), // Last 4 digits
        bank_account_id: bankAccount?.id,
        statement_period_start: parseResult.periodStart,
        statement_period_end: parseResult.periodEnd,
        opening_balance: parseResult.openingBalance,
        closing_balance: parseResult.closingBalance,
        total_credits: parseResult.totalCredits,
        total_debits: parseResult.totalDebits,
        total_transactions: parseResult.transactions.length,
        processing_status: 'completed',
      });

      // Bulk insert transactions
      if (parseResult.transactions.length > 0) {
        await bulkCreateTransactions(parseResult.transactions);
      }

      return NextResponse.json({
        success: true,
        statement_id: statement.id,
        bank_code: parseResult.bankCode,
        account_number: parseResult.accountNumber,
        total_transactions: parseResult.transactions.length,
        message: 'File parsed successfully',
      });

    } catch (parseError: any) {
      console.error('[Upload API] Parse error:', parseError);

      // Update statement status to failed
      await updateBankStatement(statement.id, {
        processing_status: 'failed',
        error_message: parseError.message,
      });

      return NextResponse.json(
        {
          error: 'Failed to parse bank statement',
          details: parseError.message,
          statement_id: statement.id
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('[Upload API] Error:', error);
    return NextResponse.json(
      { error: 'Upload failed', details: error.message },
      { status: 500 }
    );
  }
}
