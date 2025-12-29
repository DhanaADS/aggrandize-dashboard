import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { query } from '@/lib/umbrel';
import { ProcessingStats } from '@/types/processing';

// GET /api/processing/stats - Get processing statistics for current user
// Uses ORDER-level assignment (orders.assigned_to) instead of item-level assignments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get comprehensive statistics for the current processing user
    // Using ORDER-level assignment (orders.assigned_to)
    const statsResult = await query<ProcessingStats>(`
      SELECT
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE oi.processing_status = 'not_started' OR oi.processing_status IS NULL) as not_started_count,
        COUNT(*) FILTER (WHERE oi.processing_status = 'in_progress') as in_progress_count,
        COUNT(*) FILTER (WHERE oi.processing_status = 'content_writing') as content_writing_count,
        COUNT(*) FILTER (WHERE oi.processing_status = 'pending_approval') as pending_approval_count,
        COUNT(*) FILTER (WHERE oi.processing_status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE oi.processing_status = 'publishing') as publishing_count,
        COUNT(*) FILTER (WHERE oi.processing_status = 'published') as published_count,
        COUNT(*) FILTER (WHERE oi.processing_status = 'payment_requested') as payment_requested_count,
        COUNT(*) FILTER (WHERE oi.processing_status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE o.due_date < CURRENT_DATE AND oi.processing_status NOT IN ('completed', 'published')) as overdue_count,
        COUNT(*) as my_tasks_count
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.assigned_to = $1
        AND o.status != 'cancelled'
        AND oi.status != 'live'
    `, [session.user.email]);

    const stats = statsResult.rows[0] || {
      total_tasks: 0,
      not_started_count: 0,
      in_progress_count: 0,
      content_writing_count: 0,
      pending_approval_count: 0,
      approved_count: 0,
      publishing_count: 0,
      published_count: 0,
      payment_requested_count: 0,
      completed_count: 0,
      overdue_count: 0,
      my_tasks_count: 0,
    };

    return NextResponse.json({
      success: true,
      stats,
    });

  } catch (error) {
    console.error('[API] Processing stats error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
