/**
 * Processing State Manager - Handles long-running extraction state
 * Persists processing status across page refreshes and provides real-time updates
 */

export interface ProcessingJob {
  id: string;
  domain: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  currentStage: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  results?: any;
  error?: string;
  metadata: {
    totalUrls: number;
    processedUrls: number;
    aiStrategy: string;
    cacheHits: number;
    successRate: number;
  };
}

class ProcessingStateManager {
  private jobs = new Map<string, ProcessingJob>();
  private readonly STORAGE_KEY = 'aggrandize_processing_jobs';
  
  constructor() {
    this.loadFromStorage();
    this.startCleanupInterval();
  }

  // Create new processing job
  createJob(domain: string, totalUrls: number): string {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: ProcessingJob = {
      id: jobId,
      domain,
      status: 'queued',
      progress: 0,
      currentStage: 'Initializing extraction...',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        totalUrls,
        processedUrls: 0,
        aiStrategy: 'intelligent_queue',
        cacheHits: 0,
        successRate: 0
      }
    };
    
    this.jobs.set(jobId, job);
    this.saveToStorage();
    
    console.log(`📋 Created processing job ${jobId} for ${domain}`);
    return jobId;
  }

  // Update job progress and stage
  updateJob(
    jobId: string, 
    updates: Partial<ProcessingJob> & { 
      progress?: number; 
      currentStage?: string; 
      metadata?: Partial<ProcessingJob['metadata']> 
    }
  ): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    // Update basic fields
    Object.assign(job, updates);
    
    // Update metadata if provided
    if (updates.metadata) {
      Object.assign(job.metadata, updates.metadata);
    }
    
    job.updatedAt = new Date().toISOString();
    
    // Set completed timestamp if job is done
    if (updates.status === 'completed' || updates.status === 'failed') {
      job.completedAt = new Date().toISOString();
      job.progress = updates.status === 'completed' ? 100 : job.progress;
    }
    
    this.jobs.set(jobId, job);
    this.saveToStorage();
    
    console.log(`📊 Job ${jobId}: ${job.progress}% - ${job.currentStage}`);
  }

  // Get job status
  getJob(jobId: string): ProcessingJob | null {
    return this.jobs.get(jobId) || null;
  }

  // Get all active jobs
  getActiveJobs(): ProcessingJob[] {
    return Array.from(this.jobs.values())
      .filter(job => job.status === 'processing' || job.status === 'queued')
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  // Get recent completed jobs
  getRecentJobs(limit: number = 10): ProcessingJob[] {
    return Array.from(this.jobs.values())
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit);
  }

  // Complete job with results
  completeJob(jobId: string, results: any): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    this.updateJob(jobId, {
      status: 'completed',
      progress: 100,
      currentStage: `Completed! Processed ${results.total_processed || 0} articles`,
      results,
      metadata: {
        processedUrls: results.total_processed || 0,
        successRate: results.total_processed > 0 
          ? ((results.total_processed / job.metadata.totalUrls) * 100) 
          : 0,
        cacheHits: results.cache_performance?.articles_cached || 0
      }
    });

    console.log(`✅ Job ${jobId} completed successfully`);
  }

  // Fail job with error
  failJob(jobId: string, error: string): void {
    this.updateJob(jobId, {
      status: 'failed',
      currentStage: `Failed: ${error}`,
      error
    });

    console.log(`❌ Job ${jobId} failed: ${error}`);
  }

  // Check if there are processing jobs that might have been interrupted
  checkForInterruptedJobs(): ProcessingJob[] {
    const now = Date.now();
    const interrupted: ProcessingJob[] = [];

    this.jobs.forEach(job => {
      if (job.status === 'processing') {
        const timeSinceUpdate = now - new Date(job.updatedAt).getTime();
        // If no update for more than 5 minutes, consider interrupted
        if (timeSinceUpdate > 5 * 60 * 1000) {
          job.status = 'failed';
          job.error = 'Processing interrupted (likely due to page refresh)';
          job.currentStage = 'Processing was interrupted';
          interrupted.push(job);
        }
      }
    });

    if (interrupted.length > 0) {
      this.saveToStorage();
      console.log(`🔄 Found ${interrupted.length} interrupted jobs`);
    }

    return interrupted;
  }

  // Generate progress updates for frontend
  getProgressUpdate(jobId: string): {
    progress: number;
    stage: string;
    estimated_completion?: string;
    performance_stats?: any;
  } | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    const result: any = {
      progress: job.progress,
      stage: job.currentStage
    };

    // Estimate completion time if processing
    if (job.status === 'processing' && job.progress > 10) {
      const elapsed = Date.now() - new Date(job.startedAt).getTime();
      const estimatedTotal = (elapsed / job.progress) * 100;
      const remaining = estimatedTotal - elapsed;
      
      if (remaining > 0) {
        result.estimated_completion = new Date(Date.now() + remaining).toISOString();
      }
    }

    // Add performance stats if available
    if (job.metadata.processedUrls > 0) {
      result.performance_stats = {
        processed: job.metadata.processedUrls,
        total: job.metadata.totalUrls,
        success_rate: job.metadata.successRate,
        cache_hits: job.metadata.cacheHits,
        strategy: job.metadata.aiStrategy
      };
    }

    return result;
  }

  // Persist to localStorage (fallback storage)
  private saveToStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        const jobsArray = Array.from(this.jobs.entries());
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(jobsArray));
      }
    } catch (error) {
      console.error('Failed to save processing state:', error);
    }
  }

  // Load from localStorage
  private loadFromStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          const jobsArray = JSON.parse(stored);
          this.jobs = new Map(jobsArray);
          console.log(`📂 Loaded ${this.jobs.size} processing jobs from storage`);
        }
      }
    } catch (error) {
      console.error('Failed to load processing state:', error);
    }
  }

  // Clean up old completed jobs
  private startCleanupInterval(): void {
    if (typeof window === 'undefined') return;
    
    setInterval(() => {
      const now = Date.now();
      const cutoff = 24 * 60 * 60 * 1000; // 24 hours
      let cleanedCount = 0;

      this.jobs.forEach((job, jobId) => {
        if (job.status === 'completed' || job.status === 'failed') {
          const age = now - new Date(job.updatedAt).getTime();
          if (age > cutoff) {
            this.jobs.delete(jobId);
            cleanedCount++;
          }
        }
      });

      if (cleanedCount > 0) {
        this.saveToStorage();
        console.log(`🧹 Cleaned up ${cleanedCount} old processing jobs`);
      }
    }, 60 * 60 * 1000); // Check every hour
  }

  // Get processing statistics
  getStats(): {
    total_jobs: number;
    active_jobs: number;
    completed_jobs: number;
    failed_jobs: number;
    average_success_rate: number;
  } {
    const jobs = Array.from(this.jobs.values());
    
    const stats = {
      total_jobs: jobs.length,
      active_jobs: jobs.filter(j => j.status === 'processing' || j.status === 'queued').length,
      completed_jobs: jobs.filter(j => j.status === 'completed').length,
      failed_jobs: jobs.filter(j => j.status === 'failed').length,
      average_success_rate: 0
    };

    const completedJobs = jobs.filter(j => j.status === 'completed');
    if (completedJobs.length > 0) {
      const totalSuccessRate = completedJobs.reduce((sum, job) => sum + job.metadata.successRate, 0);
      stats.average_success_rate = totalSuccessRate / completedJobs.length;
    }

    return stats;
  }
}

// Export singleton instance
export const processingStateManager = new ProcessingStateManager();