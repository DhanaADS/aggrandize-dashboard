import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { query } from '@/lib/umbrel';

interface PendingApprovalItem {
  id: string;
  order_id: string;
  website: string;
  keyword: string;
  client_url: string;
  content_url: string | null;
  content_notes: string | null;
  processing_status: string;
  approval_requested_at: string | null;
  order_number: string;
  client_name: string;
  project_name: string | null;
  assigned_to: string | null;
}

// GET /api/approvals - List all items pending approval (Marketing/Admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has canAccessOrder permission (Marketing/Admin only)
    const userPermissions = (session.user as any).permissions;
    const isAdmin = session.user.role === 'admin' ||
      ['dhana@aggrandizedigital.com', 'saravana@aggrandizedigital.com'].includes(session.user.email);

    if (!isAdmin && !userPermissions?.canAccessOrder) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Marketing or Admin access required.' },
        { status: 403 }
      );
    }

    // Fetch all items with pending_approval status
    const result = await query<PendingApprovalItem>(`
      SELECT
        oi.id,
        oi.order_id,
        oi.website,
        oi.keyword,
        oi.client_url,
        oi.content_url,
        oi.content_notes,
        oi.processing_status,
        oi.approval_requested_at,
        o.order_number,
        o.client_name,
        o.project_name,
        o.assigned_to
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.processing_status = 'pending_approval'
        AND o.status != 'cancelled'
      ORDER BY oi.approval_requested_at ASC NULLS LAST, oi.created_at DESC
    `);

    return NextResponse.json({
      success: true,
      items: result.rows,
      count: result.rows.length,
    });

  } catch (error) {
    console.error('[API] Approvals list error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
