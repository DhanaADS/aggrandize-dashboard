'use client';

import React from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer, BaseEdge } from 'reactflow';

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      {/* Bold dot at start of connection */}
      <circle
        cx={sourceX}
        cy={sourceY}
        r="6"
        fill="#ffffff"
        stroke="#9ca3af"
        strokeWidth="3"
      />
      {/* Arrow at end of connection */}
      <polygon
        points={`${targetX-8},${targetY-4} ${targetX},${targetY} ${targetX-8},${targetY+4}`}
        fill="#9ca3af"
        stroke="#1a1a1a"
        strokeWidth="1"
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${sourceX}px,${sourceY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const edgeTypes = {
  custom: CustomEdge,
};