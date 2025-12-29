import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/umbrel/query-wrapper';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userName = searchParams.get('user');

    // Get current month's date range
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayStr = firstDayOfMonth.toISOString().split('T')[0];

    // Get overall stats for this month
    const statsResult = await query(`
      SELECT
        COUNT(*)::int as total_orders,
        COUNT(*) FILTER (WHERE status = 'completed')::int as completed,
        COUNT(*) FILTER (WHERE status = 'in_progress')::int as in_progress,
        COUNT(*) FILTER (WHERE status = 'confirmed')::int as confirmed,
        COUNT(*) FILTER (WHERE status = 'draft')::int as draft
      FROM orders
      WHERE order_date >= $1
    `, [firstDayStr]);

    const overallStats = statsResult.rows?.[0] || {
      total_orders: 0,
      completed: 0,
      in_progress: 0,
      confirmed: 0,
      draft: 0,
    };

    // Get user-specific stats if userName provided
    let myOrders = 0;
    let pendingApproval = 0;

    if (userName) {
      // Count orders assigned to this user
      const userOrdersResult = await query(`
        SELECT COUNT(*)::int as count
        FROM orders
        WHERE assigned_to = $1
        AND order_date >= $2
      `, [userName, firstDayStr]);
      myOrders = userOrdersResult.rows?.[0]?.count || 0;

      // Count items pending approval (for this user's orders)
      const pendingResult = await query(`
        SELECT COUNT(*)::int as count
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.assigned_to = $1
        AND oi.status IN ('ready_for_approval', 'in_progress')
      `, [userName]);
      pendingApproval = pendingResult.rows?.[0]?.count || 0;
    }

    return NextResponse.json({
      totalOrders: overallStats.total_orders,
      myOrders,
      pendingApproval,
      completed: overallStats.completed,
      inProgress: overallStats.in_progress,
      confirmed: overallStats.confirmed,
      draft: overallStats.draft,
    });
  } catch (error) {
    console.error('[API] Order stats error:', error);
    return NextResponse.json({
      totalOrders: 0,
      myOrders: 0,
      pendingApproval: 0,
      completed: 0,
      inProgress: 0,
      confirmed: 0,
      draft: 0,
    });
  }
}
