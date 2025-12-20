import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/accounts - List all payment requests with filters
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

    const { searchParams } = new URL(request.url);

    // Build query
    let query = supabase
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
          order:orders (
            order_number,
            client_name,
            project_name
          )
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    const status = searchParams.get('status');
    if (status) {
      query = query.eq('status', status);
    }

    const requestedBy = searchParams.get('requested_by');
    if (requestedBy) {
      query = query.eq('requested_by', requestedBy);
    }

    const paymentMethod = searchParams.get('payment_method');
    if (paymentMethod) {
      query = query.eq('payment_method', paymentMethod);
    }

    const dateFrom = searchParams.get('date_from');
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    const dateTo = searchParams.get('date_to');
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const { data: paymentRequests, error } = await query;

    if (error) {
      console.error('[API] Payment requests list error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Fetch requester names from user_profiles
    const uniqueRequesters = [...new Set(paymentRequests?.map(pr => pr.requested_by) || [])];
    const { data: userProfiles } = await supabase
      .from('user_profiles')
      .select('email, full_name')
      .in('email', uniqueRequesters);

    // Create a map of email to name
    const nameMap = new Map(userProfiles?.map(up => [up.email, up.full_name]) || []);

    // Add requester names to payment requests
    const enrichedPaymentRequests = paymentRequests?.map(pr => ({
      ...pr,
      requester_full_name: nameMap.get(pr.requested_by) || pr.requested_by
    }));

    return NextResponse.json({
      success: true,
      payment_requests: enrichedPaymentRequests,
      count: enrichedPaymentRequests?.length || 0
    });

  } catch (error) {
    console.error('[API] Payment requests list error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
