'use client';

import { useState, useEffect } from 'react';
import { FinancialOverview } from '@/types/finance';
import styles from '../../payments.module.css';

interface BalanceVisualizationProps {
  overview: FinancialOverview;
}

interface BalanceNode {
  id: string;
  person: string;
  net_balance: number;
  owes: number;
  owed: number;
  position: { x: number; y: number };
  type: 'creditor' | 'debtor' | 'balanced';
}

interface FlowConnection {
  from: string;
  to: string;
  amount: number;
  animated: boolean;
}

export function BalanceVisualization({ overview }: BalanceVisualizationProps) {
  const [activeConnections, setActiveConnections] = useState<string[]>([]);
  const [animationCycle, setAnimationCycle] = useState(0);

  const formatCurrency = (amount: number) => {
    return `₹${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  // Create balance nodes from settlement data
  const balanceNodes: BalanceNode[] = overview.settlements.by_person.map((person, index) => {
    const angle = (index / overview.settlements.by_person.length) * 2 * Math.PI;
    const radius = 35; // Percentage from center
    const centerX = 50;
    const centerY = 50;
    
    return {
      id: person.person,
      person: person.person,
      net_balance: person.net_balance,
      owes: person.owes,
      owed: person.owed,
      position: {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      },
      type: person.net_balance > 0 ? 'creditor' : person.net_balance < 0 ? 'debtor' : 'balanced'
    };
  });

  // Generate flow connections between debtors and creditors
  const generateFlowConnections = (): FlowConnection[] => {
    const connections: FlowConnection[] = [];
    const creditors = balanceNodes.filter(node => node.type === 'creditor');
    const debtors = balanceNodes.filter(node => node.type === 'debtor');

    debtors.forEach(debtor => {
      creditors.forEach(creditor => {
        // Simplified flow calculation
        const flowAmount = Math.min(Math.abs(debtor.net_balance), creditor.net_balance) * 0.3;
        if (flowAmount > 0) {
          connections.push({
            from: debtor.id,
            to: creditor.id,
            amount: flowAmount,
            animated: Math.random() > 0.5
          });
        }
      });
    });

    return connections;
  };

  const flowConnections = generateFlowConnections();

  // Animation cycle for connections
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationCycle(prev => (prev + 1) % 3);
      
      // Randomly activate connections
      const randomConnections = flowConnections
        .filter(() => Math.random() > 0.7)
        .map(conn => `${conn.from}-${conn.to}`);
      
      setActiveConnections(randomConnections);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'creditor': return '#00ff88';
      case 'debtor': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getNodeFromPosition = (nodeId: string) => {
    const node = balanceNodes.find(n => n.id === nodeId);
    return node ? node.position : { x: 50, y: 50 };
  };

  return (
    <div className={styles.balanceVisualization}>
      <div className={styles.balanceHeader}>
        <h3 className={styles.balanceTitle}>
          <span className={styles.balanceIcon}>⚖️</span>
          Team Balance Network
        </h3>
        <div className={styles.balanceLegend}>
          <div className={styles.legendItem}>
            <div className={styles.legendDot} style={{ backgroundColor: '#00ff88' }} />
            <span>Creditor</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendDot} style={{ backgroundColor: '#ef4444' }} />
            <span>Debtor</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendDot} style={{ backgroundColor: '#64748b' }} />
            <span>Balanced</span>
          </div>
        </div>
      </div>

      <div className={styles.networkContainer}>
        {/* SVG for connection flows */}
        <svg className={styles.networkSvg} viewBox="0 0 1000 1000">
          <defs>
            {/* Animated gradient for flow lines */}
            <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00ff88" stopOpacity="0.1">
                <animate attributeName="stop-opacity" 
                  values="0.1;0.8;0.1" dur="2s" repeatCount="indefinite" />
              </stop>
              <stop offset="50%" stopColor="#00ff88" stopOpacity="0.8">
                <animate attributeName="stop-opacity" 
                  values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
              </stop>
              <stop offset="100%" stopColor="#00ff88" stopOpacity="0.1">
                <animate attributeName="stop-opacity" 
                  values="0.1;0.8;0.1" dur="2s" repeatCount="indefinite" />
              </stop>
            </linearGradient>

            {/* Glow filter */}
            <filter id="networkGlow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            {/* Arrow marker */}
            <marker id="arrowhead" markerWidth="10" markerHeight="7" 
              refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#00ff88" />
            </marker>
          </defs>

          {/* Center node */}
          <circle
            cx="500"
            cy="500"
            r="40"
            fill="none"
            stroke="#00ff88"
            strokeWidth="2"
            strokeDasharray="5,5"
            filter="url(#networkGlow)"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0 500 500;360 500 500"
              dur="20s"
              repeatCount="indefinite"
            />
          </circle>

          {/* Flow connections */}
          {flowConnections.map((connection, index) => {
            const fromPos = getNodeFromPosition(connection.from);
            const toPos = getNodeFromPosition(connection.to);
            const isActive = activeConnections.includes(`${connection.from}-${connection.to}`);
            
            return (
              <g key={`${connection.from}-${connection.to}`}>
                <path
                  d={`M ${fromPos.x * 10} ${fromPos.y * 10} Q 500 500 ${toPos.x * 10} ${toPos.y * 10}`}
                  stroke={isActive ? "url(#flowGradient)" : "#00ff8830"}
                  strokeWidth={isActive ? "3" : "1"}
                  fill="none"
                  filter={isActive ? "url(#networkGlow)" : "none"}
                  markerEnd={isActive ? "url(#arrowhead)" : "none"}
                  className={isActive ? styles.activeFlow : styles.dormantFlow}
                />
                
                {/* Flow amount label */}
                {isActive && (
                  <text
                    x={(fromPos.x * 10 + toPos.x * 10) / 2}
                    y={(fromPos.y * 10 + toPos.y * 10) / 2}
                    fill="#00ff88"
                    fontSize="20"
                    textAnchor="middle"
                    className={styles.flowLabel}
                  >
                    {formatCurrency(connection.amount)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Balance nodes */}
        {balanceNodes.map((node) => (
          <div
            key={node.id}
            className={styles.balanceNode}
            style={{
              left: `${node.position.x}%`,
              top: `${node.position.y}%`,
              borderColor: getNodeColor(node.type),
              boxShadow: `0 0 25px ${getNodeColor(node.type)}40`
            }}
          >
            <div className={styles.nodeAvatar}>
              {node.person.charAt(0).toUpperCase()}
            </div>
            
            <div className={styles.nodeInfo}>
              <div className={styles.nodeName}>{node.person}</div>
              <div 
                className={styles.nodeBalance}
                style={{ color: getNodeColor(node.type) }}
              >
                {formatCurrency(node.net_balance)}
              </div>
            </div>

            {/* Node status indicator */}
            <div 
              className={styles.nodeStatus}
              style={{ backgroundColor: getNodeColor(node.type) }}
            >
              {node.type === 'creditor' ? '💰' : node.type === 'debtor' ? '💸' : '⚖️'}
            </div>

            {/* Pulse animation for active nodes */}
            {Math.abs(node.net_balance) > 0 && (
              <div 
                className={styles.nodePulse}
                style={{ 
                  borderColor: getNodeColor(node.type),
                  animationDelay: `${Math.random() * 2}s`
                }}
              />
            )}

            {/* Node details on hover */}
            <div className={styles.nodeTooltip}>
              <div>Owes: {formatCurrency(node.owes)}</div>
              <div>Owed: {formatCurrency(node.owed)}</div>
              <div>Net: {formatCurrency(node.net_balance)}</div>
            </div>
          </div>
        ))}

        {/* Center summary */}
        <div className={styles.centerSummary}>
          <div className={styles.summaryIcon}>🌐</div>
          <div className={styles.summaryText}>
            <div className={styles.summaryTitle}>Settlement Network</div>
            <div className={styles.summaryValue}>
              {formatCurrency(overview.settlements.total_pending)}
            </div>
            <div className={styles.summaryLabel}>Total Pending</div>
          </div>
        </div>

        {/* Background particles */}
        <div className={styles.networkParticles}>
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className={styles.networkParticle}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${5 + Math.random() * 3}s`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}