// Client-side salary payments API functions
import { MonthlySalaryOverview, MonthlySalaryPayment } from '@/types/finance';

// Get salary payment overview for a specific month
export async function getMonthlySalaryOverview(month: string): Promise<MonthlySalaryOverview> {
  try {
    const response = await fetch(`/api/salary-payments?month=${month}`);
    if (!response.ok) {
      // Return empty default instead of throwing - Umbrel connection may not be available
      return {
        month,
        employees: [],
        total_employees: 0,
        total_paid: 0,
        total_pending: 0,
        total_salary_amount: 0,
        total_paid_amount: 0,
        total_pending_amount: 0
      };
    }
    return await response.json();
  } catch (error) {
    // Return empty default instead of throwing
    return {
      month,
      employees: [],
      total_employees: 0,
      total_paid: 0,
      total_pending: 0,
      total_salary_amount: 0,
      total_paid_amount: 0,
      total_pending_amount: 0
    };
  }
}

// Update payment status for an employee
export async function updatePaymentStatus(
  employeeId: string,
  paymentMonth: string,
  paymentStatus: 'paid' | 'not_paid',
  notes?: string
): Promise<MonthlySalaryPayment> {
  try {
    const response = await fetch('/api/salary-payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employee_id: employeeId,
        payment_month: paymentMonth,
        payment_status: paymentStatus,
        notes
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update payment status');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating payment status:', error);
    throw error;
  }
}

// Helper function to get current month in YYYY-MM format
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Helper function to format month display
export function formatMonthDisplay(monthString: string): string {
  const [year, month] = monthString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long' 
  });
}

// Helper function to format currency
export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}