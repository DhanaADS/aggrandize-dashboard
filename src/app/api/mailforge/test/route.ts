// Test MailForge Database Connection
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        authError: authError?.message 
      }, { status: 401 });
    }

    // Test database connection
    const { data, error } = await supabase
      .from('mailforge_contacts')
      .select('*')
      .limit(1);

    if (error) {
      return NextResponse.json({ 
        error: 'Database error',
        details: error.message || 'No error message',
        code: error.code || 'No error code',
        hint: error.hint || 'No hint',
        fullError: JSON.stringify(error)
      }, { status: 500 });
    }

    // Test insert a simple contact
    const testContact = {
      user_id: user.id,
      name: 'Test Contact',
      email: `test${Date.now()}@example.com`,
      niche: 'Test Service',
      client_type: 'Test Client',
      order_status: 'new',
      confidence: 0.5,
      tags: ['test'],
      last_activity: new Date().toISOString()
    };

    const { data: insertData, error: insertError } = await supabase
      .from('mailforge_contacts')
      .insert(testContact)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ 
        error: 'Insert test failed',
        details: insertError.message,
        code: insertError.code,
        hint: insertError.hint,
        testContact
      }, { status: 500 });
    }

    // Clean up test contact
    await supabase
      .from('mailforge_contacts')
      .delete()
      .eq('id', insertData.id);

    return NextResponse.json({
      success: true,
      message: 'Database connection and operations working correctly',
      user: {
        id: user.id,
        email: user.email
      },
      testResult: 'Insert and delete successful'
    });

  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json({
      error: 'Server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}