import { NextRequest, NextResponse } from 'next/server';
import {
  getOrderById,
  getOrderPayments,
  addOrderPayment,
  deleteOrderPayment,
} from '@/lib/umbrel';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/order/[id]/payments - List payments for an order
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Verify order exists
    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const payments = await getOrderPayments(id);

    return NextResponse.json({
      success: true,
      payments,
      count: payments.length,
      total_paid: payments.reduce((sum, p) => sum + Number(p.amount), 0),
    });
  } catch (error) {
    console.error('[API] Order payments list error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/order/[id]/payments - Add payment to order
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Verify order exists
    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Validate required fields
    if (!body.amount || body.amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    const payment = await addOrderPayment(id, {
      amount: body.amount,
      payment_method: body.payment_method,
      reference_number: body.reference_number,
      payment_date: body.payment_date,
      notes: body.notes,
    });

    // Return updated order with payment status
    const updatedOrder = await getOrderById(id);

    return NextResponse.json({
      success: true,
      payment,
      order: updatedOrder,
      message: `Payment of $${body.amount} recorded successfully`,
    });
  } catch (error) {
    console.error('[API] Order payment add error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/order/[id]/payments - Delete a payment (payment_id in query)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('payment_id');

    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: 'payment_id query parameter is required' },
        { status: 400 }
      );
    }

    await deleteOrderPayment(paymentId);

    // Return updated order with payment status
    const updatedOrder = await getOrderById(id);

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: 'Payment deleted successfully',
    });
  } catch (error) {
    console.error('[API] Order payment delete error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
