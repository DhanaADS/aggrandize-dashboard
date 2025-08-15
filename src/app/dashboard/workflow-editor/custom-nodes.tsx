'use client';

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import styles from './workflow-editor.module.css';
import { InputHandles, OutputHandles } from './node-handles';

// Base node interface
interface BaseNodeData {
  label: string;
  icon: string;
  nodeType: string;
  category: string;
  description?: string;
}

// Custom Node Component
export function CustomNode({ data, selected }: NodeProps<BaseNodeData>) {
  return (
    <div className={`${styles.customNode} ${selected ? styles.selected : ''} ${styles[data.category]}`}>
      <InputHandles />
      <OutputHandles />
      
      <div className={styles.nodeHeader}>
        <div className={styles.nodeIcon}>
          {data.icon}
        </div>
        <div className={styles.nodeInfo}>
          <div className={styles.nodeTitle}>{data.label}</div>
          <div className={styles.nodeSubtitle}>{data.nodeType}</div>
        </div>
      </div>
    </div>
  );
}

// Trigger Node (start nodes)
export function TriggerNode({ data, selected }: NodeProps<BaseNodeData>) {
  return (
    <>
      <div className={`${styles.triggerNode} ${selected ? styles.selected : ''}`}>
        {/* ⚡ Lightning Bolt Trigger Indicator - Top Left */}
        <div style={{
          position: 'absolute',
          top: -8,
          left: -8,
          width: '20px',
          height: '20px',
          background: '#ff6b35',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          zIndex: 10
        }}>
          ⚡
        </div>

        {/* 🔗 Output Connection Handle */}
        <Handle 
          type="source" 
          position={Position.Right} 
          className={styles.handle} 
          id="output-right"
          isConnectable={true}
          style={{ 
            right: -7, 
            top: '50%', 
            transform: 'translateY(-50%)',
            background: '#9ca3af',
            border: '2px solid #1a1a1a',
            width: '14px',
            height: '14px'
          }}
        />
        
        {/* 📱 Main Node Content */}
        <div className={styles.nodeHeader}>
          <div className={styles.nodeIcon}>
            {data.icon}
          </div>
        </div>

        {/* ✅ Success Status Indicator - Bottom Right */}
        <div style={{
          position: 'absolute',
          bottom: -8,
          right: -8,
          width: '20px',
          height: '20px',
          background: '#10b981',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          color: '#ffffff',
          zIndex: 10
        }}>
          ✓
        </div>

        {/* Connection Line & Data Flow when selected */}
        {selected && (
          <>
            {/* Connection line */}
            <div style={{
              position: 'absolute',
              right: -50,
              top: '50%',
              width: '40px',
              height: '4px',
              background: '#10b981',
              transform: 'translateY(-50%)',
              borderRadius: '2px'
            }} />
            
            {/* 1 item data indicator */}
            <div style={{
              position: 'absolute',
              right: -45,
              top: '30%',
              background: 'rgba(42, 46, 59, 0.9)',
              color: '#ffffff',
              padding: '2px 6px',
              borderRadius: '3px',
              fontSize: '10px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none'
            }}>
              1 item
            </div>

            {/* ➕ Add Node Button */}
            <div style={{
              position: 'absolute',
              right: -65,
              top: '50%',
              transform: 'translateY(-50%)',
              width: '24px',
              height: '24px',
              background: '#6b7280',
              border: '2px solid #1a1a1a',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '14px',
              cursor: 'pointer',
              zIndex: 10
            }}>
              +
            </div>
          </>
        )}
      </div>

      {/* 📝 Node Description - Below the node */}
      <div style={{
        position: 'absolute',
        top: '120px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#ffffff',
        fontSize: '14px',
        fontWeight: '500',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        pointerEvents: 'none'
      }}>
        When chat message<br />received
      </div>
    </>
  );
}

// Process Node (middle nodes with input/output)
export function ProcessNode({ data, selected }: NodeProps<BaseNodeData>) {
  return (
    <div className={`${styles.processNode} ${selected ? styles.selected : ''}`}>
      <InputHandles />
      <OutputHandles />
      
      <div className={styles.nodeHeader}>
        <div className={styles.nodeIcon}>
          {data.icon}
        </div>
        <div className={styles.nodeInfo}>
          <div className={styles.nodeTitle}>{data.label}</div>
          <div className={styles.nodeSubtitle}>{data.category}</div>
        </div>
      </div>
    </div>
  );
}

// Output Node (end nodes)
export function OutputNode({ data, selected }: NodeProps<BaseNodeData>) {
  return (
    <div className={`${styles.outputNode} ${selected ? styles.selected : ''}`}>
      <InputHandles />
      
      <div className={styles.nodeHeader}>
        <div className={styles.nodeIcon}>
          {data.icon}
        </div>
        <div className={styles.nodeInfo}>
          <div className={styles.nodeTitle}>{data.label}</div>
          <div className={styles.nodeSubtitle}>Output</div>
        </div>
      </div>
    </div>
  );
}

// AI Node (special styling)
export function AINode({ data, selected }: NodeProps<BaseNodeData>) {
  return (
    <div className={`${styles.aiNode} ${selected ? styles.selected : ''}`}>
      <InputHandles />
      <OutputHandles />
      
      <div className={styles.nodeHeader}>
        <div className={styles.nodeIcon}>
          {data.icon}
        </div>
        <div className={styles.nodeInfo}>
          <div className={styles.nodeTitle}>{data.label}</div>
          <div className={styles.nodeSubtitle}>{data.nodeType}</div>
        </div>
      </div>
    </div>
  );
}

// Input Node (data sources)
export function InputNode({ data, selected }: NodeProps<BaseNodeData>) {
  return (
    <div className={`${styles.inputNode} ${selected ? styles.selected : ''}`}>
      <InputHandles />
      <OutputHandles />
      
      <div className={styles.nodeHeader}>
        <div className={styles.nodeIcon}>
          {data.icon}
        </div>
        <div className={styles.nodeInfo}>
          <div className={styles.nodeTitle}>{data.label}</div>
          <div className={styles.nodeSubtitle}>{data.nodeType}</div>
        </div>
      </div>
    </div>
  );
}

// Conditional/Logic Node (diamond shape)
export function ConditionalNode({ data, selected }: NodeProps<BaseNodeData>) {
  return (
    <div className={`${styles.conditionalNode} ${selected ? styles.selected : ''}`}>
      <InputHandles />
      <OutputHandles />
      
      <div className={styles.nodeHeader}>
        <div className={styles.nodeIcon}>
          {data.icon}
        </div>
        <div className={styles.nodeInfo}>
          <div className={styles.nodeTitle}>{data.label}</div>
          <div className={styles.nodeSubtitle}>Logic</div>
        </div>
      </div>
    </div>
  );
}

// Node type mapping
export const nodeTypes = {
  trigger: TriggerNode,
  process: ProcessNode,
  output: OutputNode,
  ai: AINode,
  input: InputNode,
  conditional: ConditionalNode,
  custom: CustomNode,
};