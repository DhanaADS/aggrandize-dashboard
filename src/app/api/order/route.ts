import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import {
  getOrders,
  createOrder,
  getOrderStats,
  addOrderItem,
  getOrderById,
} from '@/lib/umbrel';
import { query } from '@/lib/umbrel/query-wrapper';

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
    assigned_to: searchParams.get('assigned_to') || undefined,
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
      getOrderStats(filters.date_from ? { date_from: filters.date_from } : undefined),
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

// POST /api/order - Create new order (optionally with items and assignments)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email || 'system';

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

    // Add items if provided (with optional assignments)
    if (items && Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        if (item.website && item.keyword && item.client_url && item.price) {
          // Add the order item
          const createdItem = await addOrderItem(order.id, {
            publication_id: item.publication_id,
            website: item.website,
            keyword: item.keyword,
            client_url: item.client_url,
            price: item.price,
            notes: item.notes,
          });

          // If assignment data is provided, create assignments (supports multiple)
          if (item.assigned_to && createdItem?.id) {
            // Handle both single string (legacy) and array (new multi-select)
            const assignees = Array.isArray(item.assigned_to)
              ? item.assigned_to
              : [item.assigned_to];

            for (const assignee of assignees) {
              try {
                await query(
                  `INSERT INTO order_item_assignments
                   (order_item_id, assigned_to, assigned_by, due_date, priority, notes)
                   VALUES ($1, $2, $3, $4, $5, $6)`,
                  [
                    createdItem.id,
                    assignee,
                    userEmail,
                    item.assignment_due_date || null,
                    item.assignment_priority || 'normal',
                    item.assignment_notes || null,
                  ]
                );
              } catch (assignErr) {
                console.warn('[API] Failed to create assignment for item:', createdItem.id, assignee, assignErr);
              }
            }

            // Update processing_status to 'in_progress' if we assigned anyone
            if (assignees.length > 0) {
              await query(
                "UPDATE order_items SET processing_status = 'in_progress', updated_at = NOW() WHERE id = $1",
                [createdItem.id]
              );
            }
          }
        }
      }
    }

    // Fetch updated order with totals
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
