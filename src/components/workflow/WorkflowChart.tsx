'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import FlowchartNode from './FlowchartNode';
import RuleNode, { Rule } from './RuleNode';
import ConnectionLine from './ConnectionLine';
import styles from './workflow.module.css';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  titleRules: Rule[];
  bodyRules: Rule[];
  urlRules: Rule[];
  titleLogic: 'AND' | 'OR';
  bodyLogic: 'AND' | 'OR';
  urlLogic: 'AND' | 'OR';
  aiConfig: {
    apiProvider: string;
    model: string;
    customPrompt: string;
    dataFields: string[];
  };
  filters: {
    maxArticles: number;
    dateRange: number;
    keywords: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowChartProps {
  selectedSources: Array<{
    type: 'sitemap' | 'rss' | 'atom';
    url: string;
    title: string;
    count: number;
  }>;
  onStartProcessing: (config: WorkflowConfig) => void;
  isProcessing: boolean;
  progress: {
    percentage: number;
    currentStep: string;
    articlesProcessed: number;
    totalArticles: number;
  };
}

export interface WorkflowConfig {
  titleRules: Rule[];
  bodyRules: Rule[];
  urlRules: Rule[];
  titleLogic: 'AND' | 'OR';
  bodyLogic: 'AND' | 'OR';
  urlLogic: 'AND' | 'OR';
  aiConfig: {
    apiProvider: string;
    apiKey: string;
    model: string;
    customPrompt: string;
    dataFields: string[];
  };
  filters: {
    maxArticles: number;
    dateRange: number;
    keywords: string;
  };
}

export default function WorkflowChart({
  selectedSources,
  onStartProcessing,
  isProcessing,
  progress
}: WorkflowChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [activePopup, setActivePopup] = useState<string | null>(null);
  const [transform, setTransform] = useState({ x: -100, y: -50, scale: 0.8 });
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingNode, setIsDraggingNode] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const lastClickTime = useRef(0);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [newTemplateIsPublic, setNewTemplateIsPublic] = useState(false);
  
  // Workflow configuration state
  const [workflowConfig, setWorkflowConfig] = useState<WorkflowConfig>({
    titleRules: [],
    bodyRules: [],
    urlRules: [],
    titleLogic: 'OR',
    bodyLogic: 'OR',
    urlLogic: 'OR',
    aiConfig: {
      apiProvider: 'openrouter',
      apiKey: '',
      model: 'qwen/qwen3-8b:free',
      customPrompt: `For each article, extract the following information:
- title: The article headline
- summary: 2-sentence summary of the main points
- author: Author name if available
- publication_date: When the article was published
- main_topic: Primary topic/category (1-2 words)
- sentiment: Overall tone (Positive, Negative, Neutral)
- key_companies: Companies mentioned (comma-separated)
- keywords: 5 most important keywords (comma-separated)`,
      dataFields: ['title', 'summary', 'author', 'publication_date', 'main_topic', 'sentiment', 'key_companies', 'keywords']
    },
    filters: {
      maxArticles: 50,
      dateRange: 30,
      keywords: ''
    }
  });

  // Default node positions with optimal spacing for pan/zoom canvas
  const defaultNodePositions = {
    start: { x: 300, y: 400 },
    titleRules: { x: 650, y: 250 },
    bodyRules: { x: 650, y: 400 },
    urlRules: { x: 650, y: 550 },
    processing: { x: 1000, y: 400 },
    aiConfig: { x: 1350, y: 350 },
    results: { x: 1700, y: 400 }
  };
  
  // State for dynamic node positions
  const [nodePositions, setNodePositions] = useState(defaultNodePositions);

  const toggleNodeExpansion = (nodeId: string) => {
    const now = Date.now();
    
    // Debounce rapid clicks (prevent multiple clicks within 200ms)
    if (now - lastClickTime.current < 200) {
      return;
    }
    lastClickTime.current = now;
    
    setExpandedNodes(prev => {
      const newSet = new Set();
      
      // If this node is already expanded, close it
      if (prev.has(nodeId)) {
        // Return empty set (close all)
        return newSet;
      } else {
        // Close any other nodes and open this one
        newSet.add(nodeId);
        return newSet;
      }
    });
  };

  const showPopup = (nodeId: string) => {
    const now = Date.now();
    
    // Debounce rapid clicks (prevent multiple clicks within 200ms)
    if (now - lastClickTime.current < 200) {
      return;
    }
    lastClickTime.current = now;
    
    // Toggle popup - if same popup is open, close it, otherwise open new one
    setActivePopup(prev => prev === nodeId ? null : nodeId);
  };

  const closePopup = () => {
    setActivePopup(null);
  };

  const updateTitleRules = (rules: Rule[]) => {
    setWorkflowConfig(prev => ({ ...prev, titleRules: rules }));
  };

  const updateBodyRules = (rules: Rule[]) => {
    setWorkflowConfig(prev => ({ ...prev, bodyRules: rules }));
  };

  const updateUrlRules = (rules: Rule[]) => {
    setWorkflowConfig(prev => ({ ...prev, urlRules: rules }));
  };

  const updateTitleLogic = (logic: 'AND' | 'OR') => {
    setWorkflowConfig(prev => ({ ...prev, titleLogic: logic }));
  };

  const updateBodyLogic = (logic: 'AND' | 'OR') => {
    setWorkflowConfig(prev => ({ ...prev, bodyLogic: logic }));
  };

  const updateUrlLogic = (logic: 'AND' | 'OR') => {
    setWorkflowConfig(prev => ({ ...prev, urlLogic: logic }));
  };

  const getNodeStatus = (nodeId: string) => {
    if (!isProcessing) return 'idle';
    
    // Simple status logic based on progress
    switch (nodeId) {
      case 'start':
        return progress.percentage > 0 ? 'completed' : 'idle';
      case 'titleRules':
      case 'bodyRules':
      case 'urlRules':
        return progress.percentage > 20 ? 'completed' : progress.percentage > 0 ? 'active' : 'idle';
      case 'processing':
        return progress.percentage > 80 ? 'completed' : progress.percentage > 20 ? 'active' : 'idle';
      case 'aiConfig':
        return progress.percentage > 90 ? 'completed' : progress.percentage > 80 ? 'active' : 'idle';
      case 'results':
        return progress.percentage === 100 ? 'completed' : 'idle';
      default:
        return 'idle';
    }
  };

  const getConnectionStatus = (from: string, to: string) => {
    const fromStatus = getNodeStatus(from);
    const toStatus = getNodeStatus(to);
    
    if (fromStatus === 'completed' && toStatus === 'active') return 'active';
    if (fromStatus === 'completed' && toStatus === 'completed') return 'completed';
    return 'idle';
  };

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const response = await fetch('/api/scryptr/templates?includePrivate=true');
      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.templates);
      } else {
        console.error('Failed to load templates:', data.error);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const loadTemplate = async (templateId: string) => {
    if (!templateId) return;
    
    try {
      const response = await fetch(`/api/scryptr/templates/${templateId}`);
      const data = await response.json();
      
      if (data.success) {
        const template = data.template;
        
        // Update workflow configuration with template data
        setWorkflowConfig({
          titleRules: template.title_rules || [],
          bodyRules: template.body_rules || [],
          urlRules: template.url_rules || [],
          titleLogic: template.title_logic || 'OR',
          bodyLogic: template.body_logic || 'OR',
          urlLogic: template.url_logic || 'OR',
          aiConfig: {
            ...template.ai_config,
            apiKey: workflowConfig.aiConfig.apiKey // Keep existing API key
          },
          filters: template.filters || { maxArticles: 50, dateRange: 30, keywords: '' }
        });
        
        // Increment usage count
        fetch(`/api/scryptr/templates/${templateId}`, { method: 'POST' });
        
        alert(`Template "${template.name}" loaded successfully!`);
      } else {
        alert('Failed to load template: ' + data.error);
      }
    } catch (error) {
      console.error('Error loading template:', error);
      alert('Error loading template');
    }
  };

  const saveTemplate = async () => {
    if (!newTemplateName.trim()) {
      alert('Please enter a template name');
      return;
    }
    
    setIsSavingTemplate(true);
    try {
      const response = await fetch('/api/scryptr/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTemplateName,
          description: newTemplateDescription,
          isPublic: newTemplateIsPublic,
          titleRules: workflowConfig.titleRules,
          bodyRules: workflowConfig.bodyRules,
          urlRules: workflowConfig.urlRules,
          titleLogic: workflowConfig.titleLogic,
          bodyLogic: workflowConfig.bodyLogic,
          urlLogic: workflowConfig.urlLogic,
          aiConfig: {
            ...workflowConfig.aiConfig,
            apiKey: '' // Don't save API key
          },
          filters: workflowConfig.filters
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Template saved successfully!');
        setShowSaveDialog(false);
        setNewTemplateName('');
        setNewTemplateDescription('');
        setNewTemplateIsPublic(false);
        loadTemplates(); // Refresh templates list
      } else {
        alert('Failed to save template: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template');
    } finally {
      setIsSavingTemplate(false);
    }
  };


  // Mouse event handlers with proper n8n-style behavior
  const handleNodeMouseDown = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDraggingNode(nodeId);
    const startPos = { x: e.clientX, y: e.clientY };
    lastMousePosRef.current = startPos;
    setLastMousePos(startPos);
    
    // Add global mouse event listeners
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const deltaX = (e.clientX - lastMousePosRef.current.x) / transform.scale;
      const deltaY = (e.clientY - lastMousePosRef.current.y) / transform.scale;
      
      setNodePositions(prev => ({
        ...prev,
        [nodeId]: {
          x: prev[nodeId as keyof typeof prev].x + deltaX,
          y: prev[nodeId as keyof typeof prev].y + deltaY
        }
      }));
      
      const newPos = { x: e.clientX, y: e.clientY };
      lastMousePosRef.current = newPos;
      setLastMousePos(newPos);
    };
    
    const handleGlobalMouseUp = () => {
      setIsDraggingNode(null);
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
    
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
  }, [transform.scale]);

  // Canvas panning functionality
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // Only pan if clicking on the canvas background
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('workflow-canvas-background')) {
      e.preventDefault();
      setIsDragging(true);
      const startPos = { x: e.clientX, y: e.clientY };
      lastMousePosRef.current = startPos;
      setLastMousePos(startPos);
      
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - lastMousePosRef.current.x;
        const deltaY = e.clientY - lastMousePosRef.current.y;
        
        setTransform(prev => ({
          ...prev,
          x: prev.x + deltaX,
          y: prev.y + deltaY
        }));
        
        const newPos = { x: e.clientX, y: e.clientY };
        lastMousePosRef.current = newPos;
        setLastMousePos(newPos);
      };
      
      const handleGlobalMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
      
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }
  }, []);

  // Prevent context menu on canvas
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);


  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newScale = Math.min(Math.max(0.5, transform.scale + delta), 2);
    
    setTransform(prev => ({
      ...prev,
      scale: newScale
    }));
  }, [transform.scale]);

  const resetZoom = () => {
    setTransform({ x: -100, y: -50, scale: 0.8 });
  };

  const zoomIn = () => {
    setTransform(prev => ({
      ...prev,
      scale: Math.min(prev.scale + 0.2, 2)
    }));
  };

  const zoomOut = () => {
    setTransform(prev => ({
      ...prev,
      scale: Math.max(prev.scale - 0.2, 0.5)
    }));
  };

  const handleStartProcessing = () => {
    if (!workflowConfig.aiConfig.apiKey) {
      alert('Please enter your API key in the AI Configuration node');
      return;
    }
    
    onStartProcessing(workflowConfig);
  };

  return (
    <div className={styles.workflowContainer} ref={containerRef}>
      {/* Workflow Header */}
      <div className={styles.workflowHeader}>
        <div className={styles.workflowTitle}>
          <h3>🔄 Workflow Configuration</h3>
          <p>Design your article processing pipeline</p>
        </div>
        
        {/* Template selector */}
        <div className={styles.templateSelector}>
          <select
            value={selectedTemplate}
            onChange={(e) => {
              setSelectedTemplate(e.target.value);
              if (e.target.value) {
                loadTemplate(e.target.value);
              }
            }}
            className={styles.templateSelect}
            disabled={isLoadingTemplates}
          >
            <option value="">{
              isLoadingTemplates ? 'Loading templates...' : 'Select Template'
            }</option>
            {templates.map(template => (
              <option key={template.id} value={template.id}>
                {template.name} {template.is_public ? '(Public)' : '(Private)'}
              </option>
            ))}
          </select>
          <button 
            onClick={() => setShowSaveDialog(true)}
            className={styles.templateButton}
            disabled={isSavingTemplate}
          >
            💾 Save Template
          </button>
          <button 
            onClick={loadTemplates}
            className={styles.templateButton}
            disabled={isLoadingTemplates}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Progress Display */}
      {isProcessing && (
        <div className={styles.progressDisplay}>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <div className={styles.progressInfo}>
            <span className={styles.progressPercentage}>{progress.percentage}%</span>
            <span className={styles.progressStatus}>{progress.currentStep}</span>
            <span className={styles.progressCount}>
              {progress.articlesProcessed} / {progress.totalArticles} articles
            </span>
          </div>
        </div>
      )}

      {/* Workflow Canvas */}
      <div 
        className={styles.workflowCanvas}
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      >
        {/* Canvas Background for panning */}
        <div 
          className={`${styles.canvasBackground} workflow-canvas-background`}
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: '0 0'
          }}
        />
        {/* Zoom Controls */}
        <div className={styles.zoomControls}>
          <button onClick={zoomIn} className={styles.zoomButton} title="Zoom In">
            +
          </button>
          <button onClick={resetZoom} className={styles.zoomButton} title="Reset Zoom">
            ⌂
          </button>
          <button onClick={zoomOut} className={styles.zoomButton} title="Zoom Out">
            −
          </button>
          <div className={styles.zoomLevel}>{Math.round(transform.scale * 100)}%</div>
        </div>
        
        {/* Mini Map */}
        <div className={styles.miniMap}>
          <div className={styles.miniMapTitle}>Workflow Map</div>
          <div className={styles.miniMapCanvas}>
            <div 
              className={styles.miniMapViewport}
              style={{
                transform: `translate(${-transform.x * 0.1}px, ${-transform.y * 0.1}px) scale(${transform.scale * 0.1})`
              }}
            >
              {Object.entries(nodePositions).map(([nodeId, position]) => (
                <div
                  key={nodeId}
                  className={styles.miniMapNode}
                  style={{
                    left: position.x * 0.1,
                    top: position.y * 0.1,
                    transform: 'translate(-50%, -50%)'
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Workflow Content */}
        <div 
          className={styles.workflowContent}
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: '0 0'
          }}
        >
          {/* Connection Lines */}
          <ConnectionLine
          from={nodePositions.start}
          to={nodePositions.titleRules}
          status={getConnectionStatus('start', 'titleRules')}
          animated={isProcessing}
        />
        <ConnectionLine
          from={nodePositions.start}
          to={nodePositions.bodyRules}
          status={getConnectionStatus('start', 'bodyRules')}
          animated={isProcessing}
        />
        <ConnectionLine
          from={nodePositions.start}
          to={nodePositions.urlRules}
          status={getConnectionStatus('start', 'urlRules')}
          animated={isProcessing}
        />
        <ConnectionLine
          from={nodePositions.titleRules}
          to={nodePositions.processing}
          status={getConnectionStatus('titleRules', 'processing')}
          animated={isProcessing}
        />
        <ConnectionLine
          from={nodePositions.bodyRules}
          to={nodePositions.processing}
          status={getConnectionStatus('bodyRules', 'processing')}
          animated={isProcessing}
        />
        <ConnectionLine
          from={nodePositions.urlRules}
          to={nodePositions.processing}
          status={getConnectionStatus('urlRules', 'processing')}
          animated={isProcessing}
        />
        <ConnectionLine
          from={nodePositions.processing}
          to={nodePositions.aiConfig}
          status={getConnectionStatus('processing', 'aiConfig')}
          animated={isProcessing}
        />
        <ConnectionLine
          from={nodePositions.aiConfig}
          to={nodePositions.results}
          status={getConnectionStatus('aiConfig', 'results')}
          animated={isProcessing}
        />

        {/* Start Node */}
        <FlowchartNode
          id="start"
          type="start"
          title="Source Input"
          subtitle={`${selectedSources.length} sources selected`}
          icon="📥"
          status={getNodeStatus('start')}
          position={nodePositions.start}
          onNodeMouseDown={handleNodeMouseDown}
        />

        {/* Rule Nodes */}
        <RuleNode
          id="titleRules"
          type="rule"
          ruleType="title"
          rules={workflowConfig.titleRules}
          logic={workflowConfig.titleLogic}
          status={getNodeStatus('titleRules')}
          position={nodePositions.titleRules}
          onRulesChange={updateTitleRules}
          onLogicChange={updateTitleLogic}
          isExpanded={false}
          onToggleExpand={() => showPopup('titleRules')}
          onNodeMouseDown={handleNodeMouseDown}
        />

        <RuleNode
          id="bodyRules"
          type="rule"
          ruleType="body"
          rules={workflowConfig.bodyRules}
          logic={workflowConfig.bodyLogic}
          status={getNodeStatus('bodyRules')}
          position={nodePositions.bodyRules}
          onRulesChange={updateBodyRules}
          onLogicChange={updateBodyLogic}
          isExpanded={false}
          onToggleExpand={() => showPopup('bodyRules')}
          onNodeMouseDown={handleNodeMouseDown}
        />

        <RuleNode
          id="urlRules"
          type="rule"
          ruleType="url"
          rules={workflowConfig.urlRules}
          logic={workflowConfig.urlLogic}
          status={getNodeStatus('urlRules')}
          position={nodePositions.urlRules}
          onRulesChange={updateUrlRules}
          onLogicChange={updateUrlLogic}
          isExpanded={false}
          onToggleExpand={() => showPopup('urlRules')}
          onNodeMouseDown={handleNodeMouseDown}
        />

        {/* Processing Node */}
        <FlowchartNode
          id="processing"
          type="process"
          title="Article Processing"
          subtitle="Filter & validate articles"
          icon="⚙️"
          status={getNodeStatus('processing')}
          progress={isProcessing ? progress.percentage : undefined}
          position={nodePositions.processing}
          onNodeMouseDown={handleNodeMouseDown}
        />

        {/* AI Configuration Node */}
        <FlowchartNode
          id="aiConfig"
          type="process"
          title="AI Processing"
          subtitle={`${workflowConfig.aiConfig.apiProvider} • ${workflowConfig.aiConfig.model}`}
          icon="🤖"
          status={getNodeStatus('aiConfig')}
          progress={isProcessing ? progress.percentage : undefined}
          position={nodePositions.aiConfig}
          onNodeClick={() => toggleNodeExpansion('aiConfig')}
          onNodeMouseDown={handleNodeMouseDown}
        >
          {expandedNodes.has('aiConfig') && (
            <div className={styles.aiConfigPanel}>
              <div className={styles.configSection}>
                <label>API Key</label>
                <input
                  type="password"
                  value={workflowConfig.aiConfig.apiKey}
                  onChange={(e) => setWorkflowConfig(prev => ({
                    ...prev,
                    aiConfig: { ...prev.aiConfig, apiKey: e.target.value }
                  }))}
                  className={styles.configInput}
                  placeholder="Enter API key..."
                />
              </div>
              <div className={styles.configSection}>
                <label>Max Articles</label>
                <input
                  type="number"
                  value={workflowConfig.filters.maxArticles}
                  onChange={(e) => setWorkflowConfig(prev => ({
                    ...prev,
                    filters: { ...prev.filters, maxArticles: parseInt(e.target.value) || 50 }
                  }))}
                  className={styles.configInput}
                  min="1"
                  max="1000"
                />
              </div>
            </div>
          )}
        </FlowchartNode>

        {/* Results Node */}
        <FlowchartNode
          id="results"
          type="end"
          title="Results"
          subtitle="Extracted data ready"
          icon="📊"
          status={getNodeStatus('results')}
          position={nodePositions.results}
          onNodeMouseDown={handleNodeMouseDown}
        />
        
        {/* Close Workflow Content */}
        </div>
      </div>

      {/* Control Panel */}
      <div className={styles.controlPanel}>
        <button
          onClick={handleStartProcessing}
          disabled={isProcessing || selectedSources.length === 0}
          className={styles.startButton}
        >
          {isProcessing ? (
            <>
              <span className={styles.spinner}></span>
              Processing...
            </>
          ) : (
            <>
              🚀 Start Processing
            </>
          )}
        </button>
        
        <div className={styles.sourcesSummary}>
          <span>{selectedSources.length} sources selected</span>
          <span>•</span>
          <span>{workflowConfig.titleRules.length + workflowConfig.bodyRules.length + workflowConfig.urlRules.length} rules configured</span>
        </div>
      </div>
      
      {/* Rule Editor Popups */}
      {activePopup === 'titleRules' && (
        <div className={styles.modalOverlay} onClick={closePopup}>
          <div className={styles.rulePopup} onClick={(e) => e.stopPropagation()}>
            <div className={styles.rulePopupHeader}>
              <h3>📝 Title Rules Configuration</h3>
              <button onClick={closePopup} className={styles.closeButton}>✕</button>
            </div>
            <div className={styles.rulePopupContent}>
              {/* Logic selector */}
              <div className={styles.logicSelector}>
                <label className={styles.logicLabel}>Rule Logic:</label>
                <div className={styles.logicButtons}>
                  <button
                    className={`${styles.logicButton} ${workflowConfig.titleLogic === 'AND' ? styles.active : ''}`}
                    onClick={() => updateTitleLogic('AND')}
                  >
                    AND
                  </button>
                  <button
                    className={`${styles.logicButton} ${workflowConfig.titleLogic === 'OR' ? styles.active : ''}`}
                    onClick={() => updateTitleLogic('OR')}
                  >
                    OR
                  </button>
                </div>
              </div>

              {/* Existing rules */}
              <div className={styles.existingRules}>
                {workflowConfig.titleRules.map((rule, index) => (
                  <div key={rule.id} className={styles.ruleItem}>
                    {index > 0 && (
                      <div className={styles.ruleConnector}>
                        {workflowConfig.titleLogic}
                      </div>
                    )}
                    <div className={styles.ruleContent}>
                      <div className={styles.ruleDisplay}>
                        <span className={styles.ruleTypeDisplay}>
                          {rule.type === 'contains' ? 'Contains' : 
                           rule.type === 'not_contains' ? 'Does not contain' :
                           rule.type === 'regex' ? 'Regex pattern' :
                           rule.type === 'starts_with' ? 'Starts with' :
                           rule.type === 'ends_with' ? 'Ends with' : rule.type}
                        </span>
                        <span className={styles.ruleValueDisplay}>
                          "{rule.value}"
                        </span>
                        {rule.caseSensitive && (
                          <span className={styles.caseSensitiveFlag}>Case sensitive</span>
                        )}
                        <div className={styles.ruleActions}>
                          <button
                            onClick={() => updateTitleRules(workflowConfig.titleRules.filter(r => r.id !== rule.id))}
                            className={styles.removeRuleButton}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activePopup === 'bodyRules' && (
        <div className={styles.modalOverlay} onClick={closePopup}>
          <div className={styles.rulePopup} onClick={(e) => e.stopPropagation()}>
            <div className={styles.rulePopupHeader}>
              <h3>📄 Body Content Rules Configuration</h3>
              <button onClick={closePopup} className={styles.closeButton}>✕</button>
            </div>
            <div className={styles.rulePopupContent}>
              {/* Logic selector */}
              <div className={styles.logicSelector}>
                <label className={styles.logicLabel}>Rule Logic:</label>
                <div className={styles.logicButtons}>
                  <button
                    className={`${styles.logicButton} ${workflowConfig.bodyLogic === 'AND' ? styles.active : ''}`}
                    onClick={() => updateBodyLogic('AND')}
                  >
                    AND
                  </button>
                  <button
                    className={`${styles.logicButton} ${workflowConfig.bodyLogic === 'OR' ? styles.active : ''}`}
                    onClick={() => updateBodyLogic('OR')}
                  >
                    OR
                  </button>
                </div>
              </div>

              {/* Existing rules */}
              <div className={styles.existingRules}>
                {workflowConfig.bodyRules.map((rule, index) => (
                  <div key={rule.id} className={styles.ruleItem}>
                    {index > 0 && (
                      <div className={styles.ruleConnector}>
                        {workflowConfig.bodyLogic}
                      </div>
                    )}
                    <div className={styles.ruleContent}>
                      <div className={styles.ruleDisplay}>
                        <span className={styles.ruleTypeDisplay}>
                          {rule.type === 'contains' ? 'Contains' : 
                           rule.type === 'not_contains' ? 'Does not contain' :
                           rule.type === 'regex' ? 'Regex pattern' :
                           rule.type === 'starts_with' ? 'Starts with' :
                           rule.type === 'ends_with' ? 'Ends with' : rule.type}
                        </span>
                        <span className={styles.ruleValueDisplay}>
                          "{rule.value}"
                        </span>
                        {rule.caseSensitive && (
                          <span className={styles.caseSensitiveFlag}>Case sensitive</span>
                        )}
                        <div className={styles.ruleActions}>
                          <button
                            onClick={() => updateBodyRules(workflowConfig.bodyRules.filter(r => r.id !== rule.id))}
                            className={styles.removeRuleButton}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activePopup === 'urlRules' && (
        <div className={styles.modalOverlay} onClick={closePopup}>
          <div className={styles.rulePopup} onClick={(e) => e.stopPropagation()}>
            <div className={styles.rulePopupHeader}>
              <h3>🔗 URL Pattern Rules Configuration</h3>
              <button onClick={closePopup} className={styles.closeButton}>✕</button>
            </div>
            <div className={styles.rulePopupContent}>
              {/* Logic selector */}
              <div className={styles.logicSelector}>
                <label className={styles.logicLabel}>Rule Logic:</label>
                <div className={styles.logicButtons}>
                  <button
                    className={`${styles.logicButton} ${workflowConfig.urlLogic === 'AND' ? styles.active : ''}`}
                    onClick={() => updateUrlLogic('AND')}
                  >
                    AND
                  </button>
                  <button
                    className={`${styles.logicButton} ${workflowConfig.urlLogic === 'OR' ? styles.active : ''}`}
                    onClick={() => updateUrlLogic('OR')}
                  >
                    OR
                  </button>
                </div>
              </div>

              {/* Existing rules */}
              <div className={styles.existingRules}>
                {workflowConfig.urlRules.map((rule, index) => (
                  <div key={rule.id} className={styles.ruleItem}>
                    {index > 0 && (
                      <div className={styles.ruleConnector}>
                        {workflowConfig.urlLogic}
                      </div>
                    )}
                    <div className={styles.ruleContent}>
                      <div className={styles.ruleDisplay}>
                        <span className={styles.ruleTypeDisplay}>
                          {rule.type === 'contains' ? 'Contains' : 
                           rule.type === 'not_contains' ? 'Does not contain' :
                           rule.type === 'regex' ? 'Regex pattern' :
                           rule.type === 'starts_with' ? 'Starts with' :
                           rule.type === 'ends_with' ? 'Ends with' : rule.type}
                        </span>
                        <span className={styles.ruleValueDisplay}>
                          "{rule.value}"
                        </span>
                        {rule.caseSensitive && (
                          <span className={styles.caseSensitiveFlag}>Case sensitive</span>
                        )}
                        <div className={styles.ruleActions}>
                          <button
                            onClick={() => updateUrlRules(workflowConfig.urlRules.filter(r => r.id !== rule.id))}
                            className={styles.removeRuleButton}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Save Template Dialog */}
      {showSaveDialog && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Save Workflow Template</h3>
            
            <div className={styles.modalContent}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Template Name</label>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="Enter template name..."
                  className={styles.modalInput}
                />
              </div>
              
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Description (Optional)</label>
                <textarea
                  value={newTemplateDescription}
                  onChange={(e) => setNewTemplateDescription(e.target.value)}
                  placeholder="Describe what this template is for..."
                  className={styles.modalTextarea}
                  rows={3}
                />
              </div>
              
              <div className={styles.inputGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={newTemplateIsPublic}
                    onChange={(e) => setNewTemplateIsPublic(e.target.checked)}
                  />
                  Make this template public (other users can use it)
                </label>
              </div>
            </div>
            
            <div className={styles.modalActions}>
              <button
                onClick={() => setShowSaveDialog(false)}
                className={styles.modalCancelButton}
                disabled={isSavingTemplate}
              >
                Cancel
              </button>
              <button
                onClick={saveTemplate}
                className={styles.modalSaveButton}
                disabled={isSavingTemplate || !newTemplateName.trim()}
              >
                {isSavingTemplate ? (
                  <>
                    <span className={styles.spinner}></span>
                    Saving...
                  </>
                ) : (
                  'Save Template'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}