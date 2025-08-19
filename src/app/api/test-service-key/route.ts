import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    return NextResponse.json({ 
      hasServiceKey,
      hasUrl,
      serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'missing'
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}