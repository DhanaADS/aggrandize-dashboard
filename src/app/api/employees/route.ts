import { NextResponse } from 'next/server';
import { getEmployees, generateNextEmployeeNumber } from '@/lib/employees-api';
import { createClient } from '@/lib/supabase/server';

// GET /api/employees - Get all employees
export async function GET() {
  try {
    const supabase = await createClient();
    
    // Check if employee columns exist, if not return empty array
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, role, employee_no, monthly_salary_inr, designation, joining_date, pan_no, bank_account, bank_name, ifsc_code, created_at, updated_at')
      .order('employee_no');

    if (error) {
      console.error('Database error:', error);
      // If columns don't exist, return users without employee data
      const { data: basicData } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, role, created_at, updated_at')
        .order('email');
      
      return NextResponse.json(basicData || []);
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}

// POST /api/employees - Create new employee (user with employee data)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      email,
      full_name,
      role,
      designation,
      monthly_salary_inr,
      joining_date,
      pan_no,
      bank_account,
      bank_name,
      ifsc_code
    } = body;

    // Validate required fields
    if (!email || !full_name || !role) {
      return NextResponse.json(
        { error: 'Email, full name, and role are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Generate next employee number
    const employee_no = await generateNextEmployeeNumber();

    // Create user profile with employee data
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        email,
        full_name,
        role,
        employee_no,
        designation,
        monthly_salary_inr: monthly_salary_inr || 0,
        joining_date,
        pan_no,
        bank_account,
        bank_name,
        ifsc_code
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating employee:', error);
      return NextResponse.json(
        { error: 'Failed to create employee' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}