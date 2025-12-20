import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, queryOne } from '@/lib/umbrel/query-wrapper';

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

interface OrderItemAssignment {
  id: string;
  order_item_id: string;
  assigned_to: string;
  assigned_by: string;
  due_date: string | null;
  priority: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// POST /api/order/[id]/items/[itemId]/assign - Assign order item to processing team member
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
    if (!body.assigned_to) {
      return NextResponse.json(
        { success: false, error: 'assigned_to is required' },
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

    // Create assignment entry
    const assignment = await queryOne<OrderItemAssignment>(
      `INSERT INTO order_item_assignments
       (order_item_id, assigned_to, assigned_by, due_date, priority, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        itemId,
        body.assigned_to,
        session.user.email,
        body.due_date || null,
        body.priority || 'normal',
        body.notes || null,
      ]
    );

    // Get current processing status
    const currentItem = await queryOne<{ processing_status: string | null }>(
      'SELECT processing_status FROM order_items WHERE id = $1',
      [itemId]
    );

    // Update order_item processing_status to 'in_progress' if it was 'not_started' or null
    if (!currentItem?.processing_status || currentItem.processing_status === 'not_started') {
      await query(
        "UPDATE order_items SET processing_status = 'in_progress', updated_at = NOW() WHERE id = $1",
        [itemId]
      );
    }

    return NextResponse.json({
      success: true,
      assignment,
      message: `Item assigned to ${body.assigned_to} successfully`,
    });
  } catch (error) {
    console.error('[API] Order item assignment error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/order/[id]/items/[itemId]/assign - Remove assignment (unassign)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignment_id');

    if (!assignmentId) {
      return NextResponse.json(
        { success: false, error: 'assignment_id query parameter is required' },
        { status: 400 }
      );
    }

    // Verify assignment exists and belongs to this order item
    const assignmentCheck = await queryOne<{ id: string; order_item_id: string }>(
      'SELECT id, order_item_id FROM order_item_assignments WHERE id = $1 AND order_item_id = $2',
      [assignmentId, itemId]
    );

    if (!assignmentCheck) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found or does not belong to this order item' },
        { status: 404 }
      );
    }

    // Delete the assignment
    await query(
      'DELETE FROM order_item_assignments WHERE id = $1',
      [assignmentId]
    );

    // Check if there are any remaining assignments
    const remainingAssignments = await query<{ id: string }>(
      'SELECT id FROM order_item_assignments WHERE order_item_id = $1',
      [itemId]
    );

    // If no more assignments, reset processing_status to 'not_started'
    if (remainingAssignments.rows.length === 0) {
      await query(
        "UPDATE order_items SET processing_status = 'not_started', updated_at = NOW() WHERE id = $1",
        [itemId]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Assignment removed successfully',
    });
  } catch (error) {
    console.error('[API] Order item unassign error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
