import { NextRequest, NextResponse } from 'next/server';
import {
  getBankTransactions,
  getPlatformMatchingRules,
  updateBankStatement,
} from '@/lib/bank-statements-api';
import { getSubscriptions } from '@/lib/finance-api';
import { matchTransactions } from '@/lib/bank-statements/matcher';

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

    // Get transactions for this statement
    const transactions = await getBankTransactions({ statement_id });

    // Get active subscriptions
    const subscriptions = await getSubscriptions({ is_active: true });

    // Get matching rules
    const rules = await getPlatformMatchingRules();

    // Run matching algorithm
    const matchingResult = matchTransactions(
      transactions,
      subscriptions || [],
      rules
    );

    // Update statement with match count
    await updateBankStatement(statement_id, {
      matched_transactions: matchingResult.matched_count,
    });

    return NextResponse.json({
      success: true,
      ...matchingResult,
    });
  } catch (error) {
    console.error('[Match API] Error:', error);
    return NextResponse.json(
      { error: 'Matching failed' },
      { status: 500 }
    );
  }
}
