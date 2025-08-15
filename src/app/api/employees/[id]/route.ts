import { NextResponse } from 'next/server';
import { getEmployeeById, updateEmployee } from '@/lib/employees-api';

// GET /api/employees/[id] - Get employee by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const employee = await getEmployeeById(params.id);
    
    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error('Error fetching employee:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee' },
      { status: 500 }
    );
  }
}

// PUT /api/employees/[id] - Update employee
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const updatedEmployee = await updateEmployee(params.id, body);

    return NextResponse.json(updatedEmployee);
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json(
      { error: 'Failed to update employee' },
      { status: 500 }
    );
  }
}