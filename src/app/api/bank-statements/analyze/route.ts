import { NextRequest, NextResponse } from 'next/server';
import {
  updateBankStatement,
  bulkCreateTransactions,
} from '@/lib/bank-statements-api';
import { extractTransactions } from '@/lib/bank-statements/ai-extractor';
import { normalizeDescription } from '@/lib/bank-statements/ai-extractor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { statement_id } = body;

    if (!statement_id) {
      return NextResponse.json(
        { error: 'Statement ID required' },
        { status: 400 }
      );
    }

    // Update status to processing
    await updateBankStatement(statement_id, {
      processing_status: 'processing',
    });

    // In a real implementation, you would:
    // 1. Retrieve the file from storage
    // 2. Extract transactions using AI
    // 3. Store transactions in database

    // For now, return a mock response
    // The actual file processing would happen here with the uploaded file

    return NextResponse.json({
      success: true,
      message: 'File analysis in progress',
      total_transactions: 0,
      matched_count: 0,
    });
  } catch (error) {
    console.error('[Analyze API] Error:', error);
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    );
  }
}
