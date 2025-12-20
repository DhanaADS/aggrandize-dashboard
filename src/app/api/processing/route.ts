import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { query } from '@/lib/umbrel';
import { ProcessingOrderItem, ProcessingStats } from '@/types/processing';

// GET /api/processing - List assigned tasks for current user with filters + stats
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Build WHERE conditions
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Filter by assigned user (current user)
    conditions.push(`oia.assigned_to = $${paramIndex}`);
    params.push(session.user.email);
    paramIndex++;

    // Status filter
    const status = searchParams.get('status');
    if (status) {
      conditions.push(`oi.processing_status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    // Priority filter
    const priority = searchParams.get('priority');
    if (priority) {
      conditions.push(`oia.priority = $${paramIndex}`);
      params.push(priority);
      paramIndex++;
    }

    // Date range filters
    const dateFrom = searchParams.get('date_from');
    if (dateFrom) {
      conditions.push(`oia.assigned_at >= $${paramIndex}`);
      params.push(dateFrom);
      paramIndex++;
    }

    const dateTo = searchParams.get('date_to');
    if (dateTo) {
      conditions.push(`oia.assigned_at <= $${paramIndex}`);
      params.push(dateTo);
      paramIndex++;
    }

    // Search filter (keyword, website, client)
    const search = searchParams.get('search');
    if (search) {
      conditions.push(`(
        oi.keyword ILIKE $${paramIndex} OR
        oi.website ILIKE $${paramIndex} OR
        o.client_name ILIKE $${paramIndex} OR
        o.project_name ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Fetch tasks with order details (EXCLUDING price field)
    const tasksResult = await query<ProcessingOrderItem & {
      assignment_id?: string;
      assignment_due_date?: string;
      assignment_priority?: string;
      assignment_notes?: string;
      order_number?: string;
      client_name?: string;
      project_name?: string;
    }>(`
      SELECT
        oi.id,
        oi.order_id,
        oi.publication_id,
        oi.website,
        oi.keyword,
        oi.client_url,
        oi.processing_status,
        oi.live_url,
        oi.live_date,
        oi.content_url,
        oi.content_notes,
        oi.content_submitted_at,
        oi.published_at,
        oi.notes,
        oi.created_at,
        oi.updated_at,
        oia.id as assignment_id,
        oia.due_date as assignment_due_date,
        oia.priority as assignment_priority,
        oia.notes as assignment_notes,
        o.order_number,
        o.client_name,
        o.project_name
      FROM order_item_assignments oia
      JOIN order_items oi ON oi.id = oia.order_item_id
      JOIN orders o ON o.id = oi.order_id
      ${whereClause}
      ORDER BY oia.priority DESC, oia.due_date ASC NULLS LAST, oia.created_at DESC
    `, params);

    // Transform results to include nested assignment and order data
    const tasks: ProcessingOrderItem[] = tasksResult.rows.map(row => ({
      id: row.id,
      order_id: row.order_id,
      publication_id: row.publication_id,
      website: row.website,
      keyword: row.keyword,
      client_url: row.client_url,
      processing_status: row.processing_status,
      live_url: row.live_url,
      live_date: row.live_date,
      content_submitted_at: row.content_submitted_at,
      published_at: row.published_at,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      assignment: {
        id: row.assignment_id || '',
        order_item_id: row.id,
        assigned_to: session.user.email,
        assigned_by: null,
        assigned_at: row.created_at,
        due_date: row.assignment_due_date || null,
        priority: (row.assignment_priority as any) || 'normal',
        notes: row.assignment_notes || null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
      order: {
        order_number: row.order_number || '',
        client_name: row.client_name || '',
        project_name: row.project_name || null,
      },
    }));

    // Get statistics for current user
    const statsResult = await query<ProcessingStats>(`
      SELECT
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE oi.processing_status = 'not_started') as not_started_count,
        COUNT(*) FILTER (WHERE oi.processing_status = 'in_progress') as in_progress_count,
        COUNT(*) FILTER (WHERE oi.processing_status = 'content_writing') as content_writing_count,
        COUNT(*) FILTER (WHERE oi.processing_status = 'pending_approval') as pending_approval_count,
        COUNT(*) FILTER (WHERE oi.processing_status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE oi.processing_status = 'publishing') as publishing_count,
        COUNT(*) FILTER (WHERE oi.processing_status = 'published') as published_count,
        COUNT(*) FILTER (WHERE oi.processing_status = 'payment_requested') as payment_requested_count,
        COUNT(*) FILTER (WHERE oi.processing_status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE oia.due_date < CURRENT_DATE AND oi.processing_status NOT IN ('completed', 'published')) as overdue_count,
        COUNT(*) as my_tasks_count
      FROM order_item_assignments oia
      JOIN order_items oi ON oi.id = oia.order_item_id
      WHERE oia.assigned_to = $1
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
      tasks,
      stats,
      count: tasks.length,
    });

  } catch (error) {
    console.error('[API] Processing list error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
