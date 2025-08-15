import React from 'react';
import { Handle, Position } from 'reactflow';
import styles from './workflow-editor.module.css';

// Common handle styles
const handleStyles = {
  top: { top: -7, left: '50%', transform: 'translateX(-50%)' },
  left: { left: -7, top: '50%', transform: 'translateY(-50%)' },
  bottom: { bottom: -7, left: '50%', transform: 'translateX(-50%)' },
  right: { right: -7, top: '50%', transform: 'translateY(-50%)' },
};

// Circular handle styles for trigger nodes
const circularHandleStyles = {
  top: { top: -7, left: '50%', transform: 'translateX(-50%)' },
  left: { left: -7, top: '50%', transform: 'translateY(-50%)' },
  bottom: { bottom: -7, left: '50%', transform: 'translateX(-50%)' },
  right: { right: -7, top: '50%', transform: 'translateY(-50%)' },
};

// Input handles (for receiving connections)
export function InputHandles() {
  return (
    <>
      <Handle 
        type="target" 
        position={Position.Top} 
        className={styles.handle} 
        id="input-top"
        isConnectable={true}
        style={handleStyles.top}
      />
      <Handle 
        type="target" 
        position={Position.Left} 
        className={styles.handle} 
        id="input-left"
        isConnectable={true}
        style={handleStyles.left}
      />
      <Handle 
        type="target" 
        position={Position.Bottom} 
        className={styles.handle} 
        id="input-bottom"
        isConnectable={true}
        style={handleStyles.bottom}
      />
      <Handle 
        type="target" 
        position={Position.Right} 
        className={styles.handle} 
        id="input-right"
        isConnectable={true}
        style={handleStyles.right}
      />
    </>
  );
}

// Output handles (for creating connections)
export function OutputHandles() {
  return (
    <>
      <Handle 
        type="source" 
        position={Position.Top} 
        className={styles.handle} 
        id="output-top"
        isConnectable={true}
        style={handleStyles.top}
      />
      <Handle 
        type="source" 
        position={Position.Left} 
        className={styles.handle} 
        id="output-left"
        isConnectable={true}
        style={handleStyles.left}
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className={styles.handle} 
        id="output-bottom"
        isConnectable={true}
        style={handleStyles.bottom}
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className={styles.handle} 
        id="output-right"
        isConnectable={true}
        style={handleStyles.right}
      />
    </>
  );
}