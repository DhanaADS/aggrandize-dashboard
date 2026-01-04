import { NextRequest, NextResponse } from 'next/server';
import { getClients, createClient, migrateOrdersToClients } from '@/lib/umbrel/api';

// GET /api/clients - List all clients
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters = {
      search: searchParams.get('search') || undefined,
      has_email: searchParams.get('has_email') === 'true' || undefined,
      min_orders: searchParams.get('min_orders') ? parseInt(searchParams.get('min_orders')!) : undefined,
    };

    const clients = await getClients(filters);
    return NextResponse.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

// POST /api/clients - Create new client OR run migration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Special action: run migration
    if (body.action === 'migrate') {
      const result = await migrateOrdersToClients();
      return NextResponse.json({
        success: true,
        message: `Migration complete: ${result.clientsCreated} clients created, ${result.ordersLinked} orders linked`,
        ...result
      });
    }

    // Regular create
    if (!body.name) {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 });
    }

    const client = await createClient({
      name: body.name,
      email: body.email,
      company: body.company,
      whatsapp: body.whatsapp,
      telegram: body.telegram,
      notes: body.notes,
      tags: body.tags,
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
