// MailForge Contacts API - CRUD operations
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const filter = searchParams.get('filter') || 'all';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    let query = supabase
      .from('mailforge_contacts')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id);

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,niche.ilike.%${search}%,order_status.ilike.%${search}%`);
    }

    // Apply status filters
    if (filter !== 'all') {
      switch (filter) {
        case 'qualified':
          query = query.eq('order_status', 'Qualified');
          break;
        case 'negotiation':
          query = query.eq('order_status', 'Negotiation');
          break;
        case 'proposal-sent':
          query = query.eq('order_status', 'Proposal sent');
          break;
        case 'follow-up':
          query = query.eq('order_status', 'Follow-up needed');
          break;
        case 'high-value':
          // Filter for high-value contacts (price_range contains numbers >= 1000)
          query = query.not('price_range', 'eq', 'Not specified')
                      .not('price_range', 'is', null);
          break;
      }
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: contacts, error, count } = await query;

    if (error) {
      console.error('Error fetching contacts:', error);
      return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
    }

    // Calculate high-value contacts count for filter
    let highValueCount = 0;
    if (filter === 'all') {
      const { count: hvCount } = await supabase
        .from('mailforge_contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .not('price_range', 'eq', 'Not specified')
        .not('price_range', 'is', null);
      highValueCount = hvCount || 0;
    }

    return NextResponse.json({
      success: true,
      data: contacts,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      filters: {
        highValueCount
      }
    });

  } catch (error) {
    console.error('Contacts API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      name, 
      email, 
      niche, 
      website, 
      clientType, 
      dateInteraction, 
      priceRange, 
      orderStatus, 
      confidence, 
      notes, 
      tags 
    } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // Check for duplicate email for this user
    const { data: existingContact } = await supabase
      .from('mailforge_contacts')
      .select('id')
      .eq('user_id', user.id)
      .eq('email', email)
      .single();

    if (existingContact) {
      return NextResponse.json({ error: 'Contact with this email already exists' }, { status: 409 });
    }

    // Insert new contact
    const { data: contact, error } = await supabase
      .from('mailforge_contacts')
      .insert({
        user_id: user.id,
        name,
        email,
        niche: niche || null,
        website: website || null,
        client_type: clientType || null,
        date_interaction: dateInteraction || null,
        price_range: priceRange || null,
        order_status: orderStatus || 'new',
        confidence: confidence || 0.0,
        notes: notes || null,
        tags: tags || [],
        last_activity: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating contact:', error);
      return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: contact
    }, { status: 201 });

  } catch (error) {
    console.error('Create contact error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Bulk operations (for CSV import and bulk actions)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { operation, contactIds, data: updateData, contacts: bulkContacts } = body;

    if (operation === 'bulk_update') {
      // Bulk update existing contacts
      if (!contactIds || !Array.isArray(contactIds) || !updateData) {
        return NextResponse.json({ error: 'contactIds array and updateData are required' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('mailforge_contacts')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
          last_activity: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .in('id', contactIds)
        .select();

      if (error) {
        console.error('Error bulk updating contacts:', error);
        return NextResponse.json({ error: 'Failed to update contacts' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data,
        updated: data.length
      });

    } else if (operation === 'bulk_import') {
      // Bulk import contacts from CSV
      if (!bulkContacts || !Array.isArray(bulkContacts)) {
        return NextResponse.json({ error: 'contacts array is required' }, { status: 400 });
      }

      // Prepare contacts for insertion
      const contactsToInsert = bulkContacts.map(contact => ({
        user_id: user.id,
        name: contact.name || '',
        email: contact.email || '',
        niche: contact.niche || null,
        website: contact.website || null,
        client_type: contact.clientType || null,
        date_interaction: contact.dateInteraction || null,
        price_range: contact.priceRange || null,
        order_status: contact.orderStatus || 'new',
        confidence: Math.max(0.0, Math.min(1.0, parseFloat(contact.confidence || '0.0'))),
        notes: contact.notes || null,
        tags: contact.tags || [],
        last_activity: new Date().toISOString()
      }));

      // Insert contacts (let database handle duplicates via constraint)
      const { data, error, count } = await supabase
        .from('mailforge_contacts')
        .insert(contactsToInsert)
        .select();

      if (error) {
        console.error('Error bulk importing contacts:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        console.error('Contacts to insert:', JSON.stringify(contactsToInsert, null, 2));
        return NextResponse.json({ 
          error: 'Failed to import contacts', 
          details: error.message,
          code: error.code 
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data,
        imported: count || data.length,
        total: bulkContacts.length
      });
    }

    return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });

  } catch (error) {
    console.error('Bulk operation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contactIds = searchParams.get('ids')?.split(',') || [];

    if (contactIds.length === 0) {
      return NextResponse.json({ error: 'No contact IDs provided' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('mailforge_contacts')
      .delete()
      .eq('user_id', user.id)
      .in('id', contactIds)
      .select();

    if (error) {
      console.error('Error deleting contacts:', error);
      return NextResponse.json({ error: 'Failed to delete contacts' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deleted: data.length,
      data
    });

  } catch (error) {
    console.error('Delete contacts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}