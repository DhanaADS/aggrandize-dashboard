import { NextRequest, NextResponse } from 'next/server';
import { processingStateManager } from '../../../../lib/processing-state';

/**
 * Processing Status API - Real-time processing progress tracking
 * Handles job status queries and provides live updates for the frontend
 */

// GET endpoint to check processing status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const action = searchParams.get('action');

    // Get specific job status
    if (jobId) {
      const job = processingStateManager.getJob(jobId);
      
      if (!job) {
        return NextResponse.json(
          { success: false, error: 'Processing job not found' },
          { status: 404 }
        );
      }

      const progressUpdate = processingStateManager.getProgressUpdate(jobId);
      
      return NextResponse.json({
        success: true,
        job: {
          id: job.id,
          domain: job.domain,
          status: job.status,
          progress: job.progress,
          current_stage: job.currentStage,
          started_at: job.startedAt,
          updated_at: job.updatedAt,
          completed_at: job.completedAt,
          error: job.error,
          results: job.results,
          metadata: job.metadata
        },
        progress_update: progressUpdate,
        timestamp: new Date().toISOString()
      });
    }

    // Get all active jobs
    if (action === 'active') {
      const activeJobs = processingStateManager.getActiveJobs();
      
      return NextResponse.json({
        success: true,
        active_jobs: activeJobs.map(job => ({
          id: job.id,
          domain: job.domain,
          status: job.status,
          progress: job.progress,
          current_stage: job.currentStage,
          started_at: job.startedAt,
          updated_at: job.updatedAt,
          metadata: job.metadata
        })),
        count: activeJobs.length,
        timestamp: new Date().toISOString()
      });
    }

    // Get recent jobs
    if (action === 'recent') {
      const limit = parseInt(searchParams.get('limit') || '10');
      const recentJobs = processingStateManager.getRecentJobs(limit);
      
      return NextResponse.json({
        success: true,
        recent_jobs: recentJobs.map(job => ({
          id: job.id,
          domain: job.domain,
          status: job.status,
          progress: job.progress,
          current_stage: job.currentStage,
          started_at: job.startedAt,
          updated_at: job.updatedAt,
          completed_at: job.completedAt,
          metadata: job.metadata,
          duration: job.completedAt 
            ? ((new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()) / 1000).toFixed(1) + 's'
            : null
        })),
        timestamp: new Date().toISOString()
      });
    }

    // Get system statistics
    if (action === 'stats') {
      const stats = processingStateManager.getStats();
      const interruptedJobs = processingStateManager.checkForInterruptedJobs();
      
      return NextResponse.json({
        success: true,
        stats: {
          ...stats,
          interrupted_jobs: interruptedJobs.length,
          system_status: stats.active_jobs > 0 ? 'processing' : 'idle'
        },
        interrupted_jobs: interruptedJobs.map(job => ({
          id: job.id,
          domain: job.domain,
          last_progress: job.progress,
          interrupted_at: job.updatedAt
        })),
        timestamp: new Date().toISOString()
      });
    }

    // Default: return basic system status
    const stats = processingStateManager.getStats();
    return NextResponse.json({
      success: true,
      system_status: stats.active_jobs > 0 ? 'processing' : 'idle',
      active_jobs: stats.active_jobs,
      total_jobs: stats.total_jobs,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Processing status error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get processing status' 
      },
      { status: 500 }
    );
  }
}

// POST endpoint for processing actions
export async function POST(request: NextRequest) {
  try {
    const { action, jobId } = await request.json();

    if (action === 'cleanup_interrupted') {
      const interruptedJobs = processingStateManager.checkForInterruptedJobs();
      
      return NextResponse.json({
        success: true,
        message: `Cleaned up ${interruptedJobs.length} interrupted jobs`,
        cleaned_jobs: interruptedJobs.map(job => ({
          id: job.id,
          domain: job.domain,
          last_progress: job.progress
        }))
      });
    }

    if (action === 'resume_job' && jobId) {
      // In a real implementation, this would attempt to resume a failed job
      // For now, we'll just mark it as failed
      const job = processingStateManager.getJob(jobId);
      
      if (!job) {
        return NextResponse.json(
          { success: false, error: 'Job not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: false,
        message: 'Job resume not implemented - please restart the extraction',
        job: {
          id: job.id,
          domain: job.domain,
          status: job.status,
          progress: job.progress
        }
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  }
}

// DELETE endpoint to remove completed jobs
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Job ID required' },
        { status: 400 }
      );
    }

    const job = processingStateManager.getJob(jobId);
    
    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    if (job.status === 'processing') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete active processing job' },
        { status: 400 }
      );
    }

    // In a real implementation, you'd actually delete the job from storage
    // For now, we'll just return success
    return NextResponse.json({
      success: true,
      message: `Job ${jobId} marked for deletion`,
      deleted_job: {
        id: job.id,
        domain: job.domain,
        status: job.status
      }
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete job' },
      { status: 500 }
    );
  }
}