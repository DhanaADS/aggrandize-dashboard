import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { query } from '@/lib/umbrel/query-wrapper';
import { BulkActionPayload } from '@/types/inventory';
import { WebsiteInventory } from '@/types/inventory';

// POST - Bulk operations
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: BulkActionPayload = await request.json();
    const { action, website_ids, data } = body;

    if (!website_ids || website_ids.length === 0) {
      return NextResponse.json({ error: 'No websites selected' }, { status: 400 });
    }

    let result;
    let message = '';

    // Build parameterized IN clause
    const placeholders = website_ids.map((_, i) => `$${i + 1}`).join(', ');

    switch (action) {
      case 'delete':
        // Only admin can bulk delete
        if (session.user.role !== 'admin') {
          return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
        }

        await query(
          `DELETE FROM website_inventory WHERE id IN (${placeholders})`,
          website_ids
        );

        message = `Successfully deleted ${website_ids.length} website(s)`;
        break;

      case 'activate':
        const activateResult = await query<WebsiteInventory>(
          `UPDATE website_inventory SET status = 'active', updated_at = NOW()
           WHERE id IN (${placeholders}) RETURNING *`,
          website_ids
        );

        result = activateResult.rows;
        message = `Successfully activated ${website_ids.length} website(s)`;
        break;

      case 'deactivate':
        const deactivateResult = await query<WebsiteInventory>(
          `UPDATE website_inventory SET status = 'inactive', updated_at = NOW()
           WHERE id IN (${placeholders}) RETURNING *`,
          website_ids
        );

        result = deactivateResult.rows;
        message = `Successfully deactivated ${website_ids.length} website(s)`;
        break;

      case 'blacklist':
        // Only admin can blacklist
        if (session.user.role !== 'admin') {
          return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
        }

        const blacklistResult = await query<WebsiteInventory>(
          `UPDATE website_inventory SET status = 'blacklisted', updated_at = NOW()
           WHERE id IN (${placeholders}) RETURNING *`,
          website_ids
        );

        result = blacklistResult.rows;
        message = `Successfully blacklisted ${website_ids.length} website(s)`;
        break;

      case 'update_category':
        if (!data?.category) {
          return NextResponse.json({ error: 'Category is required for bulk category update' }, { status: 400 });
        }

        // Add category as the last parameter
        const categoryParams = [...website_ids, data.category];
        const categoryResult = await query<WebsiteInventory>(
          `UPDATE website_inventory SET category = $${website_ids.length + 1}, updated_at = NOW()
           WHERE id IN (${placeholders}) RETURNING *`,
          categoryParams
        );

        result = categoryResult.rows;
        message = `Successfully updated category to "${data.category}" for ${website_ids.length} website(s)`;
        break;

      case 'update_status':
        if (!data?.status) {
          return NextResponse.json({ error: 'Status is required for bulk status update' }, { status: 400 });
        }

        // Add status as the last parameter
        const statusParams = [...website_ids, data.status];
        const statusResult = await query<WebsiteInventory>(
          `UPDATE website_inventory SET status = $${website_ids.length + 1}, updated_at = NOW()
           WHERE id IN (${placeholders}) RETURNING *`,
          statusParams
        );

        result = statusResult.rows;
        message = `Successfully updated status to "${data.status}" for ${website_ids.length} website(s)`;
        break;

      default:
        return NextResponse.json({ error: 'Invalid bulk action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message,
      affected_count: website_ids.length,
      data: result
    });

  } catch (error) {
    console.error('Error in bulk operation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
