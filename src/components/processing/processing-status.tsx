/**
 * Processing Status Component - Real-time progress tracking with persistence
 * Handles page refreshes and provides live updates during long-running extractions
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './processing-status.module.css';

interface ProcessingJob {
  id: string;
  domain: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  current_stage: string;
  started_at: string;
  updated_at: string;
  completed_at?: string;
  error?: string;
  results?: any;
  metadata: {
    totalUrls: number;
    processedUrls: number;
    aiStrategy: string;
    cacheHits: number;
    successRate: number;
  };
}

interface ProcessingStatusProps {
  jobId?: string;
  onComplete?: (results: any) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function ProcessingStatus({ 
  jobId, 
  onComplete, 
  onError, 
  className = '' 
}: ProcessingStatusProps) {
  const [job, setJob] = useState<ProcessingJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Fetch job status
  const fetchJobStatus = useCallback(async (currentJobId: string) => {
    try {
      const response = await fetch(`/api/scryptr/processing-status?jobId=${currentJobId}`);
      const data = await response.json();

      if (data.success) {
        setJob(data.job);
        setError(null);

        // Handle completion
        if (data.job.status === 'completed') {
          setIsPolling(false);
          if (onComplete && data.job.results) {
            onComplete(data.job.results);
          }
        }

        // Handle failure
        if (data.job.status === 'failed') {
          setIsPolling(false);
          const errorMsg = data.job.error || 'Processing failed';
          setError(errorMsg);
          if (onError) {
            onError(errorMsg);
          }
        }

        // Continue polling if still processing
        if (data.job.status === 'processing' || data.job.status === 'queued') {
          setIsPolling(true);
        }

      } else {
        setError(data.error || 'Failed to fetch job status');
        setIsPolling(false);
      }
    } catch (err) {
      setError('Network error while checking status');
      setIsPolling(false);
      console.error('Status fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [onComplete, onError]);

  // Start polling
  useEffect(() => {
    if (!jobId) {
      setLoading(false);
      return;
    }

    fetchJobStatus(jobId);
  }, [jobId, fetchJobStatus]);

  // Polling interval
  useEffect(() => {
    if (!isPolling || !jobId) return;

    const interval = setInterval(() => {
      fetchJobStatus(jobId);
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [isPolling, jobId, fetchJobStatus]);

  // Check for interrupted jobs on mount
  useEffect(() => {
    const checkInterruptedJobs = async () => {
      try {
        const response = await fetch('/api/scryptr/processing-status?action=stats');
        const data = await response.json();

        if (data.success && data.interrupted_jobs?.length > 0) {
          console.log(`Found ${data.interrupted_jobs.length} interrupted jobs`);
          // Could show a notification here
        }
      } catch (err) {
        console.error('Failed to check interrupted jobs:', err);
      }
    };

    checkInterruptedJobs();
  }, []);

  if (loading) {
    return (
      <div className={`${styles.statusContainer} ${className}`}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Checking processing status...</p>
        </div>
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className={`${styles.statusContainer} ${styles.error} ${className}`}>
        <div className={styles.errorIcon}>❌</div>
        <h3>Processing Error</h3>
        <p>{error}</p>
        <button 
          onClick={() => jobId && fetchJobStatus(jobId)}
          className={styles.retryButton}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!job && !loading) {
    return (
      <div className={`${styles.statusContainer} ${className}`}>
        <p>No processing job found</p>
      </div>
    );
  }

  if (!job) return null;

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime).getTime();
    const end = endTime ? new Date(endTime).getTime() : Date.now();
    const duration = (end - start) / 1000;
    
    if (duration < 60) return `${duration.toFixed(1)}s`;
    if (duration < 3600) return `${(duration / 60).toFixed(1)}m`;
    return `${(duration / 3600).toFixed(1)}h`;
  };

  const getStatusIcon = () => {
    switch (job.status) {
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'processing': return '⚡';
      case 'queued': return '⏳';
      default: return '🔄';
    }
  };

  const getProgressColor = () => {
    if (job.status === 'failed') return '#ef4444';
    if (job.status === 'completed') return '#10b981';
    if (job.progress > 80) return '#10b981';
    if (job.progress > 50) return '#f59e0b';
    return '#3b82f6';
  };

  return (
    <div className={`${styles.statusContainer} ${className}`}>
      <div className={styles.header}>
        <div className={styles.statusIcon}>{getStatusIcon()}</div>
        <div className={styles.titleSection}>
          <h3 className={styles.title}>
            Processing: {job.domain}
          </h3>
          <p className={styles.jobId}>Job ID: {job.id}</p>
        </div>
        <div className={styles.timeSection}>
          <span className={styles.duration}>
            {formatDuration(job.started_at, job.completed_at)}
          </span>
        </div>
      </div>

      <div className={styles.progressSection}>
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill}
            style={{ 
              width: `${job.progress}%`,
              backgroundColor: getProgressColor()
            }}
          ></div>
        </div>
        <div className={styles.progressText}>
          <span className={styles.percentage}>{job.progress}%</span>
          <span className={styles.stage}>{job.current_stage}</span>
        </div>
      </div>

      {job.metadata && (
        <div className={styles.metadata}>
          <div className={styles.metadataItem}>
            <span className={styles.label}>Articles:</span>
            <span className={styles.value}>
              {job.metadata.processedUrls}/{job.metadata.totalUrls}
            </span>
          </div>
          {job.metadata.aiStrategy && (
            <div className={styles.metadataItem}>
              <span className={styles.label}>Strategy:</span>
              <span className={styles.value}>{job.metadata.aiStrategy}</span>
            </div>
          )}
          {job.metadata.successRate > 0 && (
            <div className={styles.metadataItem}>
              <span className={styles.label}>Success Rate:</span>
              <span className={styles.value}>{job.metadata.successRate.toFixed(1)}%</span>
            </div>
          )}
          {job.metadata.cacheHits > 0 && (
            <div className={styles.metadataItem}>
              <span className={styles.label}>Cache Hits:</span>
              <span className={styles.value}>{job.metadata.cacheHits}</span>
            </div>
          )}
        </div>
      )}

      {job.status === 'failed' && job.error && (
        <div className={styles.errorDetails}>
          <h4>Error Details:</h4>
          <p>{job.error}</p>
          <button 
            onClick={() => {
              // Could implement retry logic here
              console.log('Retry requested for job:', job.id);
            }}
            className={styles.retryButton}
          >
            Start New Extraction
          </button>
        </div>
      )}

      {job.status === 'completed' && job.results && (
        <div className={styles.results}>
          <div className={styles.resultsSummary}>
            <h4>✅ Extraction Complete!</h4>
            <div className={styles.resultsGrid}>
              <div className={styles.resultItem}>
                <span className={styles.resultLabel}>Articles Found:</span>
                <span className={styles.resultValue}>
                  {job.results.data?.total_found || 0}
                </span>
              </div>
              <div className={styles.resultItem}>
                <span className={styles.resultLabel}>Successfully Processed:</span>
                <span className={styles.resultValue}>
                  {job.results.data?.total_processed || 0}
                </span>
              </div>
              {job.results.data?.orchestration_analytics && (
                <div className={styles.resultItem}>
                  <span className={styles.resultLabel}>AI Strategy:</span>
                  <span className={styles.resultValue}>
                    {job.results.data.orchestration_analytics.strategy_used}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isPolling && (
        <div className={styles.pollingIndicator}>
          <div className={styles.pulseIndicator}></div>
          <span>Live updates active</span>
        </div>
      )}
    </div>
  );
}