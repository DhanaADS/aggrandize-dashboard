'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import styles from './scryptr.module.css';
import WorkflowMonitor from '../../../components/workflow/WorkflowMonitor';

interface WorkflowNode {
  id: string;
  type: 'start' | 'source' | 'seo' | 'filter' | 'process' | 'ai' | 'output';
  nodeType: string;
  title: string;
  subtitle?: string;
  icon: string;
  position: { x: number; y: number };
  properties: Record<string, unknown>;
  status: 'idle' | 'active' | 'completed' | 'error';
}

interface NodeConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourcePort: string;
  targetPort: string;
}

export default function ScryptrPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<WorkflowNode[]>([
    {
      id: 'start-1',
      type: 'start',
      nodeType: 'start',
      title: 'Start',
      subtitle: 'Workflow trigger',
      icon: '🚀',
      position: { x: 400, y: 300 },
      properties: {},
      status: 'idle'
    }
  ]);
  const [connections, setConnections] = useState<NodeConnection[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMonitor, setShowMonitor] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);

  // Canvas interaction
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Node palette data - Extended for SEO automation
  const nodeTypes = useMemo(() => ({
    source: [
      { type: 'http-request', title: 'HTTP Request', icon: '🌐', description: 'Make GET/POST requests with auth & headers' },
      { type: 'sitemap-crawler', title: 'Sitemap Crawler', icon: '🗺️', description: 'Extract URLs from XML sitemaps' },
      { type: 'serp-scraper', title: 'SERP Scraper', icon: '🔍', description: 'Scrape Google search results' },
      { type: 'competitor-analysis', title: 'Competitor Analysis', icon: '🏆', description: 'Analyze competitor websites' },
      { type: 'keyword-research', title: 'Keyword Research', icon: '🔑', description: 'Research keywords with volume & difficulty' },
      { type: 'backlink-checker', title: 'Backlink Checker', icon: '🔗', description: 'Check backlinks for domains' },
      { type: 'rss-feed', title: 'RSS Feed', icon: '📡', description: 'Fetch articles from RSS feeds' },
      { type: 'csv-import', title: 'CSV Import', icon: '📊', description: 'Import data from CSV files' },
      { type: 'database-read', title: 'Database Read', icon: '📖', description: 'Read from database tables' }
    ],
    seo: [
      { type: 'page-analyzer', title: 'Page Analyzer', icon: '📄', description: 'Analyze on-page SEO factors' },
      { type: 'schema-extractor', title: 'Schema Extractor', icon: '🏷️', description: 'Extract structured data markup' },
      { type: 'meta-optimizer', title: 'Meta Optimizer', icon: '🎯', description: 'Optimize title tags & descriptions' },
      { type: 'internal-links', title: 'Internal Links', icon: '🔗', description: 'Analyze internal link structure' },
      { type: 'content-gaps', title: 'Content Gaps', icon: '📊', description: 'Find content gap opportunities' },
      { type: 'rank-tracker', title: 'Rank Tracker', icon: '📈', description: 'Track keyword rankings over time' },
      { type: 'site-audit', title: 'Site Audit', icon: '🔍', description: 'Comprehensive technical SEO audit' }
    ],
    filter: [
      { type: 'keyword-filter', title: 'Keyword Filter', icon: '🔑', description: 'Filter by keyword criteria' },
      { type: 'ranking-filter', title: 'Ranking Filter', icon: '📊', description: 'Filter by ranking positions' },
      { type: 'content-filter', title: 'Content Filter', icon: '📝', description: 'Filter by content patterns' },
      { type: 'domain-filter', title: 'Domain Filter', icon: '🌐', description: 'Filter by domain criteria' },
      { type: 'date-filter', title: 'Date Filter', icon: '📅', description: 'Filter by date ranges' },
      { type: 'traffic-filter', title: 'Traffic Filter', icon: '📈', description: 'Filter by traffic metrics' }
    ],
    process: [
      { type: 'content-extractor', title: 'Content Extractor', icon: '📄', description: 'Extract specific content elements' },
      { type: 'text-cleaner', title: 'Text Cleaner', icon: '🧹', description: 'Clean and normalize text content' },
      { type: 'url-processor', title: 'URL Processor', icon: '🔗', description: 'Process and validate URLs' },
      { type: 'data-merger', title: 'Data Merger', icon: '🔀', description: 'Merge data from multiple sources' },
      { type: 'deduplicator', title: 'Deduplicator', icon: '🔄', description: 'Remove duplicate entries' },
      { type: 'data-transformer', title: 'Data Transformer', icon: '⚙️', description: 'Transform data formats' },
      { type: 'regex-processor', title: 'Regex Processor', icon: '🔤', description: 'Process text with regex patterns' }
    ],
    ai: [
      { type: 'gpt4-agent', title: 'GPT-4 Agent', icon: '🤖', description: 'Advanced AI processing with GPT-4' },
      { type: 'claude-agent', title: 'Claude Agent', icon: '🧠', description: 'AI analysis with Claude Sonnet' },
      { type: 'gemini-agent', title: 'Gemini Agent', icon: '💎', description: 'Google Gemini AI processing' },
      { type: 'content-writer', title: 'Content Writer', icon: '✍️', description: 'AI content generation' },
      { type: 'seo-optimizer', title: 'SEO Optimizer', icon: '🎯', description: 'AI-powered SEO optimization' },
      { type: 'sentiment-analyzer', title: 'Sentiment Analyzer', icon: '😊', description: 'Analyze content sentiment' },
      { type: 'keyword-generator', title: 'Keyword Generator', icon: '🔑', description: 'AI keyword suggestions' },
      { type: 'custom-prompt', title: 'Custom Prompt', icon: '💬', description: 'Custom AI prompt processing' }
    ],
    output: [
      { type: 'database-write', title: 'Database Write', icon: '💾', description: 'Save data to database' },
      { type: 'csv-export', title: 'CSV Export', icon: '📊', description: 'Export data as CSV file' },
      { type: 'excel-export', title: 'Excel Export', icon: '📈', description: 'Export data as Excel file' },
      { type: 'json-export', title: 'JSON Export', icon: '📋', description: 'Export data as JSON file' },
      { type: 'api-webhook', title: 'API Webhook', icon: '📡', description: 'Send data via webhook' },
      { type: 'email-report', title: 'Email Report', icon: '📧', description: 'Send automated email reports' },
      { type: 'slack-notify', title: 'Slack Notify', icon: '💬', description: 'Send notifications to Slack' },
      { type: 'google-sheets', title: 'Google Sheets', icon: '📊', description: 'Export to Google Sheets' }
    ]
  }), []);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).classList.contains('workflow-canvas')) {
      setIsDragging(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
    
    // Clear selection if clicking on empty canvas
    if (!e.ctrlKey && !e.metaKey) {
      setSelectedNodes(new Set());
    }
  }, []);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - lastMousePos.x;
      const deltaY = e.clientY - lastMousePos.y;
      
      setTransform(prev => ({
        ...prev,
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, lastMousePos]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newScale = Math.min(Math.max(0.25, transform.scale + delta), 3);
    
    setTransform(prev => ({
      ...prev,
      scale: newScale
    }));
  }, [transform.scale]);

  const addNode = useCallback((nodeType: string, category: string) => {
    const nodeInfo = nodeTypes[category as keyof typeof nodeTypes]?.find(n => n.type === nodeType);
    if (!nodeInfo) return;

    const newNode: WorkflowNode = {
      id: `${nodeType}-${Date.now()}`,
      type: category as WorkflowNode['type'],
      nodeType: nodeType,
      title: nodeInfo.title,
      subtitle: nodeInfo.description,
      icon: nodeInfo.icon,
      position: { 
        x: 400 + Math.random() * 200, 
        y: 300 + Math.random() * 200 
      },
      properties: {},
      status: 'idle'
    };

    setNodes(prev => [...prev, newNode]);
  }, [nodeTypes]);

  const deleteSelectedNodes = useCallback(() => {
    setNodes(prev => prev.filter(node => !selectedNodes.has(node.id)));
    setConnections(prev => prev.filter(conn => 
      !selectedNodes.has(conn.sourceNodeId) && !selectedNodes.has(conn.targetNodeId)
    ));
    setSelectedNodes(new Set());
  }, [selectedNodes]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      deleteSelectedNodes();
    }
  }, [deleteSelectedNodes]);

  // Add keyboard listeners
  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleStartProcessing = async () => {
    if (nodes.length === 0) {
      alert('Please add some nodes to your workflow first');
      return;
    }

    setIsProcessing(true);
    setShowMonitor(true);

    try {
      // Create a temporary workflow definition
      const workflowDefinition = {
        id: `temp_${Date.now()}`,
        name: 'Scryptr Workflow',
        description: 'Custom workflow created in Scryptr',
        nodes: nodes.map(node => ({
          ...node,
          nodeType: node.nodeType || node.type
        })),
        connections,
        variables: {},
        settings: {
          maxRetries: 3,
          timeout: 300000,
          parallelExecution: false,
          errorStrategy: 'stop' as const
        }
      };

      // Start workflow execution
      const response = await fetch('/api/workflow/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowDefinition,
          inputData: {},
          triggerType: 'manual'
        })
      });

      const data = await response.json();

      if (data.success) {
        setCurrentWorkflowId(data.workflowRun.id);
        console.log('Workflow started:', data.workflowRun);
      } else {
        alert(data.error || 'Failed to start workflow');
      }
    } catch (error) {
      console.error('Failed to start workflow:', error);
      alert('Failed to start workflow');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveWorkflow = async () => {
    if (nodes.length === 0) {
      alert('Please add some nodes to your workflow first');
      return;
    }

    try {
      const workflowData = {
        name: `Scryptr Workflow ${new Date().toLocaleDateString()}`,
        description: 'SEO automation workflow created in Scryptr',
        isPublic: false,
        nodes,
        connections,
        variables: {},
        settings: {
          maxRetries: 3,
          timeout: 300000,
          parallelExecution: false,
          errorStrategy: 'stop'
        }
      };

      const response = await fetch('/api/scryptr/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData)
      });

      const data = await response.json();

      if (data.success) {
        alert('Workflow saved successfully!');
      } else {
        alert(data.error || 'Failed to save workflow');
      }
    } catch (error) {
      console.error('Failed to save workflow:', error);
      alert('Failed to save workflow');
    }
  };

  const loadTemplate = (templateName: string) => {
    // Import and load SEO templates dynamically
    import('../../../lib/workflow/templates/seo-templates').then(({ seoWorkflowTemplates }) => {
      const template = seoWorkflowTemplates[templateName];
      if (template) {
        // Ensure all nodes have nodeType property
        const nodesWithNodeType = template.nodes.map(node => ({
          ...node,
          nodeType: node.nodeType || node.type
        }));
        
        setNodes(nodesWithNodeType);
        setConnections(template.connections);
        setShowTemplates(false);
        
        // Center the workflow in view
        setTransform({ x: 0, y: 0, scale: 1 });
      }
    });
  };

  return (
    <div className={styles.scryptrContainer}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>🤖</span>
            Scryptr Workflow Builder
          </h1>
          <p className={styles.subtitle}>Design your AI-powered content processing pipeline</p>
        </div>
        
        <div className={styles.headerActions}>
          <button 
            className={styles.actionButton}
            onClick={() => setShowTemplates(!showTemplates)}
          >
            📋 Templates
          </button>
          <button 
            className={styles.actionButton}
            onClick={() => setShowMonitor(!showMonitor)}
          >
            📊 {showMonitor ? 'Hide Monitor' : 'Show Monitor'}
          </button>
          <button 
            className={styles.actionButton}
            onClick={handleSaveWorkflow}
          >
            💾 Save Workflow
          </button>
          <button 
            className={styles.primaryButton}
            onClick={handleStartProcessing}
            disabled={isProcessing}
          >
            {isProcessing ? '⏳ Starting...' : '▶️ Run Workflow'}
          </button>
        </div>
      </div>

      <div className={styles.workspaceContainer}>
        {/* Node Palette Sidebar */}
        <div className={styles.nodePalette}>
          <div className={styles.paletteHeader}>
            <h3>Node Palette</h3>
          </div>
          
          <div className={styles.paletteContent}>
            {Object.entries(nodeTypes).map(([category, nodes]) => (
              <div key={category} className={styles.nodeCategory}>
                <div className={styles.categoryHeader}>
                  <span className={styles.categoryIcon}>
                    {category === 'source' ? '📥' : 
                     category === 'seo' ? '🎯' :
                     category === 'filter' ? '🔍' :
                     category === 'process' ? '⚙️' :
                     category === 'ai' ? '🤖' : '📤'}
                  </span>
                  <span className={styles.categoryTitle}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </span>
                </div>
                
                <div className={styles.nodeList}>
                  {nodes.map((node) => (
                    <div 
                      key={node.type}
                      className={styles.paletteNode}
                      onClick={() => addNode(node.type, category)}
                      title={node.description}
                    >
                      <span className={styles.nodeIcon}>{node.icon}</span>
                      <span className={styles.nodeTitle}>{node.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Canvas */}
        <div 
          className={styles.workflowCanvas}
          ref={containerRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onWheel={handleWheel}
        >
          {/* Canvas Grid Background */}
          <div 
            className={styles.canvasGrid}
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transformOrigin: '0 0'
            }}
          />

          {/* Workflow Content */}
          <div 
            className={styles.workflowContent}
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transformOrigin: '0 0'
            }}
          >
            {/* Render nodes */}
            {nodes.map((node) => (
              <div
                key={node.id}
                className={`${styles.workflowNode} ${selectedNodes.has(node.id) ? styles.selected : ''}`}
                data-type={node.type}
                style={{
                  left: node.position.x,
                  top: node.position.y,
                  transform: 'translate(-50%, -50%)'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (e.ctrlKey || e.metaKey) {
                    setSelectedNodes(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(node.id)) {
                        newSet.delete(node.id);
                      } else {
                        newSet.add(node.id);
                      }
                      return newSet;
                    });
                  } else {
                    setSelectedNodes(new Set([node.id]));
                  }
                }}
              >
                <div className={styles.nodeIcon}>{node.icon}</div>
                <div className={styles.nodeContent}>
                  <div className={styles.nodeTitle}>{node.title}</div>
                  <div className={styles.nodeSubtitle}>{node.subtitle}</div>
                </div>
                <div className={styles.nodeStatus}>
                  {node.status === 'completed' && <span>✓</span>}
                  {node.status === 'error' && <span>✗</span>}
                  {node.status === 'active' && <span>⚡</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Canvas Controls */}
          <div className={styles.canvasControls}>
            <button 
              className={styles.controlButton}
              onClick={() => setTransform(prev => ({ ...prev, scale: Math.min(prev.scale * 1.2, 3) }))}
              title="Zoom In"
            >
              +
            </button>
            <button 
              className={styles.controlButton}
              onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}
              title="Reset View"
            >
              ⌂
            </button>
            <button 
              className={styles.controlButton}
              onClick={() => setTransform(prev => ({ ...prev, scale: Math.max(prev.scale * 0.8, 0.25) }))}
              title="Zoom Out"
            >
              −
            </button>
            <div className={styles.zoomLevel}>{Math.round(transform.scale * 100)}%</div>
          </div>
        </div>

        {/* Template Selector Panel */}
        {showTemplates && (
          <div className={styles.templatePanel}>
            <div className={styles.templateHeader}>
              <h3>SEO Workflow Templates</h3>
              <button 
                className={styles.closeButton}
                onClick={() => setShowTemplates(false)}
              >
                ✕
              </button>
            </div>
            
            <div className={styles.templateList}>
              <div 
                className={styles.templateCard}
                onClick={() => loadTemplate('keywordResearch')}
              >
                <div className={styles.templateIcon}>🔑</div>
                <div className={styles.templateInfo}>
                  <h4>Keyword Research & Analysis</h4>
                  <p>Comprehensive keyword research with competitor analysis and content gaps</p>
                  <div className={styles.templateStats}>
                    <span>5 nodes</span> • <span>~10 min</span>
                  </div>
                </div>
              </div>

              <div 
                className={styles.templateCard}
                onClick={() => loadTemplate('contentOptimization')}
              >
                <div className={styles.templateIcon}>✍️</div>
                <div className={styles.templateInfo}>
                  <h4>AI Content Optimization</h4>
                  <p>Analyze and generate SEO-optimized content using AI</p>
                  <div className={styles.templateStats}>
                    <span>6 nodes</span> • <span>~15 min</span>
                  </div>
                </div>
              </div>

              <div 
                className={styles.templateCard}
                onClick={() => loadTemplate('rankTracking')}
              >
                <div className={styles.templateIcon}>📈</div>
                <div className={styles.templateInfo}>
                  <h4>Keyword Rank Tracking</h4>
                  <p>Monitor keyword positions across search engines</p>
                  <div className={styles.templateStats}>
                    <span>6 nodes</span> • <span>~20 min</span>
                  </div>
                </div>
              </div>

              <div 
                className={styles.templateCard}
                onClick={() => loadTemplate('competitorMonitoring')}
              >
                <div className={styles.templateIcon}>🏆</div>
                <div className={styles.templateInfo}>
                  <h4>Competitor Monitoring</h4>
                  <p>Track competitor content and find opportunities</p>
                  <div className={styles.templateStats}>
                    <span>6 nodes</span> • <span>~30 min</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Workflow Monitor Panel */}
        {showMonitor && (
          <div className={styles.monitorPanel}>
            <WorkflowMonitor 
              workflowId={currentWorkflowId || undefined}
              onRunComplete={(run) => {
                console.log('Workflow completed:', run);
                setIsProcessing(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}