import { NextRequest, NextResponse } from 'next/server';
import {
  getOrders,
  createOrder,
  getOrderStats,
  addOrderItem,
} from '@/lib/umbrel';

// GET /api/order - List orders with filters + stats
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const filters = {
    status: searchParams.get('status') || undefined,
    payment_status: searchParams.get('payment_status') || undefined,
    client_name: searchParams.get('client') || undefined,
    date_from: searchParams.get('date_from') || undefined,
    date_to: searchParams.get('date_to') || undefined,
    search: searchParams.get('search') || undefined,
  };

  // Remove undefined values
  Object.keys(filters).forEach((key) => {
    if (filters[key as keyof typeof filters] === undefined) {
      delete filters[key as keyof typeof filters];
    }
  });

  try {
    const [orders, stats] = await Promise.all([
      getOrders(Object.keys(filters).length > 0 ? filters : undefined),
      getOrderStats(),
    ]);

    return NextResponse.json({
      success: true,
      orders,
      stats,
      count: orders.length,
    });
  } catch (error) {
    console.error('[API] Order list error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/order - Create new order (optionally with items)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.client_name) {
      return NextResponse.json(
        { success: false, error: 'Client name is required' },
        { status: 400 }
      );
    }

    // Extract items if provided
    const { items, ...orderData } = body;

    // Create the order
    const order = await createOrder(orderData);

    // Add items if provided
    if (items && Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        if (item.website && item.keyword && item.client_url && item.price) {
          await addOrderItem(order.id, item);
        }
      }
    }

    // Fetch updated order with totals
    const { getOrderById } = await import('@/lib/umbrel');
    const updatedOrder = await getOrderById(order.id);

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: `Order ${order.order_number} created successfully`,
    });
  } catch (error) {
    console.error('[API] Order create error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
