import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { query, queryOne } from '@/lib/umbrel';

// POST /api/processing/[itemId]/submit-approval - Submit article for Marketing approval
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
    const body = await request.json();
    const { content_url, notes } = body;

    // Verify content_url is provided
    if (!content_url || !content_url.trim()) {
      return NextResponse.json({
        error: 'Article link (content_url) is required'
      }, { status: 400 });
    }

    // Verify the task is assigned to the current user via ORDER-level assignment
    const assignmentCheck = await queryOne<{ assigned_to: string }>(`
      SELECT o.assigned_to
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.id = $1
    `, [itemId]);

    if (!assignmentCheck) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check authorization (order assignee or admin)
    const isAdmin = session.user.role === 'admin' ||
      ['dhana@aggrandizedigital.com', 'saravana@aggrandizedigital.com'].includes(session.user.email);

    if (!isAdmin && assignmentCheck.assigned_to !== session.user.email) {
      return NextResponse.json({ error: 'Unauthorized to submit this task for approval' }, { status: 403 });
    }

    // Update task: set content_url, status to pending_approval, clear any previous feedback
    const result = await query(`
      UPDATE order_items
      SET
        content_url = $2,
        content_notes = $3,
        processing_status = 'pending_approval',
        approval_feedback = NULL,
        approval_requested_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [itemId, content_url.trim(), notes || null]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Failed to submit for approval' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      task: result.rows[0],
      message: 'Article submitted for approval successfully',
    });

  } catch (error) {
    console.error('[API] Processing submit approval error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
