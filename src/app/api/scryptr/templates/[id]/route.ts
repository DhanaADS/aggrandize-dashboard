import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const { id } = params;

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get template (must be public or owned by user)
    const { data: template, error } = await supabase
      .from('workflow_templates')
      .select('*')
      .eq('id', id)
      .or(`is_public.eq.true,created_by.eq.${user.id}`)
      .single();

    if (error) {
      console.error('Error fetching template:', error);
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      template
    });

  } catch (error) {
    console.error('Get template API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const { id } = params;

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      name,
      description,
      isPublic,
      titleRules,
      bodyRules,
      urlRules,
      titleLogic,
      bodyLogic,
      urlLogic,
      aiConfig,
      filters
    } = await request.json();

    // Update template (must be owned by user)
    const { data: template, error } = await supabase
      .from('workflow_templates')
      .update({
        name,
        description,
        is_public: isPublic,
        title_rules: titleRules,
        body_rules: bodyRules,
        url_rules: urlRules,
        title_logic: titleLogic,
        body_logic: bodyLogic,
        url_logic: urlLogic,
        ai_config: aiConfig,
        filters
      })
      .eq('id', id)
      .eq('created_by', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      template
    });

  } catch (error) {
    console.error('Update template API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const { id } = params;

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete template (must be owned by user)
    const { error } = await supabase
      .from('workflow_templates')
      .delete()
      .eq('id', id)
      .eq('created_by', user.id);

    if (error) {
      console.error('Error deleting template:', error);
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    console.error('Delete template API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const { id } = params;

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Increment usage count
    const { error } = await supabase.rpc('increment_template_usage', {
      template_id: id
    });

    if (error) {
      console.error('Error incrementing usage:', error);
      // Don't fail if this fails, just log it
    }

    return NextResponse.json({
      success: true,
      message: 'Usage count incremented'
    });

  } catch (error) {
    console.error('Increment usage API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}