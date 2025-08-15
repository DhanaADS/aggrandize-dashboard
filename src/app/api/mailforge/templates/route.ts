// MailForge Templates API - CRUD operations
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
    const category = searchParams.get('category') || 'all';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    let query = supabase
      .from('mailforge_templates')
      .select('*', { count: 'exact' })
      .or(`user_id.eq.${user.id},is_public.eq.true`); // User's templates or public templates

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,subject.ilike.%${search}%`);
    }

    // Apply category filter
    if (category !== 'all') {
      query = query.eq('category', category);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: templates, error, count } = await query;

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    // Get category counts for filters
    const { data: categoryData } = await supabase
      .from('mailforge_templates')
      .select('category', { count: 'exact' })
      .or(`user_id.eq.${user.id},is_public.eq.true`);

    const categoryCounts = categoryData?.reduce((acc: any, template: any) => {
      acc[template.category] = (acc[template.category] || 0) + 1;
      return acc;
    }, {}) || {};

    return NextResponse.json({
      success: true,
      data: templates,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      filters: {
        categories: categoryCounts
      }
    });

  } catch (error) {
    console.error('Templates API error:', error);
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
      description,
      subject, 
      content,
      category = 'general',
      is_public = false
    } = body;

    // Validate required fields
    if (!name || !subject || !content) {
      return NextResponse.json({ error: 'Name, subject, and content are required' }, { status: 400 });
    }

    // Insert new template
    const { data: template, error } = await supabase
      .from('mailforge_templates')
      .insert({
        user_id: user.id,
        name,
        description: description || null,
        subject,
        content,
        category,
        is_public
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: template
    }, { status: 201 });

  } catch (error) {
    console.error('Create template error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { templateId, updates } = body;

    if (!templateId || !updates) {
      return NextResponse.json({ error: 'Template ID and updates are required' }, { status: 400 });
    }

    // Update template (only if user owns it)
    const { data: template, error } = await supabase
      .from('mailforge_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .eq('user_id', user.id) // Only update user's own templates
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
    }

    if (!template) {
      return NextResponse.json({ error: 'Template not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: template
    });

  } catch (error) {
    console.error('Update template error:', error);
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
    const templateIds = searchParams.get('ids')?.split(',') || [];

    if (templateIds.length === 0) {
      return NextResponse.json({ error: 'No template IDs provided' }, { status: 400 });
    }

    // Delete templates (only user's own templates)
    const { data, error } = await supabase
      .from('mailforge_templates')
      .delete()
      .eq('user_id', user.id)
      .in('id', templateIds)
      .select();

    if (error) {
      console.error('Error deleting templates:', error);
      return NextResponse.json({ error: 'Failed to delete templates' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deleted: data.length,
      data
    });

  } catch (error) {
    console.error('Delete templates error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}