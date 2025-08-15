// Workflow Cancellation API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { workflowEngine } from '@/lib/workflow/engine';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { runId } = body;

    if (!runId) {
      return NextResponse.json({ error: 'Run ID is required' }, { status: 400 });
    }

    // Verify the run belongs to the user
    const { data: dbRun, error: dbError } = await supabase
      .from('workflow_runs')
      .select('*')
      .eq('id', runId)
      .eq('user_id', user.id)
      .single();

    if (dbError || !dbRun) {
      return NextResponse.json({ error: 'Workflow run not found' }, { status: 404 });
    }

    // Cancel the workflow
    const cancelled = await workflowEngine.cancelWorkflow(runId);

    if (cancelled) {
      // Update database
      await supabase
        .from('workflow_runs')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString(),
          error_message: 'Workflow cancelled by user'
        })
        .eq('id', runId);

      return NextResponse.json({
        success: true,
        message: 'Workflow cancelled successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Workflow not found or already completed' },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('Workflow cancellation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}