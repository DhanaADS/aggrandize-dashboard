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

// PUT /api/accounts/[requestId]/pay - Mark payment as paid
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

    // Check if payment request exists and is approved
    const { data: existingRequest, error: fetchError } = await supabase
      .from('processing_payment_requests')
      .select('id, status, order_item_id')
      .eq('id', requestId)
      .single();

    if (fetchError || !existingRequest) {
      return NextResponse.json(
        { success: false, error: 'Payment request not found' },
        { status: 404 }
      );
    }

    // Check if payment request is approved
    if (existingRequest.status !== 'approved') {
      return NextResponse.json(
        {
          success: false,
          error: `Payment request must be approved before marking as paid. Current status: ${existingRequest.status}`
        },
        { status: 400 }
      );
    }

    // Update payment request to paid
    const { data: updatedRequest, error: updateError } = await supabase
      .from('processing_payment_requests')
      .update({
        status: 'paid',
        paid_by: session.user.email,
        paid_at: new Date().toISOString(),
        payment_reference: body.payment_reference || null,
        payment_confirmation_notes: body.payment_confirmation_notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single();

    if (updateError) {
      console.error('[API] Payment request pay error:', updateError);
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    // Update order item processing status to completed
    if (existingRequest.order_item_id) {
      const { error: itemUpdateError } = await supabase
        .from('order_items')
        .update({
          processing_status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRequest.order_item_id);

      if (itemUpdateError) {
        console.error('[API] Order item update error:', itemUpdateError);
        // Don't fail the request if order item update fails, just log it
      }
    }

    return NextResponse.json({
      success: true,
      payment_request: updatedRequest,
      message: 'Payment marked as paid successfully'
    });

  } catch (error) {
    console.error('[API] Payment request pay error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
