import { NextRequest, NextResponse } from 'next/server';
import { updateBankStatement } from '@/lib/bank-statements-api';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { id } = params;

    const updated = await updateBankStatement(id, body);

    if (!updated) {
      return NextResponse.json(
        { error: 'Statement not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      statement: updated
    });

  } catch (error: any) {
    console.error('[Update Statement API] Error:', error);
    return NextResponse.json(
      { error: 'Update failed', details: error.message },
      { status: 500 }
    );
  }
}
