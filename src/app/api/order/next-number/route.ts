import { NextResponse } from 'next/server';
import { getNextOrderNumber } from '@/lib/umbrel';

// GET /api/order/next-number - Get the next available order number
export async function GET() {
  try {
    const orderNumber = await getNextOrderNumber();

    return NextResponse.json({
      success: true,
      orderNumber,
    });
  } catch (error) {
    console.error('[API] Get next order number error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
