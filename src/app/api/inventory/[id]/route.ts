import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { query, queryOne } from '@/lib/umbrel/client';
import { WebsiteInventory } from '@/types/inventory';

// GET single website
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const website = await queryOne<WebsiteInventory>(
      'SELECT * FROM website_inventory WHERE id = $1',
      [id]
    );

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      website
    });

  } catch (error) {
    console.error('Error fetching website:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update website
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    // Check if website exists
    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM website_inventory WHERE id = $1',
      [id]
    );

    if (!existing) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    // Remove id and timestamps from update data
    const { id: _, created_at, created_by, updated_at, ...updateData } = body;

    // Build dynamic UPDATE query
    const entries = Object.entries(updateData);
    if (entries.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const setClause = entries.map(([key], i) => `${key} = $${i + 1}`).join(', ');
    const values = entries.map(([_, value]) => value);
    values.push(id);

    const result = await query<WebsiteInventory>(
      `UPDATE website_inventory SET ${setClause}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
      values
    );

    const website = result.rows[0];
    if (!website) {
      throw new Error('Failed to update website');
    }

    return NextResponse.json({
      success: true,
      website
    });

  } catch (error: unknown) {
    console.error('Error updating website:', error);

    // Handle unique constraint violations
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return NextResponse.json({
        error: 'Website URL already exists in inventory',
        details: (error as Error).message
      }, { status: 409 });
    }

    return NextResponse.json({
      error: 'Failed to update website',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE website
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can delete websites
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { id } = params;

    // Check if website exists and get website name for response
    const existing = await queryOne<{ id: string; website: string }>(
      'SELECT id, website FROM website_inventory WHERE id = $1',
      [id]
    );

    if (!existing) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    await query('DELETE FROM website_inventory WHERE id = $1', [id]);

    return NextResponse.json({
      success: true,
      message: `Website ${existing.website} deleted successfully`
    });

  } catch (error) {
    console.error('Error deleting website:', error);
    return NextResponse.json({
      error: 'Failed to delete website',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
