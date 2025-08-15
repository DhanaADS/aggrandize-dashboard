// MailForge Individual Contact API - Get, Update, Delete specific contact
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: contact, error } = await supabase
      .from('mailforge_contacts')
      .select('*')
      .eq('user_id', user.id)
      .eq('id', params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
      }
      console.error('Error fetching contact:', error);
      return NextResponse.json({ error: 'Failed to fetch contact' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: contact
    });

  } catch (error) {
    console.error('Get contact error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if contact exists and belongs to user
    const { data: existingContact } = await supabase
      .from('mailforge_contacts')
      .select('id')
      .eq('user_id', user.id)
      .eq('id', params.id)
      .single();

    if (!existingContact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Check for duplicate email (excluding current contact)
    const { data: duplicateContact } = await supabase
      .from('mailforge_contacts')
      .select('id')
      .eq('user_id', user.id)
      .eq('email', email)
      .neq('id', params.id)
      .single();

    if (duplicateContact) {
      return NextResponse.json({ error: 'Another contact with this email already exists' }, { status: 409 });
    }

    // Update contact
    const { data: contact, error } = await supabase
      .from('mailforge_contacts')
      .update({
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
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating contact:', error);
      return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: contact
    });

  } catch (error) {
    console.error('Update contact error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if contact exists and belongs to user
    const { data: existingContact } = await supabase
      .from('mailforge_contacts')
      .select('id, name, email')
      .eq('user_id', user.id)
      .eq('id', params.id)
      .single();

    if (!existingContact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Delete contact
    const { data: contact, error } = await supabase
      .from('mailforge_contacts')
      .delete()
      .eq('user_id', user.id)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error deleting contact:', error);
      return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: contact,
      message: `Contact ${existingContact.name} (${existingContact.email}) deleted successfully`
    });

  } catch (error) {
    console.error('Delete contact error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}