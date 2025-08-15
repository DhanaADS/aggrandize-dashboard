'use client';

import styles from './workflow.module.css';

export interface ConnectionLineProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  status?: 'idle' | 'active' | 'completed' | 'error';
  label?: string;
  animated?: boolean;
}

export default function ConnectionLine({
  from,
  to,
  status = 'idle',
  label,
  animated = false
}: ConnectionLineProps) {
  const getStatusClass = () => {
    switch (status) {
      case 'active': return styles.connectionActive;
      case 'completed': return styles.connectionCompleted;
      case 'error': return styles.connectionError;
      default: return '';
    }
  };

  // Calculate the path for the connection line
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  
  // Create a curved path for better visual flow
  const midX = from.x + dx / 2;
  const midY = from.y + dy / 2;
  
  // Control points for bezier curve
  const cpX1 = from.x + Math.min(dx * 0.5, 100);
  const cpY1 = from.y;
  const cpX2 = to.x - Math.min(dx * 0.5, 100);
  const cpY2 = to.y;

  const pathData = `M ${from.x} ${from.y} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${to.x} ${to.y}`;

  // Calculate arrow position and angle
  const arrowX = to.x - 20;
  const arrowY = to.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  return (
    <div className={styles.connectionContainer}>
      <svg
        className={styles.connectionSvg}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1
        }}
      >
        {/* Connection path */}
        <path
          d={pathData}
          className={`${styles.connectionPath} ${getStatusClass()} ${animated ? styles.animated : ''}`}
          fill="none"
          markerEnd="url(#arrowhead)"
        />

        {/* Arrow marker definition */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
            className={styles.arrowMarker}
          >
            <polygon points="0 0, 10 3.5, 0 7" className={getStatusClass()} />
          </marker>
        </defs>

        {/* Animated flow dots for active connections */}
        {animated && status === 'active' && (
          <>
            <circle className={styles.flowDot} r="3">
              <animateMotion dur="2s" repeatCount="indefinite" path={pathData} />
            </circle>
            <circle className={styles.flowDot} r="2">
              <animateMotion dur="2s" repeatCount="indefinite" path={pathData} begin="0.5s" />
            </circle>
          </>
        )}

        {/* Label */}
        {label && (
          <text
            x={midX}
            y={midY - 10}
            className={styles.connectionLabel}
            textAnchor="middle"
          >
            {label}
          </text>
        )}
      </svg>
    </div>
  );
}