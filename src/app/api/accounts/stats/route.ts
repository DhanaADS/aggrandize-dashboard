import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/accounts/stats - Get payment request statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has access to accounts
    if (!session.user.permissions?.canAccessAccounts && session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Accounts access required' },
        { status: 403 }
      );
    }

    // Fetch all payment requests
    const { data: paymentRequests, error } = await supabase
      .from('processing_payment_requests')
      .select('id, status, amount');

    if (error) {
      console.error('[API] Payment requests stats error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Calculate statistics
    const totalRequests = paymentRequests?.length || 0;
    const pendingCount = paymentRequests?.filter(pr => pr.status === 'pending').length || 0;
    const approvedCount = paymentRequests?.filter(pr => pr.status === 'approved').length || 0;
    const rejectedCount = paymentRequests?.filter(pr => pr.status === 'rejected').length || 0;
    const paidCount = paymentRequests?.filter(pr => pr.status === 'paid').length || 0;

    const totalPendingAmount = paymentRequests
      ?.filter(pr => pr.status === 'pending')
      .reduce((sum, pr) => sum + (pr.amount || 0), 0) || 0;

    const totalApprovedAmount = paymentRequests
      ?.filter(pr => pr.status === 'approved')
      .reduce((sum, pr) => sum + (pr.amount || 0), 0) || 0;

    const totalPaidAmount = paymentRequests
      ?.filter(pr => pr.status === 'paid')
      .reduce((sum, pr) => sum + (pr.amount || 0), 0) || 0;

    return NextResponse.json({
      success: true,
      stats: {
        total_requests: totalRequests,
        pending_count: pendingCount,
        approved_count: approvedCount,
        rejected_count: rejectedCount,
        paid_count: paidCount,
        total_pending_amount: totalPendingAmount,
        total_approved_amount: totalApprovedAmount,
        total_paid_amount: totalPaidAmount
      }
    });

  } catch (error) {
    console.error('[API] Payment requests stats error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
