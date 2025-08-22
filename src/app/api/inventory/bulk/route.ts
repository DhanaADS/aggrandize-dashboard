import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';
import { BulkActionPayload } from '@/types/inventory';

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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let result;
    let message = '';

    switch (action) {
      case 'delete':
        // Only admin can bulk delete
        if (session.user.role !== 'admin') {
          return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
        }

        const { error: deleteError } = await supabase
          .from('website_inventory')
          .delete()
          .in('id', website_ids);

        if (deleteError) {
          console.error('Bulk delete error:', deleteError);
          return NextResponse.json({ 
            error: 'Failed to delete websites',
            details: deleteError.message 
          }, { status: 500 });
        }

        message = `Successfully deleted ${website_ids.length} website(s)`;
        break;

      case 'activate':
        const { data: activateData, error: activateError } = await supabase
          .from('website_inventory')
          .update({ status: 'active' })
          .in('id', website_ids)
          .select();

        if (activateError) {
          console.error('Bulk activate error:', activateError);
          return NextResponse.json({ 
            error: 'Failed to activate websites',
            details: activateError.message 
          }, { status: 500 });
        }

        result = activateData;
        message = `Successfully activated ${website_ids.length} website(s)`;
        break;

      case 'deactivate':
        const { data: deactivateData, error: deactivateError } = await supabase
          .from('website_inventory')
          .update({ status: 'inactive' })
          .in('id', website_ids)
          .select();

        if (deactivateError) {
          console.error('Bulk deactivate error:', deactivateError);
          return NextResponse.json({ 
            error: 'Failed to deactivate websites',
            details: deactivateError.message 
          }, { status: 500 });
        }

        result = deactivateData;
        message = `Successfully deactivated ${website_ids.length} website(s)`;
        break;

      case 'blacklist':
        // Only admin can blacklist
        if (session.user.role !== 'admin') {
          return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
        }

        const { data: blacklistData, error: blacklistError } = await supabase
          .from('website_inventory')
          .update({ status: 'blacklisted' })
          .in('id', website_ids)
          .select();

        if (blacklistError) {
          console.error('Bulk blacklist error:', blacklistError);
          return NextResponse.json({ 
            error: 'Failed to blacklist websites',
            details: blacklistError.message 
          }, { status: 500 });
        }

        result = blacklistData;
        message = `Successfully blacklisted ${website_ids.length} website(s)`;
        break;

      case 'update_category':
        if (!data?.category) {
          return NextResponse.json({ error: 'Category is required for bulk category update' }, { status: 400 });
        }

        const { data: updateCategoryData, error: updateCategoryError } = await supabase
          .from('website_inventory')
          .update({ category: data.category })
          .in('id', website_ids)
          .select();

        if (updateCategoryError) {
          console.error('Bulk category update error:', updateCategoryError);
          return NextResponse.json({ 
            error: 'Failed to update categories',
            details: updateCategoryError.message 
          }, { status: 500 });
        }

        result = updateCategoryData;
        message = `Successfully updated category to "${data.category}" for ${website_ids.length} website(s)`;
        break;

      case 'update_status':
        if (!data?.status) {
          return NextResponse.json({ error: 'Status is required for bulk status update' }, { status: 400 });
        }

        const { data: updateStatusData, error: updateStatusError } = await supabase
          .from('website_inventory')
          .update({ status: data.status })
          .in('id', website_ids)
          .select();

        if (updateStatusError) {
          console.error('Bulk status update error:', updateStatusError);
          return NextResponse.json({ 
            error: 'Failed to update status',
            details: updateStatusError.message 
          }, { status: 500 });
        }

        result = updateStatusData;
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