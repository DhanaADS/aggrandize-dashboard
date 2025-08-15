import { NextResponse } from 'next/server';
import { updateEmployeeSalary, getSalaryIncrements } from '@/lib/employees-api';

// GET /api/employees/[id]/salary - Get salary increment history
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const increments = await getSalaryIncrements(params.id);
    return NextResponse.json(increments);
  } catch (error) {
    console.error('Error fetching salary increments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch salary increments' },
      { status: 500 }
    );
  }
}

// PUT /api/employees/[id]/salary - Update employee salary
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { 
      new_salary, 
      effective_date,
      reason,
      notes 
    } = body;

    if (!new_salary || new_salary <= 0) {
      return NextResponse.json(
        { error: 'Valid salary amount is required' },
        { status: 400 }
      );
    }

    const incrementId = await updateEmployeeSalary(
      params.id,
      new_salary,
      effective_date,
      reason,
      notes
    );

    return NextResponse.json({ 
      success: true, 
      increment_id: incrementId 
    });
  } catch (error) {
    console.error('Error updating employee salary:', error);
    return NextResponse.json(
      { error: 'Failed to update employee salary' },
      { status: 500 }
    );
  }
}