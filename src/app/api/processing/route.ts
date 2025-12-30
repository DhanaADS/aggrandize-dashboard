import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { query } from '@/lib/umbrel';
import { ProcessingOrderItem, ProcessingStats } from '@/types/processing';

// GET /api/processing - List assigned tasks for current user with filters + stats
// Uses ORDER-level assignment (orders.assigned_to) instead of item-level assignments
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

    // Filter by assigned user (current user) - uses ORDER-level assignment
    conditions.push(`o.assigned_to = $${paramIndex}`);
    params.push(session.user.email);
    paramIndex++;

    // Exclude cancelled orders
    conditions.push(`o.status != 'cancelled'`);

    // Only show orders that have show_on_processing enabled (default true)
    conditions.push(`COALESCE(o.show_on_processing, true) = true`);

    // Exclude completed items (status = 'live')
    conditions.push(`oi.status != 'live'`);

    // Status filter (processing_status)
    const status = searchParams.get('status');
    if (status) {
      conditions.push(`oi.processing_status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    // Date range filters (based on order date)
    const dateFrom = searchParams.get('date_from');
    if (dateFrom) {
      conditions.push(`o.order_date >= $${paramIndex}`);
      params.push(dateFrom);
      paramIndex++;
    }

    const dateTo = searchParams.get('date_to');
    if (dateTo) {
      conditions.push(`o.order_date <= $${paramIndex}`);
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

    // Fetch tasks with order details - using ORDER-level assignment
    const tasksResult = await query<ProcessingOrderItem & {
      order_due_date?: string;
      order_date?: string;
      order_number?: string;
      client_name?: string;
      project_name?: string;
      inventory_price?: number;
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
        oi.approval_feedback,
        oi.approval_requested_at,
        oi.live_submitted_at as content_submitted_at,
        oi.live_date as published_at,
        oi.notes,
        oi.created_at,
        oi.updated_at,
        o.due_date as order_due_date,
        o.order_date,
        o.order_number,
        o.client_name,
        o.project_name,
        oi.price as inventory_price
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      ${whereClause}
      ORDER BY o.due_date ASC NULLS LAST, o.order_date DESC, oi.created_at DESC
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
      content_url: row.content_url || null,
      content_notes: row.content_notes || null,
      approval_feedback: row.approval_feedback || null,
      approval_requested_at: row.approval_requested_at || null,
      content_submitted_at: row.content_submitted_at,
      published_at: row.published_at,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      inventory_price: row.inventory_price || null,
      assignment: {
        id: row.order_id,  // Use order_id as reference
        order_item_id: row.id,
        assigned_to: session.user.email,
        assigned_by: null,
        assigned_at: row.order_date || row.created_at,
        due_date: row.order_due_date || null,  // From orders.due_date
        priority: 'normal',  // Default - no item-level priority with order-level assignment
        notes: null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
      order: {
        order_number: row.order_number || '',
        client_name: row.client_name || '',
        project_name: row.project_name || null,
      },
    }));

    // Get statistics for current user - using ORDER-level assignment
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
        COUNT(*) FILTER (WHERE o.due_date < CURRENT_DATE AND oi.status != 'live') as overdue_count,
        COUNT(*) as my_tasks_count
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.assigned_to = $1
        AND o.status != 'cancelled'
        AND COALESCE(o.show_on_processing, true) = true
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
