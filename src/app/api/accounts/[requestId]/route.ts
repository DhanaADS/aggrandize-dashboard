import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RouteParams {
  params: Promise<{ requestId: string }>;
}

// GET /api/accounts/[requestId] - Get single payment request details
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { requestId } = await params;

    const { data: paymentRequest, error } = await supabase
      .from('processing_payment_requests')
      .select(`
        *,
        order_item:order_items (
          id,
          order_id,
          website,
          keyword,
          client_url,
          processing_status,
          live_url,
          live_date,
          order:orders (
            order_number,
            client_name,
            project_name
          )
        )
      `)
      .eq('id', requestId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Payment request not found' },
          { status: 404 }
        );
      }
      console.error('[API] Payment request get error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Fetch names from user_profiles
    const emails = [
      paymentRequest.requested_by,
      paymentRequest.reviewed_by,
      paymentRequest.paid_by
    ].filter(Boolean);

    const { data: userProfiles } = await supabase
      .from('user_profiles')
      .select('email, full_name')
      .in('email', emails);

    const nameMap = new Map(userProfiles?.map(up => [up.email, up.full_name]) || []);

    const requesterName = nameMap.get(paymentRequest.requested_by) || paymentRequest.requested_by;
    const reviewerName = paymentRequest.reviewed_by ? nameMap.get(paymentRequest.reviewed_by) : null;
    const payerName = paymentRequest.paid_by ? nameMap.get(paymentRequest.paid_by) : null;

    return NextResponse.json({
      success: true,
      payment_request: {
        ...paymentRequest,
        requester_full_name: requesterName,
        reviewer_full_name: reviewerName,
        payer_full_name: payerName
      }
    });

  } catch (error) {
    console.error('[API] Payment request get error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
