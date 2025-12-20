import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, queryOne } from '@/lib/umbrel/query-wrapper';
import { getOrderById } from '@/lib/umbrel';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface OrderItemAssignmentWithDetails {
  id: string;
  order_item_id: string;
  assigned_to: string;
  assigned_by: string;
  due_date: string | null;
  priority: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Order item details
  item_website: string;
  item_keyword: string;
  item_client_url: string;
  item_price: number;
  item_status: string;
  item_processing_status: string | null;
  item_live_url: string | null;
  item_live_date: string | null;
}

// GET /api/order/[id]/assignments - List all assignments for an order
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has canAccessOrder permission (Marketing/Admin only)
    const userPermissions = (session.user as any).permissions;
    if (!userPermissions?.canAccessOrder) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Marketing or Admin access required.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Verify order exists
    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Get all assignments for items in this order with item details
    const assignments = await query<OrderItemAssignmentWithDetails>(
      `SELECT
         a.id,
         a.order_item_id,
         a.assigned_to,
         a.assigned_by,
         a.due_date,
         a.priority,
         a.notes,
         a.created_at,
         a.updated_at,
         i.website as item_website,
         i.keyword as item_keyword,
         i.client_url as item_client_url,
         i.price as item_price,
         i.status as item_status,
         i.processing_status as item_processing_status,
         i.live_url as item_live_url,
         i.live_date as item_live_date
       FROM order_item_assignments a
       INNER JOIN order_items i ON a.order_item_id = i.id
       WHERE i.order_id = $1
       ORDER BY a.created_at DESC`,
      [id]
    );

    return NextResponse.json({
      success: true,
      assignments: assignments.rows,
      count: assignments.rows.length,
      order: {
        id: order.id,
        order_number: order.order_number,
        client_name: order.client_name,
        status: order.status,
      },
    });
  } catch (error) {
    console.error('[API] Order assignments list error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
