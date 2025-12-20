import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { query, queryOne } from '@/lib/umbrel';
import { ProcessingOrderItem } from '@/types/processing';

// GET /api/processing/[itemId] - Get single task details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId } = await params;

    // Fetch task details with order info (EXCLUDING price field)
    const taskResult = await queryOne<ProcessingOrderItem & {
      assignment_id?: string;
      assignment_due_date?: string;
      assignment_priority?: string;
      assignment_notes?: string;
      assignment_assigned_to?: string;
      assignment_assigned_by?: string;
      assignment_assigned_at?: string;
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
        oia.assigned_to as assignment_assigned_to,
        oia.assigned_by as assignment_assigned_by,
        oia.assigned_at as assignment_assigned_at,
        oia.due_date as assignment_due_date,
        oia.priority as assignment_priority,
        oia.notes as assignment_notes,
        o.order_number,
        o.client_name,
        o.project_name
      FROM order_items oi
      LEFT JOIN order_item_assignments oia ON oia.order_item_id = oi.id
      LEFT JOIN orders o ON o.id = oi.order_id
      WHERE oi.id = $1
    `, [itemId]);

    if (!taskResult) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Verify the task is assigned to the current user (unless admin)
    if (
      session.user.role !== 'admin' &&
      taskResult.assignment_assigned_to !== session.user.email
    ) {
      return NextResponse.json({ error: 'Unauthorized access to this task' }, { status: 403 });
    }

    // Transform to proper structure
    const task: ProcessingOrderItem = {
      id: taskResult.id,
      order_id: taskResult.order_id,
      publication_id: taskResult.publication_id,
      website: taskResult.website,
      keyword: taskResult.keyword,
      client_url: taskResult.client_url,
      processing_status: taskResult.processing_status,
      live_url: taskResult.live_url,
      live_date: taskResult.live_date,
      content_submitted_at: taskResult.content_submitted_at,
      published_at: taskResult.published_at,
      notes: taskResult.notes,
      created_at: taskResult.created_at,
      updated_at: taskResult.updated_at,
      assignment: taskResult.assignment_id ? {
        id: taskResult.assignment_id,
        order_item_id: taskResult.id,
        assigned_to: taskResult.assignment_assigned_to || '',
        assigned_by: taskResult.assignment_assigned_by,
        assigned_at: taskResult.assignment_assigned_at || taskResult.created_at,
        due_date: taskResult.assignment_due_date || null,
        priority: (taskResult.assignment_priority as any) || 'normal',
        notes: taskResult.assignment_notes || null,
        created_at: taskResult.created_at,
        updated_at: taskResult.updated_at,
      } : undefined,
      order: {
        order_number: taskResult.order_number || '',
        client_name: taskResult.client_name || '',
        project_name: taskResult.project_name || null,
      },
    };

    return NextResponse.json({
      success: true,
      task,
    });

  } catch (error) {
    console.error('[API] Processing task get error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT /api/processing/[itemId] - Update processing status, content URL, notes
export async function PUT(
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
      return NextResponse.json({ error: 'Unauthorized to update this task' }, { status: 403 });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (body.processing_status !== undefined) {
      updates.push(`processing_status = $${paramIndex}`);
      params.push(body.processing_status);
      paramIndex++;
    }

    if (body.content_url !== undefined) {
      updates.push(`content_url = $${paramIndex}`);
      params.push(body.content_url);
      paramIndex++;
    }

    if (body.content_notes !== undefined) {
      updates.push(`content_notes = $${paramIndex}`);
      params.push(body.content_notes);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Add itemId as final parameter
    params.push(itemId);

    // Execute update
    const result = await query<ProcessingOrderItem>(
      `UPDATE order_items
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      task: result.rows[0],
      message: 'Task updated successfully',
    });

  } catch (error) {
    console.error('[API] Processing task update error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
