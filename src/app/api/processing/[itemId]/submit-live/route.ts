import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { query, queryOne } from '@/lib/umbrel';

// POST /api/processing/[itemId]/submit-live - Submit live URL after publishing
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

    // Validate required fields
    if (!body.live_url) {
      return NextResponse.json({ error: 'live_url is required' }, { status: 400 });
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
      return NextResponse.json({ error: 'Unauthorized to submit live URL for this task' }, { status: 403 });
    }

    // Verify task exists
    const taskCheck = await queryOne<{ id: string; processing_status: string }>(`
      SELECT id, processing_status
      FROM order_items
      WHERE id = $1
    `, [itemId]);

    if (!taskCheck) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Update task with live URL and mark as published
    const result = await query(`
      UPDATE order_items
      SET
        live_url = $1,
        live_date = CURRENT_DATE,
        live_submitted_by = $2,
        live_submitted_at = NOW(),
        processing_status = 'published',
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [body.live_url, session.user.email, itemId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Failed to submit live URL' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      task: result.rows[0],
      message: 'Live URL submitted successfully and task marked as published',
    });

  } catch (error) {
    console.error('[API] Processing submit live error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
