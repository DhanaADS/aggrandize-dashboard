import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { query } from '@/lib/umbrel/query-wrapper';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  employee_no: string | null;
  monthly_salary_inr: number | null;
  designation: string | null;
  role: string;
}

interface SalaryPayment {
  employee_id: string;
  payment_status: 'paid' | 'not_paid';
  payment_date: string | null;
  notes: string | null;
}

// GET /api/salary-payments - Get salary payment status for all employees for a specific month
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // Format: YYYY-MM

    if (!month) {
      return NextResponse.json(
        { error: 'Month parameter is required (format: YYYY-MM)' },
        { status: 400 }
      );
    }

    // Check NextAuth session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can access salary payments
    const isAdmin = session.user.role === 'admin' ||
      ['dhana@aggrandizedigital.com', 'saravana@aggrandizedigital.com'].includes(session.user.email);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all employees with their salary information from Umbrel
    const employeesResult = await query<UserProfile>(
      'SELECT id, email, full_name, employee_no, monthly_salary_inr, designation, role FROM user_profiles ORDER BY employee_no'
    );
    const employees = employeesResult.rows || [];

    // Get payment status for the specified month from Umbrel
    let payments: SalaryPayment[] = [];
    try {
      const paymentsResult = await query<SalaryPayment>(
        'SELECT employee_id, payment_status, payment_date, notes FROM monthly_salary_payments WHERE payment_month = $1',
        [month]
      );
      payments = paymentsResult.rows || [];
    } catch (err) {
      console.error('Error fetching payments (table may not exist yet):', err);
      // If table doesn't exist, default to not_paid for current month, paid for past
      const [year, monthNum] = month.split('-');
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;

      // For months before current, mark as paid
      const isPastMonth = parseInt(year) < currentYear ||
        (parseInt(year) === currentYear && parseInt(monthNum) < currentMonth);

      payments = employees.map(emp => ({
        employee_id: emp.id,
        payment_status: isPastMonth ? 'paid' : 'not_paid',
        payment_date: isPastMonth ? `${year}-${monthNum.padStart(2, '0')}-01` : null,
        notes: isPastMonth ? 'Historical payment' : null
      }));
    }

    // Combine employee data with payment status
    const employeePayments = employees.map(employee => {
      const payment = payments.find(p => p.employee_id === employee.id);
      return {
        employee,
        payment_status: payment?.payment_status || 'not_paid',
        payment_date: payment?.payment_date,
        notes: payment?.notes
      };
    });

    // Calculate totals (convert decimal strings from DB to numbers)
    const totalEmployees = employees.length;
    const totalPaid = employeePayments.filter(ep => ep.payment_status === 'paid').length;
    const totalPending = totalEmployees - totalPaid;
    const totalSalaryAmount = employees.reduce((sum, emp) => sum + (Number(emp.monthly_salary_inr) || 0), 0);
    const totalPaidAmount = employeePayments
      .filter(ep => ep.payment_status === 'paid')
      .reduce((sum, ep) => sum + (Number(ep.employee.monthly_salary_inr) || 0), 0);
    const totalPendingAmount = totalSalaryAmount - totalPaidAmount;

    const result = {
      month,
      employees: employeePayments,
      total_employees: totalEmployees,
      total_paid: totalPaid,
      total_pending: totalPending,
      total_salary_amount: totalSalaryAmount,
      total_paid_amount: totalPaidAmount,
      total_pending_amount: totalPendingAmount
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching salary payments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/salary-payments - Update payment status for an employee
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employee_id, payment_month, payment_status, notes } = body;

    // Validate required fields
    if (!employee_id || !payment_month || !payment_status) {
      return NextResponse.json(
        { error: 'employee_id, payment_month, and payment_status are required' },
        { status: 400 }
      );
    }

    if (!['paid', 'not_paid'].includes(payment_status)) {
      return NextResponse.json(
        { error: 'payment_status must be either "paid" or "not_paid"' },
        { status: 400 }
      );
    }

    // Check NextAuth session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can update salary payments
    const isAdmin = session.user.role === 'admin' ||
      ['dhana@aggrandizedigital.com', 'saravana@aggrandizedigital.com'].includes(session.user.email);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Upsert payment record in Umbrel
    const paymentDate = payment_status === 'paid' ? new Date().toISOString() : null;

    const result = await query<SalaryPayment>(`
      INSERT INTO monthly_salary_payments (employee_id, payment_month, payment_status, payment_date, notes)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (employee_id, payment_month)
      DO UPDATE SET payment_status = $3, payment_date = $4, notes = $5, updated_at = NOW()
      RETURNING *
    `, [employee_id, payment_month, payment_status, paymentDate, notes || null]);

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update payment status' },
        { status: 500 }
      );
    }

    return NextResponse.json(result.rows[0], { status: 200 });
  } catch (error) {
    console.error('Error updating salary payment:', error);

    // Check for missing table error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('relation "monthly_salary_payments" does not exist')) {
      return NextResponse.json(
        { error: 'Database table not found. Please run the database schema update first.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
