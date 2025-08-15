'use client';

import React, { useState, useEffect } from 'react';
import styles from './workflow-monitor.module.css';

interface WorkflowRun {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  triggerType: 'manual' | 'scheduled' | 'webhook' | 'api';
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  progress: {
    completedNodes: number;
    totalNodes: number;
    currentStep: string;
  };
}

interface WorkflowMonitorProps {
  workflowId?: string;
  onRunComplete?: (run: WorkflowRun) => void;
}

export default function WorkflowMonitor({ workflowId, onRunComplete }: WorkflowMonitorProps) {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRuns();
    
    // Poll for updates every 2 seconds
    const interval = setInterval(fetchRuns, 2000);
    
    return () => clearInterval(interval);
  }, [workflowId]);

  const fetchRuns = async () => {
    try {
      const response = await fetch('/api/workflow/execute');
      const data = await response.json();
      
      if (data.success) {
        setRuns(data.activeRuns || []);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch workflow runs');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const cancelRun = async (runId: string) => {
    try {
      const response = await fetch('/api/workflow/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        await fetchRuns(); // Refresh the list
      } else {
        alert(data.error || 'Failed to cancel workflow');
      }
    } catch (err) {
      alert('Failed to cancel workflow');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'running': return '⚡';
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'cancelled': return '🚫';
      default: return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#fbbf24';
      case 'running': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'failed': return '#ef4444';
      case 'cancelled': return '#6b7280';
      default: return '#9ca3af';
    }
  };

  const formatDuration = (start: Date, end?: Date) => {
    const endTime = end || new Date();
    const duration = Math.floor((endTime.getTime() - start.getTime()) / 1000);
    
    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  if (loading && runs.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <span>Loading workflow runs...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <span className={styles.titleIcon}>📊</span>
          Workflow Monitor
        </h3>
        {runs.length > 0 && (
          <div className={styles.summary}>
            {runs.filter(r => r.status === 'running').length} running, 
            {runs.filter(r => r.status === 'completed').length} completed
          </div>
        )}
      </div>

      {error && (
        <div className={styles.error}>
          <span className={styles.errorIcon}>⚠️</span>
          {error}
        </div>
      )}

      {runs.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🔄</div>
          <h4>No Active Workflow Runs</h4>
          <p>Start a workflow to see execution progress here.</p>
        </div>
      ) : (
        <div className={styles.runsList}>
          {runs.map((run) => (
            <div key={run.id} className={styles.runCard}>
              <div className={styles.runHeader}>
                <div className={styles.runStatus}>
                  <span 
                    className={styles.statusIcon}
                    style={{ color: getStatusColor(run.status) }}
                  >
                    {getStatusIcon(run.status)}
                  </span>
                  <span className={styles.statusText}>{run.status.toUpperCase()}</span>
                </div>
                
                <div className={styles.runMeta}>
                  <span className={styles.runId}>#{run.id.slice(-8)}</span>
                  <span className={styles.duration}>
                    {formatDuration(run.startedAt, run.completedAt)}
                  </span>
                </div>
              </div>

              {run.status === 'running' && (
                <div className={styles.progress}>
                  <div className={styles.progressBar}>
                    <div 
                      className={styles.progressFill}
                      style={{ 
                        width: `${(run.progress.completedNodes / run.progress.totalNodes) * 100}%` 
                      }}
                    />
                  </div>
                  <div className={styles.progressText}>
                    {run.progress.completedNodes} / {run.progress.totalNodes} nodes completed
                  </div>
                  <div className={styles.currentStep}>
                    {run.progress.currentStep}
                  </div>
                </div>
              )}

              {run.error && (
                <div className={styles.runError}>
                  <span className={styles.errorIcon}>❌</span>
                  {run.error}
                </div>
              )}

              <div className={styles.runActions}>
                <span className={styles.triggerType}>
                  Triggered: {run.triggerType}
                </span>
                
                {run.status === 'running' && (
                  <button 
                    className={styles.cancelButton}
                    onClick={() => cancelRun(run.id)}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}