import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { query, queryOne } from '@/lib/umbrel';

// POST /api/processing/[itemId]/submit-approval - Request approval from Marketing
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId } = await params;

    // Verify the task is assigned to the current user (unless admin)
    const assignmentCheck = await queryOne<{ assigned_to: string }>(`
      SELECT assigned_to
      FROM order_item_assignments
      WHERE order_item_id = $1
    `, [itemId]);

    if (
      !assignmentCheck ||
      (session.user.role !== 'admin' && assignmentCheck.assigned_to !== session.user.email)
    ) {
      return NextResponse.json({ error: 'Unauthorized to submit this task for approval' }, { status: 403 });
    }

    // Verify task exists and has content URL
    const taskCheck = await queryOne<{ content_url: string | null; processing_status: string }>(`
      SELECT content_url, processing_status
      FROM order_items
      WHERE id = $1
    `, [itemId]);

    if (!taskCheck) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!taskCheck.content_url) {
      return NextResponse.json({
        error: 'Cannot submit for approval without content URL. Please add content URL first.'
      }, { status: 400 });
    }

    // Update task to pending_approval status
    const result = await query(`
      UPDATE order_items
      SET
        processing_status = 'pending_approval',
        approval_requested_at = NOW(),
        content_submitted_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [itemId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Failed to submit for approval' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      task: result.rows[0],
      message: 'Task submitted for approval successfully',
    });

  } catch (error) {
    console.error('[API] Processing submit approval error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
