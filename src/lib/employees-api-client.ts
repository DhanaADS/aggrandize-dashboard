// Client-side employees API functions
import { UserProfile, EmployeeProfile } from '@/types/finance';

// Get all employees (client-side)
export async function getEmployees(): Promise<UserProfile[]> {
  try {
    const response = await fetch('/api/employees');
    if (!response.ok) {
      throw new Error('Failed to fetch employees');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }
}

// Get employee by ID (client-side)
export async function getEmployeeById(id: string): Promise<UserProfile | null> {
  try {
    const response = await fetch(`/api/employees/${id}`);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching employee:', error);
    return null;
  }
}

// Update employee information (client-side)
export async function updateEmployee(id: string, updates: Partial<UserProfile>): Promise<UserProfile> {
  try {
    const response = await fetch(`/api/employees/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update employee');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating employee:', error);
    throw error;
  }
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

// Get employees in EmployeeProfile format for payslip system (client-side)
export async function getEmployeeProfiles(): Promise<EmployeeProfile[]> {
  try {
    const employees = await getEmployees();
    return employees.map(userProfileToEmployeeProfile);
  } catch (error) {
    console.error('Error fetching employee profiles:', error);
    return [];
  }
}