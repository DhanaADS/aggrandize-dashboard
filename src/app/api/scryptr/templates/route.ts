import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const includePrivate = searchParams.get('includePrivate') === 'true';

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let query = supabase
      .from('workflow_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (includePrivate) {
      // Get both public templates and user's private templates
      query = query.or(`is_public.eq.true,created_by.eq.${user.id}`);
    } else {
      // Get only public templates
      query = query.eq('is_public', true);
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      templates: templates || []
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

    const {
      name,
      description,
      isPublic = false,
      nodes = [],
      connections = [],
      variables = {},
      settings = {},
      // Legacy fields for backward compatibility
      titleRules,
      bodyRules,
      urlRules,
      titleLogic,
      bodyLogic,
      urlLogic,
      aiConfig,
      filters
    } = await request.json();

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Workflow name is required' },
        { status: 400 }
      );
    }

    // Create template
    const { data: template, error } = await supabase
      .from('workflow_templates')
      .insert({
        name,
        description,
        created_by: user.id,
        is_public: isPublic,
        // New workflow structure
        nodes: nodes,
        connections: connections,
        variables: variables,
        settings: settings,
        // Legacy fields for backward compatibility
        title_rules: titleRules || [],
        body_rules: bodyRules || [],
        url_rules: urlRules || [],
        title_logic: titleLogic || 'OR',
        body_logic: bodyLogic || 'OR',
        url_logic: urlLogic || 'OR',
        ai_config: aiConfig || {},
        filters: filters || { maxArticles: 50, dateRange: 30, keywords: '' }
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      template
    });

  } catch (error) {
    console.error('Create template API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}