import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { query, queryOne } from '@/lib/umbrel';

// POST /api/processing/[itemId]/request-payment - Create payment request
export async function POST(
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

    // Validate required fields
    if (!body.amount || !body.payment_method) {
      return NextResponse.json({
        error: 'amount and payment_method are required'
      }, { status: 400 });
    }

    // Validate payment method
    const validPaymentMethods = ['wise', 'paypal', 'bank_transfer'];
    if (!validPaymentMethods.includes(body.payment_method)) {
      return NextResponse.json({
        error: 'Invalid payment_method. Must be one of: wise, paypal, bank_transfer'
      }, { status: 400 });
    }

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
      return NextResponse.json({ error: 'Unauthorized to request payment for this task' }, { status: 403 });
    }

    // Verify task exists
    const taskCheck = await queryOne<{ id: string }>(`
      SELECT id
      FROM order_items
      WHERE id = $1
    `, [itemId]);

    if (!taskCheck) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Create payment request
    const paymentRequestResult = await query(`
      INSERT INTO processing_payment_requests (
        order_item_id,
        requested_by,
        amount,
        payment_method,
        payment_link,
        invoice_number,
        notes,
        status,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW(), NOW())
      RETURNING *
    `, [
      itemId,
      session.user.email,
      body.amount,
      body.payment_method,
      body.payment_link || null,
      body.invoice_number || null,
      body.notes || null,
    ]);

    if (paymentRequestResult.rows.length === 0) {
      return NextResponse.json({ error: 'Failed to create payment request' }, { status: 500 });
    }

    // Update task status to payment_requested
    await query(`
      UPDATE order_items
      SET
        processing_status = 'payment_requested',
        updated_at = NOW()
      WHERE id = $1
    `, [itemId]);

    return NextResponse.json({
      success: true,
      payment_request: paymentRequestResult.rows[0],
      message: 'Payment request created successfully',
    });

  } catch (error) {
    console.error('[API] Processing request payment error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
