import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, queryOne } from '@/lib/umbrel/query-wrapper';

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

interface OrderItem {
  id: string;
  order_id: string;
  website: string;
  keyword: string;
  processing_status: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
}

// POST /api/order/[id]/items/[itemId]/approve - Approve or reject content submitted by processing team
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const { id, itemId } = await params;
    const body = await request.json();

    // Validate required fields
    if (!body.action || !['approve', 'reject'].includes(body.action)) {
      return NextResponse.json(
        { success: false, error: 'action must be either "approve" or "reject"' },
        { status: 400 }
      );
    }

    // For rejection, require a reason
    if (body.action === 'reject' && !body.rejection_reason) {
      return NextResponse.json(
        { success: false, error: 'rejection_reason is required when rejecting' },
        { status: 400 }
      );
    }

    // Verify order item exists and belongs to the order
    const itemCheck = await queryOne<{ id: string; order_id: string }>(
      'SELECT id, order_id FROM order_items WHERE id = $1 AND order_id = $2',
      [itemId, id]
    );

    if (!itemCheck) {
      return NextResponse.json(
        { success: false, error: 'Order item not found or does not belong to this order' },
        { status: 404 }
      );
    }

    let updatedItem: OrderItem | null = null;

    if (body.action === 'approve') {
      // Approve: Set approved_by, approved_at, processing_status to 'approved'
      updatedItem = await queryOne<OrderItem>(
        `UPDATE order_items
         SET processing_status = 'approved',
             approved_by = $1,
             approved_at = NOW(),
             rejection_reason = NULL,
             updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [session.user.email, itemId]
      );
    } else {
      // Reject: Set rejection_reason, processing_status back to 'content_writing'
      updatedItem = await queryOne<OrderItem>(
        `UPDATE order_items
         SET processing_status = 'content_writing',
             rejection_reason = $1,
             approved_by = NULL,
             approved_at = NULL,
             updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [body.rejection_reason, itemId]
      );
    }

    return NextResponse.json({
      success: true,
      item: updatedItem,
      message: body.action === 'approve'
        ? 'Content approved successfully'
        : 'Content rejected and sent back for revision',
    });
  } catch (error) {
    console.error('[API] Order item approval error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
