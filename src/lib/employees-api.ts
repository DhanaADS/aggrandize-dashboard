import { createClient } from '@/lib/supabase/server';
import { UserProfile, SalaryIncrement, EmployeeProfile } from '@/types/finance';

// Get all employees (users with employee data)
export async function getEmployees(): Promise<UserProfile[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .not('employee_no', 'is', null)
    .order('employee_no');

  if (error) {
    console.error('Error fetching employees:', error);
    throw new Error('Failed to fetch employees');
  }

  return data || [];
}

// Get employee by ID
export async function getEmployeeById(id: string): Promise<UserProfile | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching employee:', error);
    return null;
  }

  return data;
}

// Update employee information
export async function updateEmployee(id: string, updates: Partial<UserProfile>): Promise<UserProfile> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating employee:', error);
    throw new Error('Failed to update employee');
  }

  return data;
}

// Update employee salary with history tracking
export async function updateEmployeeSalary(
  userId: string, 
  newSalary: number, 
  effectiveDate?: string,
  reason?: string,
  notes?: string
): Promise<string> {
  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc('update_employee_salary', {
    p_user_id: userId,
    p_new_salary: newSalary,
    p_effective_date: effectiveDate || new Date().toISOString().split('T')[0],
    p_reason: reason || 'manual_update',
    p_notes: notes
  });

  if (error) {
    console.error('Error updating employee salary:', error);
    throw new Error('Failed to update employee salary');
  }

  return data;
}

// Get salary increment history for employee
export async function getSalaryIncrements(userId: string): Promise<SalaryIncrement[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('salary_increments')
    .select(`
      *,
      created_by_profile:user_profiles!salary_increments_created_by_fkey(full_name)
    `)
    .eq('user_id', userId)
    .order('effective_date', { ascending: false });

  if (error) {
    console.error('Error fetching salary increments:', error);
    throw new Error('Failed to fetch salary increments');
  }

  return data || [];
}

// Get all salary increments (admin only)
export async function getAllSalaryIncrements(): Promise<SalaryIncrement[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('salary_increments')
    .select(`
      *,
      user_profile:user_profiles!salary_increments_user_id_fkey(full_name, employee_no),
      created_by_profile:user_profiles!salary_increments_created_by_fkey(full_name)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all salary increments:', error);
    throw new Error('Failed to fetch salary increments');
  }

  return data || [];
}

// Convert UserProfile to EmployeeProfile for backward compatibility
export function userProfileToEmployeeProfile(user: UserProfile): EmployeeProfile {
  return {
    name: user.full_name.toUpperCase(),
    employee_no: user.employee_no || '',
    designation: user.designation || '',
    monthly_salary_inr: user.monthly_salary_inr || 0,
    pan_no: user.pan_no,
    bank_account: user.bank_account,
    bank_name: user.bank_name,
    ifsc_code: user.ifsc_code,
    joined_date: user.joining_date
  };
}

// Get employees in EmployeeProfile format for payslip system
export async function getEmployeeProfiles(): Promise<EmployeeProfile[]> {
  const employees = await getEmployees();
  return employees.map(userProfileToEmployeeProfile);
}

// Generate next employee number
export async function generateNextEmployeeNumber(): Promise<string> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('employee_no')
    .not('employee_no', 'is', null)
    .order('employee_no', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error generating employee number:', error);
    return 'ADS001'; // Default first employee number
  }

  if (!data || data.length === 0) {
    return 'ADS001';
  }

  const lastEmployeeNo = data[0].employee_no;
  if (!lastEmployeeNo) {
    return 'ADS001';
  }

  // Extract number from ADS001, ADS002, etc.
  const match = lastEmployeeNo.match(/ADS(\d+)/);
  if (match) {
    const nextNumber = parseInt(match[1]) + 1;
    return `ADS${nextNumber.toString().padStart(3, '0')}`;
  }

  return 'ADS001';
}