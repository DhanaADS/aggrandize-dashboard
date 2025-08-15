// Workflow Execution API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { workflowEngine } from '@/lib/workflow/engine';
import { WorkflowDefinition } from '@/lib/workflow/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { workflowId, workflowDefinition, inputData = {}, triggerType = 'manual' } = body;

    let workflow: WorkflowDefinition;

    // Check if we have a direct workflow definition or need to fetch from database
    if (workflowDefinition) {
      // Direct workflow definition (for temporary workflows)
      workflow = workflowDefinition;
    } else if (workflowId) {
      // Fetch from database
      const { data: workflowTemplate, error: fetchError } = await supabase
        .from('workflow_templates')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (fetchError || !workflowTemplate) {
        return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
      }

      // Check permissions
      if (workflowTemplate.created_by !== user.id && !workflowTemplate.is_public) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      // Convert database template to workflow definition
      workflow = {
        id: workflowTemplate.id,
        name: workflowTemplate.name,
        description: workflowTemplate.description,
        nodes: workflowTemplate.nodes || [],
        connections: workflowTemplate.connections || [],
        variables: workflowTemplate.variables || {},
        settings: workflowTemplate.settings || {
          maxRetries: 3,
          timeout: 300000,
          parallelExecution: false,
          errorStrategy: 'stop'
        }
      };
    } else {
      return NextResponse.json({ error: 'Either workflowId or workflowDefinition is required' }, { status: 400 });
    }

    // Start workflow execution
    const workflowRun = await workflowEngine.executeWorkflow(
      workflow,
      inputData,
      user.id,
      triggerType
    );

    // Save workflow run to database
    const { error: saveError } = await supabase
      .from('workflow_runs')
      .insert({
        id: workflowRun.id,
        workflow_id: workflowRun.workflowId,
        user_id: workflowRun.userId,
        status: workflowRun.status,
        trigger_type: workflowRun.triggerType,
        started_at: workflowRun.startedAt.toISOString(),
        completed_at: workflowRun.completedAt?.toISOString(),
        input_data: workflowRun.inputData,
        output_data: workflowRun.outputData,
        error_message: workflowRun.error,
        execution_data: {
          progress: workflowRun.progress
        }
      });

    if (saveError) {
      console.error('Failed to save workflow run:', saveError);
    }

    return NextResponse.json({
      success: true,
      workflowRun: {
        id: workflowRun.id,
        status: workflowRun.status,
        startedAt: workflowRun.startedAt,
        completedAt: workflowRun.completedAt,
        progress: workflowRun.progress,
        error: workflowRun.error
      }
    });

  } catch (error) {
    console.error('Workflow execution error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('runId');

    if (runId) {
      // Get specific workflow run status
      const runStatus = workflowEngine.getRunStatus(runId);
      
      if (runStatus) {
        return NextResponse.json({
          success: true,
          workflowRun: runStatus
        });
      }

      // If not in memory, get from database
      const { data: dbRun, error: dbError } = await supabase
        .from('workflow_runs')
        .select('*')
        .eq('id', runId)
        .eq('user_id', user.id)
        .single();

      if (dbError || !dbRun) {
        return NextResponse.json({ error: 'Workflow run not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        workflowRun: {
          id: dbRun.id,
          workflowId: dbRun.workflow_id,
          userId: dbRun.user_id,
          status: dbRun.status,
          triggerType: dbRun.trigger_type,
          startedAt: new Date(dbRun.started_at),
          completedAt: dbRun.completed_at ? new Date(dbRun.completed_at) : undefined,
          inputData: dbRun.input_data,
          outputData: dbRun.output_data,
          error: dbRun.error_message,
          progress: dbRun.execution_data?.progress || { completedNodes: 0, totalNodes: 0, currentStep: '' }
        }
      });
    } else {
      // Get all active runs for user
      const activeRuns = workflowEngine.getActiveRuns().filter(run => run.userId === user.id);
      
      return NextResponse.json({
        success: true,
        activeRuns
      });
    }

  } catch (error) {
    console.error('Get workflow run error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}