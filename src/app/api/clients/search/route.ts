import { NextRequest, NextResponse } from 'next/server';
import { searchClients } from '@/lib/umbrel/api';

// GET /api/clients/search?q=searchterm - Search clients for autocomplete
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    const clients = await searchClients(query, limit);
    return NextResponse.json(clients);
  } catch (error) {
    console.error('Error searching clients:', error);
    return NextResponse.json({ error: 'Failed to search clients' }, { status: 500 });
  }
}
