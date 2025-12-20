import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RouteParams {
  params: Promise<{ requestId: string }>;
}

// PUT /api/accounts/[requestId]/review - Approve or reject payment request
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    const body = await request.json();

    // Validate required fields
    if (!body.status || !['approved', 'rejected'].includes(body.status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Must be "approved" or "rejected"' },
        { status: 400 }
      );
    }

    // Check if payment request exists
    const { data: existingRequest, error: fetchError } = await supabase
      .from('processing_payment_requests')
      .select('id, status')
      .eq('id', requestId)
      .single();

    if (fetchError || !existingRequest) {
      return NextResponse.json(
        { success: false, error: 'Payment request not found' },
        { status: 404 }
      );
    }

    // Check if already reviewed or paid
    if (existingRequest.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Payment request is already ${existingRequest.status}` },
        { status: 400 }
      );
    }

    // Update payment request
    const { data: updatedRequest, error: updateError } = await supabase
      .from('processing_payment_requests')
      .update({
        status: body.status,
        reviewed_by: session.user.email,
        reviewed_at: new Date().toISOString(),
        review_notes: body.review_notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single();

    if (updateError) {
      console.error('[API] Payment request review error:', updateError);
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      payment_request: updatedRequest,
      message: `Payment request ${body.status} successfully`
    });

  } catch (error) {
    console.error('[API] Payment request review error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
