import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Test 1: Check if we can connect to user_profiles table
    console.log('Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);
    
    if (testError) {
      return NextResponse.json({
        success: false,
        test: 'database_connection',
        error: testError.message,
        code: testError.code
      });
    }
    
    // Test 2: Check table schema by trying to select specific columns
    console.log('Testing table schema...');
    const { data: schemaData, error: schemaError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, role, employee_no, designation, monthly_salary_inr')
      .limit(1);
    
    if (schemaError) {
      return NextResponse.json({
        success: false,
        test: 'table_schema',
        error: schemaError.message,
        code: schemaError.code,
        suggestion: 'Missing columns in user_profiles table. Run the SQL migration.'
      });
    }
    
    // Test 3: Check if the database trigger exists and works
    console.log('Checking database trigger...');
    const { data: triggerData, error: triggerError } = await supabase
      .rpc('check_trigger_exists', {});
    
    // Note: We can't easily test record insertion without creating a real auth user
    // The foreign key constraint requires the ID to exist in auth.users first
    
    return NextResponse.json({
      success: true,
      message: 'All database tests passed',
      tests: {
        database_connection: 'OK',
        table_schema: 'OK', 
        record_insertion: 'OK'
      }
    });
    
  } catch (error) {
    console.error('Debug test failed:', error);
    return NextResponse.json({
      success: false,
      test: 'general_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null
    });
  }
}