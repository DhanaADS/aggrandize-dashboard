import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Force session refresh by returning current session data
    return NextResponse.json({ 
      success: true,
      user: session.user,
      message: 'Session refreshed'
    });

  } catch (error) {
    console.error('Error refreshing session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}