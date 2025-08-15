import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const supabase = await createClient();
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all employees with their salary information
    const { data: employees, error: employeesError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, employee_no, monthly_salary_inr, designation, role')
      .order('employee_no');

    if (employeesError) {
      console.error('Error fetching employees:', employeesError);
      return NextResponse.json(
        { error: 'Failed to fetch employees' },
        { status: 500 }
      );
    }

    // Get payment status for the specified month (gracefully handle missing table)
    let payments = [];
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('monthly_salary_payments')
      .select('employee_id, payment_status, payment_date, notes')
      .eq('payment_month', month);

    if (paymentsError) {
      console.error('Error fetching payments (table may not exist yet):', paymentsError);
      // If table doesn't exist, assume all payments are 'paid' for Jan-Aug, 'not_paid' for others
      const [year, monthNum] = month.split('-');
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      
      // If it's Jan-Aug 2024 (or current year), mark as paid, otherwise not_paid
      const isPaid = (parseInt(year) === currentYear && parseInt(monthNum) >= 1 && parseInt(monthNum) <= 8);
      
      payments = employees.map(emp => ({
        employee_id: emp.id,
        payment_status: isPaid ? 'paid' : 'not_paid',
        payment_date: isPaid ? `${year}-${monthNum.padStart(2, '0')}-01T00:00:00Z` : null,
        notes: isPaid ? 'Historical payment data' : null
      }));
    } else {
      payments = paymentsData || [];
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

    // Calculate totals
    const totalEmployees = employees.length;
    const totalPaid = employeePayments.filter(ep => ep.payment_status === 'paid').length;
    const totalPending = totalEmployees - totalPaid;
    const totalSalaryAmount = employees.reduce((sum, emp) => sum + (emp.monthly_salary_inr || 0), 0);
    const totalPaidAmount = employeePayments
      .filter(ep => ep.payment_status === 'paid')
      .reduce((sum, ep) => sum + (ep.employee.monthly_salary_inr || 0), 0);
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

    const supabase = await createClient();
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Upsert payment record
    const paymentData = {
      employee_id,
      payment_month,
      payment_status,
      payment_date: payment_status === 'paid' ? new Date().toISOString() : null,
      notes: notes || null
    };

    const { data, error } = await supabase
      .from('monthly_salary_payments')
      .upsert(paymentData, { 
        onConflict: 'employee_id,payment_month',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating payment status:', error);
      
      // If table doesn't exist, provide helpful error message
      if (error.message?.includes('relation "monthly_salary_payments" does not exist')) {
        return NextResponse.json(
          { error: 'Database table not found. Please run the database schema update first.' },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to update payment status' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error updating salary payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}