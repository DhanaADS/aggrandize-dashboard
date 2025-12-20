import { NextRequest, NextResponse } from 'next/server';
import {
  getOrderById,
  updateOrder,
  deleteOrder,
  getOrderItems,
  getOrderPayments,
} from '@/lib/umbrel';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/order/[id] - Get single order with items and payments
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Fetch items and payments in parallel
    const [items, payments] = await Promise.all([
      getOrderItems(id),
      getOrderPayments(id),
    ]);

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        items,
        payments,
      },
    });
  } catch (error) {
    console.error('[API] Order get error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT /api/order/[id] - Update order
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if order exists
    const existing = await getOrderById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = await updateOrder(id, body);

    return NextResponse.json({
      success: true,
      order,
      message: 'Order updated successfully',
    });
  } catch (error) {
    console.error('[API] Order update error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/order/[id] - Delete order
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check if order exists
    const existing = await getOrderById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    await deleteOrder(id);

    return NextResponse.json({
      success: true,
      message: `Order ${existing.order_number} deleted successfully`,
    });
  } catch (error) {
    console.error('[API] Order delete error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
