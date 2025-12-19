import { NextResponse } from 'next/server';
import { testConnection, getDatabaseStats } from '@/lib/umbrel';

export async function GET() {
  try {
    const isConnected = await testConnection();

    if (!isConnected) {
      return NextResponse.json({
        success: false,
        message: 'Failed to connect to Umbrel PostgreSQL',
        connected: false,
      }, { status: 500 });
    }

    const stats = await getDatabaseStats();

    return NextResponse.json({
      success: true,
      message: 'Connected to Umbrel PostgreSQL',
      connected: true,
      database: 'aggrandize_business',
      host: 'umbrel.local',
      stats,
    });
  } catch (error) {
    console.error('[API] Umbrel status error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      connected: false,
    }, { status: 500 });
  }
}
