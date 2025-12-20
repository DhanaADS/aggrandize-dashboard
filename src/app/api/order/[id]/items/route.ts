import { NextRequest, NextResponse } from 'next/server';
import {
  getOrderById,
  getOrderItems,
  addOrderItem,
  updateOrderItem,
  deleteOrderItem,
} from '@/lib/umbrel';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/order/[id]/items - List items for an order
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

    const items = await getOrderItems(id);

    return NextResponse.json({
      success: true,
      items,
      count: items.length,
    });
  } catch (error) {
    console.error('[API] Order items list error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/order/[id]/items - Add item to order
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
    if (!body.website || !body.keyword || !body.client_url || body.price === undefined) {
      return NextResponse.json(
        { success: false, error: 'website, keyword, client_url, and price are required' },
        { status: 400 }
      );
    }

    const item = await addOrderItem(id, {
      publication_id: body.publication_id,
      website: body.website,
      keyword: body.keyword,
      client_url: body.client_url,
      price: body.price,
      notes: body.notes,
    });

    // Return updated order totals
    const updatedOrder = await getOrderById(id);

    return NextResponse.json({
      success: true,
      item,
      order: updatedOrder,
      message: 'Item added successfully',
    });
  } catch (error) {
    console.error('[API] Order item add error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT /api/order/[id]/items - Update an item (item_id in body)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.item_id) {
      return NextResponse.json(
        { success: false, error: 'item_id is required' },
        { status: 400 }
      );
    }

    const item = await updateOrderItem(body.item_id, {
      keyword: body.keyword,
      client_url: body.client_url,
      price: body.price,
      status: body.status,
      live_url: body.live_url,
      live_date: body.live_date,
      notes: body.notes,
    });

    // Return updated order totals
    const updatedOrder = await getOrderById(id);

    return NextResponse.json({
      success: true,
      item,
      order: updatedOrder,
      message: 'Item updated successfully',
    });
  } catch (error) {
    console.error('[API] Order item update error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/order/[id]/items - Delete an item (item_id in query)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('item_id');

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: 'item_id query parameter is required' },
        { status: 400 }
      );
    }

    await deleteOrderItem(itemId);

    // Return updated order totals
    const updatedOrder = await getOrderById(id);

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: 'Item deleted successfully',
    });
  } catch (error) {
    console.error('[API] Order item delete error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
