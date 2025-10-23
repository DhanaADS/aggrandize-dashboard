'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Panel,
  ReactFlowProvider,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import styles from './workflow-editor.module.css';
import { nodeTypes } from './custom-nodes';
import { configForms } from './node-config-forms';
import { edgeTypes } from './custom-edge';

// Custom node types
const initialNodes: Node[] = [
  {
    id: 'start-1',
    type: 'trigger',
    position: { x: 400, y: 300 },
    data: { 
      label: 'Manual Trigger',
      icon: '🚀',
      nodeType: 'manual',
      category: 'triggers'
    },
  },
];

const initialEdges: Edge[] = [];

// Node categories for the palette
const nodeCategories = {
  triggers: [
    { id: 'schedule', label: 'Schedule', icon: '⏰', description: 'Trigger workflow on schedule' },
    { id: 'webhook', label: 'Webhook', icon: '🔗', description: 'Trigger via HTTP webhook' },
    { id: 'manual', label: 'Manual', icon: '👆', description: 'Manual trigger' },
  ],
  inputs: [
    { id: 'http-request', label: 'HTTP Request', icon: '🌐', description: 'Make HTTP requests' },
    { id: 'web-scraper', label: 'Web Scraper', icon: '🕷️', description: 'Scrape websites' },
    { id: 'database-read', label: 'Database', icon: '🗄️', description: 'Read from database' },
    { id: 'file-read', label: 'File Reader', icon: '📁', description: 'Read files' },
  ],
  process: [
    { id: 'data-filter', label: 'Filter', icon: '🔍', description: 'Filter data' },
    { id: 'data-transform', label: 'Transform', icon: '⚙️', description: 'Transform data' },
    { id: 'code-execute', label: 'Code', icon: '💻', description: 'Execute code' },
    { id: 'set-data', label: 'Set', icon: '📝', description: 'Set data values' },
  ],
  conditional: [
    { id: 'if-condition', label: 'IF', icon: '🔀', description: 'Conditional logic' },
    { id: 'switch-case', label: 'Switch', icon: '🔄', description: 'Multiple conditions' },
    { id: 'merge-data', label: 'Merge', icon: '🔗', description: 'Merge data streams' },
  ],
  ai: [
    { id: 'ai-process', label: 'AI Process', icon: '🤖', description: 'AI processing' },
    { id: 'ai-chat', label: 'AI Chat', icon: '💬', description: 'AI conversation' },
  ],
  outputs: [
    { id: 'email-send', label: 'Email', icon: '📧', description: 'Send emails' },
    { id: 'whatsapp-send', label: 'WhatsApp', icon: '📱', description: 'Send WhatsApp messages' },
    { id: 'telegram-send', label: 'Telegram', icon: '💬', description: 'Send Telegram messages' },
    { id: 'database-write', label: 'Database', icon: '💾', description: 'Write to database' },
  ],
  integrations: [
    { id: 'google-sheets', label: 'Google Sheets', icon: '📊', description: 'Google Sheets integration' },
    { id: 'slack', label: 'Slack', icon: '💬', description: 'Slack integration' },
    { id: 'wordpress', label: 'WordPress', icon: '📝', description: 'WordPress integration' },
  ],
};

function WorkflowEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [draggedNodeType, setDraggedNodeType] = useState<string | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [nodeConfigs, setNodeConfigs] = useState<Record<string, any>>({});

  // Hide body overflow when component mounts
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Drag and drop handlers
  const onDragStart = (event: React.DragEvent, nodeType: string, category: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/category', category);
    event.dataTransfer.effectAllowed = 'move';
    setDraggedNodeType(nodeType);
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData('application/reactflow');
      const category = event.dataTransfer.getData('application/category');

      if (typeof nodeType === 'undefined' || !nodeType || !reactFlowInstance) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const nodeData = nodeCategories[category as keyof typeof nodeCategories]?.find(n => n.id === nodeType);
      
      // Determine node type based on category and specific node types
      let reactFlowNodeType = 'process';
      if (category === 'triggers') reactFlowNodeType = 'trigger';
      else if (category === 'outputs') reactFlowNodeType = 'output';
      else if (category === 'inputs') reactFlowNodeType = 'input';
      else if (category === 'conditional') reactFlowNodeType = 'conditional';
      else if (category === 'ai') reactFlowNodeType = 'ai';

      const newNode: Node = {
        id: `${nodeType}-${Date.now()}`,
        type: reactFlowNodeType,
        position,
        data: {
          label: nodeData?.label || nodeType,
          icon: nodeData?.icon || '⚙️',
          nodeType,
          category,
          description: nodeData?.description
        },
      };

      setNodes((nds) => nds.concat(newNode));
      setDraggedNodeType(null);
    },
    [reactFlowInstance, setNodes]
  );

  // Add node to canvas (for click)
  const addNodeToCanvas = useCallback((nodeType: string, category: string) => {
    const nodeData = nodeCategories[category as keyof typeof nodeCategories]?.find(n => n.id === nodeType);
    
    // Determine node type based on category and specific node types
    let reactFlowNodeType = 'process';
    if (category === 'triggers') reactFlowNodeType = 'trigger';
    else if (category === 'outputs') reactFlowNodeType = 'output';
    else if (category === 'inputs') reactFlowNodeType = 'input';
    else if (category === 'conditional') reactFlowNodeType = 'conditional';
    else if (category === 'ai') reactFlowNodeType = 'ai';

    const newNode: Node = {
      id: `${nodeType}-${Date.now()}`,
      type: reactFlowNodeType,
      position: { 
        x: Math.random() * 400 + 200, 
        y: Math.random() * 400 + 200 
      },
      data: { 
        label: nodeData?.label || nodeType,
        icon: nodeData?.icon || '⚙️',
        nodeType,
        category,
        description: nodeData?.description
      },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [setNodes]);

  // Update node configuration
  const updateNodeConfig = useCallback((nodeId: string, config: any) => {
    setNodeConfigs(prev => ({
      ...prev,
      [nodeId]: { ...prev[nodeId], ...config }
    }));
  }, []);

  // Update node label
  const updateNodeLabel = useCallback((nodeId: string, label: string) => {
    setNodes(nds => nds.map(node => 
      node.id === nodeId 
        ? { ...node, data: { ...node.data, label } }
        : node
    ));
  }, [setNodes]);

  const executeWorkflow = useCallback(async () => {
    setIsExecuting(true);
    // Simulate workflow execution
    setTimeout(() => {
      setIsExecuting(false);
    }, 3000);
  }, []);

  return (
    <div className={`${styles.workflowEditor} dashboard-page-content`}>
      {/* Left Panel - Node Palette */}
      <div className={styles.leftPanel}>
        <div className={styles.panelHeader}>
          <h3>Nodes</h3>
        </div>
        <div className={styles.nodeCategories}>
          {Object.entries(nodeCategories).map(([category, nodes]) => (
            <div key={category} className={styles.nodeCategory}>
              <div className={styles.categoryHeader}>
                <span className={styles.categoryIcon}>
                  {category === 'triggers' ? '🔵' : 
                   category === 'inputs' ? '🟢' :
                   category === 'process' ? '⬜' :
                   category === 'conditional' ? '🔶' :
                   category === 'ai' ? '🟣' :
                   category === 'outputs' ? '🟠' : 
                   category === 'integrations' ? '🔗' : '⚙️'}
                </span>
                <span className={styles.categoryTitle}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </span>
              </div>
              <div className={styles.nodeList}>
                {nodes.map((node) => (
                  <div 
                    key={node.id}
                    className={styles.nodeItem}
                    draggable
                    onDragStart={(event) => onDragStart(event, node.id, category)}
                    onClick={() => addNodeToCanvas(node.id, category)}
                    title={node.description}
                  >
                    <span className={styles.nodeIcon}>{node.icon}</span>
                    <span className={styles.nodeLabel}>{node.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Canvas */}
      <div className={styles.mainCanvas} ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{
            type: 'custom',
            style: {
              strokeWidth: 6,
              stroke: '#9ca3af',
              strokeLinecap: 'round',
            },
          }}
          fitView
          className={styles.reactFlow}
        >
          <Controls className={styles.controls} />
          <MiniMap 
            className={styles.minimap}
            zoomable
            pannable
          />
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={20} 
            size={1.5}
            color="#404040"
            className={styles.background}
          />
          <Panel position="top-center" className={styles.topPanel}>
            <div className={styles.workflowControls}>
              <button 
                className={`${styles.executeButton} ${isExecuting ? styles.executing : ''}`}
                onClick={executeWorkflow}
                disabled={isExecuting}
              >
                {isExecuting ? '⏳ Executing...' : '▶️ Execute'}
              </button>
              <button className={styles.saveButton}>
                💾 Save
              </button>
              <button className={styles.testButton}>
                🧪 Test
              </button>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Right Panel - Node Configuration */}
      <div className={styles.rightPanel}>
        <div className={styles.panelHeader}>
          <h3>Configuration</h3>
        </div>
        <div className={styles.configContent}>
          {selectedNode ? (
            <div className={styles.nodeConfig}>
              <div className={styles.nodeInfo}>
                <div className={styles.nodeIcon}>
                  {selectedNode.data?.icon || '⚙️'}
                </div>
                <div className={styles.nodeDetails}>
                  <h4>{selectedNode.data?.label}</h4>
                  <span className={styles.nodeType}>
                    {selectedNode.data?.category} • {selectedNode.data?.nodeType}
                  </span>
                </div>
              </div>
              
              <div className={styles.nodeSettings}>
                <div className={styles.settingGroup}>
                  <label>Node Name</label>
                  <input 
                    type="text" 
                    value={selectedNode.data?.label || ''} 
                    placeholder="Enter node name"
                    onChange={(e) => updateNodeLabel(selectedNode.id, e.target.value)}
                    className={styles.input}
                  />
                </div>
                
                <div className={styles.settingGroup}>
                  <label>Description</label>
                  <textarea 
                    placeholder="Enter node description"
                    value={nodeConfigs[selectedNode.id]?.description || ''}
                    onChange={(e) => updateNodeConfig(selectedNode.id, { description: e.target.value })}
                    className={styles.textarea}
                  />
                </div>

                {/* Dynamic settings based on node type */}
                {(() => {
                  const ConfigComponent = configForms[selectedNode.data?.nodeType as keyof typeof configForms];
                  if (ConfigComponent) {
                    return (
                      <ConfigComponent
                        nodeType={selectedNode.data?.nodeType}
                        nodeData={nodeConfigs[selectedNode.id] || {}}
                        onUpdate={(data) => updateNodeConfig(selectedNode.id, data)}
                      />
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          ) : (
            <div className={styles.noSelection}>
              <div className={styles.noSelectionIcon}>🎯</div>
              <h4>No node selected</h4>
              <p>Click on a node to configure its settings</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Panel - Execution Status */}
      <div className={styles.bottomPanel}>
        <div className={styles.executionBar}>
          <div className={styles.executionStatus}>
            <span className={styles.statusIndicator}>
              {isExecuting ? '🔄' : '✅'}
            </span>
            <span className={styles.statusText}>
              {isExecuting ? 'Workflow executing...' : 'Ready to execute'}
            </span>
          </div>
          
          <div className={styles.executionStats}>
            <span>Nodes: {nodes.length}</span>
            <span>Connections: {edges.length}</span>
            <span>Last run: Never</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WorkflowEditorPage() {
  return (
    <ReactFlowProvider>
      <WorkflowEditor />
    </ReactFlowProvider>
  );
}