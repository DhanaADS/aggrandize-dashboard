'use client';

import { useState, useEffect } from 'react';

interface ABTest {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'completed';
  variants: ABVariant[];
  targetMetric: string;
  startDate: string;
  endDate?: string;
  trafficAllocation: number; // Percentage of users to include
}

interface ABVariant {
  id: string;
  name: string;
  weight: number; // Percentage of test traffic
  config: Record<string, any>;
  metrics: {
    impressions: number;
    conversions: number;
    conversionRate: number;
  };
}

interface UserAssignment {
  testId: string;
  variantId: string;
  assignedAt: string;
}

interface ABTestingProps {
  userEmail?: string;
}

const ACTIVE_TESTS: ABTest[] = [
  {
    id: 'install-prompt-timing',
    name: 'Install Prompt Timing',
    description: 'Test different timings for showing the install prompt',
    status: 'active',
    targetMetric: 'install_rate',
    startDate: new Date().toISOString(),
    trafficAllocation: 80, // 80% of users
    variants: [
      {
        id: 'immediate',
        name: 'Immediate (5s)',
        weight: 25,
        config: { delayMs: 5000 },
        metrics: { impressions: 0, conversions: 0, conversionRate: 0 }
      },
      {
        id: 'short-delay',
        name: 'Short Delay (30s)',
        weight: 25,
        config: { delayMs: 30000 },
        metrics: { impressions: 0, conversions: 0, conversionRate: 0 }
      },
      {
        id: 'medium-delay',
        name: 'Medium Delay (2m)',
        weight: 25,
        config: { delayMs: 120000 },
        metrics: { impressions: 0, conversions: 0, conversionRate: 0 }
      },
      {
        id: 'long-delay',
        name: 'Long Delay (5m)',
        weight: 25,
        config: { delayMs: 300000 },
        metrics: { impressions: 0, conversions: 0, conversionRate: 0 }
      }
    ]
  },
  {
    id: 'notification-copy',
    name: 'Notification Copy Test',
    description: 'Test different messaging for notifications',
    status: 'active',
    targetMetric: 'permission_grant_rate',
    startDate: new Date().toISOString(),
    trafficAllocation: 70,
    variants: [
      {
        id: 'benefits-focused',
        name: 'Benefits Focused',
        weight: 33,
        config: {
          title: 'Stay Updated with Team Hub',
          message: 'Get real-time notifications for task updates, comments, and team activities.'
        },
        metrics: { impressions: 0, conversions: 0, conversionRate: 0 }
      },
      {
        id: 'urgency-focused',
        name: 'Urgency Focused',
        weight: 33,
        config: {
          title: 'Don\'t Miss Important Updates!',
          message: 'Enable notifications to stay on top of urgent tasks and team messages.'
        },
        metrics: { impressions: 0, conversions: 0, conversionRate: 0 }
      },
      {
        id: 'simple-direct',
        name: 'Simple & Direct',
        weight: 34,
        config: {
          title: 'Enable Notifications?',
          message: 'Get notified about new tasks, comments, and updates.'
        },
        metrics: { impressions: 0, conversions: 0, conversionRate: 0 }
      }
    ]
  },
];

export default function ABTestingSystem({ userEmail }: ABTestingProps) {
  const [userAssignments, setUserAssignments] = useState<UserAssignment[]>([]);
  const [activeTests, setActiveTests] = useState<ABTest[]>(ACTIVE_TESTS);

  useEffect(() => {
    if (!userEmail) return;

    // Load user assignments
    loadUserAssignments();
    
    // Assign user to tests they're not already assigned to
    assignUserToTests();

    // Load test metrics
    loadTestMetrics();

    // Set up event listeners for tracking
    setupEventTracking();
  }, [userEmail]);

  const loadUserAssignments = () => {
    if (!userEmail) return;

    const storageKey = `ab-assignments-${userEmail}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      setUserAssignments(JSON.parse(stored));
    }
  };

  const saveUserAssignments = (assignments: UserAssignment[]) => {
    if (!userEmail) return;

    const storageKey = `ab-assignments-${userEmail}`;
    localStorage.setItem(storageKey, JSON.stringify(assignments));
  };

  const assignUserToTests = () => {
    const newAssignments: UserAssignment[] = [...userAssignments];
    let hasNewAssignments = false;

    activeTests.forEach(test => {
      if (test.status !== 'active') return;

      // Check if user is already assigned to this test
      const existingAssignment = userAssignments.find(a => a.testId === test.id);
      if (existingAssignment) return;

      // Check if user should be included in this test
      const userIncluded = Math.random() * 100 < test.trafficAllocation;
      if (!userIncluded) return;

      // Assign user to a variant based on weights
      const variant = selectVariantByWeight(test.variants);
      if (!variant) return;

      const assignment: UserAssignment = {
        testId: test.id,
        variantId: variant.id,
        assignedAt: new Date().toISOString()
      };

      newAssignments.push(assignment);
      hasNewAssignments = true;

      console.log(`🧪 AB Test: Assigned to "${test.name}" - Variant: "${variant.name}"`);
    });

    if (hasNewAssignments) {
      setUserAssignments(newAssignments);
      saveUserAssignments(newAssignments);
    }
  };

  const selectVariantByWeight = (variants: ABVariant[]): ABVariant | null => {
    const random = Math.random() * 100;
    let cumulativeWeight = 0;

    for (const variant of variants) {
      cumulativeWeight += variant.weight;
      if (random <= cumulativeWeight) {
        return variant;
      }
    }

    return variants[0]; // Fallback to first variant
  };

  const getUserVariant = (testId: string): ABVariant | null => {
    const assignment = userAssignments.find(a => a.testId === testId);
    if (!assignment) return null;

    const test = activeTests.find(t => t.id === testId);
    if (!test) return null;

    return test.variants.find(v => v.variantId === assignment.variantId) || null;
  };

  const trackEvent = (testId: string, event: 'impression' | 'conversion') => {
    const assignment = userAssignments.find(a => a.testId === testId);
    if (!assignment) return;

    // Update test metrics
    setActiveTests(prev => prev.map(test => {
      if (test.id !== testId) return test;

      return {
        ...test,
        variants: test.variants.map(variant => {
          if (variant.id !== assignment.variantId) return variant;

          const updatedMetrics = {
            ...variant.metrics,
            [event === 'impression' ? 'impressions' : 'conversions']: 
              variant.metrics[event === 'impression' ? 'impressions' : 'conversions'] + 1
          };

          updatedMetrics.conversionRate = updatedMetrics.impressions > 0 
            ? (updatedMetrics.conversions / updatedMetrics.impressions) * 100 
            : 0;

          return {
            ...variant,
            metrics: updatedMetrics
          };
        })
      };
    }));

    // Save metrics to storage
    saveTestMetrics();
  };

  const loadTestMetrics = () => {
    const storageKey = 'ab-test-metrics';
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      const metrics = JSON.parse(stored);
      setActiveTests(prev => prev.map(test => ({
        ...test,
        variants: test.variants.map(variant => ({
          ...variant,
          metrics: metrics[test.id]?.[variant.id] || variant.metrics
        }))
      })));
    }
  };

  const saveTestMetrics = () => {
    const metrics: Record<string, Record<string, any>> = {};
    
    activeTests.forEach(test => {
      metrics[test.id] = {};
      test.variants.forEach(variant => {
        metrics[test.id][variant.id] = variant.metrics;
      });
    });

    localStorage.setItem('ab-test-metrics', JSON.stringify(metrics));
  };

  const setupEventTracking = () => {
    // Install prompt events
    const handleInstallPromptShown = () => {
      trackEvent('install-prompt-timing', 'impression');
    };
    
    const handleInstallPromptAccepted = () => {
      trackEvent('install-prompt-timing', 'conversion');
    };

    // Notification permission events
    const handleNotificationPromptShown = () => {
      trackEvent('notification-copy', 'impression');
    };
    
    const handleNotificationPermissionGranted = () => {
      trackEvent('notification-copy', 'conversion');
    };


    // Add event listeners
    window.addEventListener('install-prompt-shown', handleInstallPromptShown);
    window.addEventListener('install-prompt-accepted', handleInstallPromptAccepted);
    window.addEventListener('notification-prompt-shown', handleNotificationPromptShown);
    window.addEventListener('notification-permission-granted', handleNotificationPermissionGranted);

    return () => {
      window.removeEventListener('install-prompt-shown', handleInstallPromptShown);
      window.removeEventListener('install-prompt-accepted', handleInstallPromptAccepted);
      window.removeEventListener('notification-prompt-shown', handleNotificationPromptShown);
      window.removeEventListener('notification-permission-granted', handleNotificationPermissionGranted);
    };
  };

  // Expose test configurations for other components to use
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).getABTestConfig = (testId: string) => {
        const variant = getUserVariant(testId);
        return variant?.config || null;
      };

      (window as any).trackABTestEvent = trackEvent;
    }
  }, [userAssignments, activeTests]);

  return (
    <>
      {/* Development Dashboard */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          background: 'rgba(0, 0, 0, 0.9)',
          border: '1px solid rgba(255, 165, 0, 0.3)',
          borderRadius: '8px',
          padding: '16px',
          color: '#fff',
          fontSize: '12px',
          zIndex: 998,
          maxWidth: '300px',
          maxHeight: '400px',
          overflow: 'auto'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#ffa500' }}>
            🧪 A/B Testing Dashboard
          </h4>
          
          <div style={{ marginBottom: '16px' }}>
            <strong>Active Assignments:</strong>
            {userAssignments.length === 0 ? (
              <div style={{ color: 'rgba(255, 255, 255, 0.6)' }}>None</div>
            ) : (
              <div style={{ marginTop: '8px' }}>
                {userAssignments.map(assignment => {
                  const test = activeTests.find(t => t.id === assignment.testId);
                  const variant = test?.variants.find(v => v.id === assignment.variantId);
                  
                  return (
                    <div key={assignment.testId} style={{
                      background: 'rgba(255, 165, 0, 0.1)',
                      border: '1px solid rgba(255, 165, 0, 0.2)',
                      borderRadius: '4px',
                      padding: '8px',
                      margin: '4px 0',
                      fontSize: '11px'
                    }}>
                      <div><strong>{test?.name}</strong></div>
                      <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                        Variant: {variant?.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <strong>Test Results:</strong>
            {activeTests.map(test => (
              <div key={test.id} style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                padding: '8px',
                margin: '8px 0',
                fontSize: '10px'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                  {test.name}
                </div>
                {test.variants.map(variant => (
                  <div key={variant.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '2px 0',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <span>{variant.name}:</span>
                    <span>
                      {variant.metrics.conversions}/{variant.metrics.impressions} 
                      ({variant.metrics.conversionRate.toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div style={{ marginTop: '16px' }}>
            <button
              onClick={() => {
                // Simulate install prompt impression
                trackEvent('install-prompt-timing', 'impression');
                // Simulate conversion with 20% probability
                if (Math.random() < 0.2) {
                  trackEvent('install-prompt-timing', 'conversion');
                }
              }}
              style={{
                background: 'rgba(255, 165, 0, 0.2)',
                border: '1px solid rgba(255, 165, 0, 0.3)',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '10px',
                color: '#ffa500',
                cursor: 'pointer',
                width: '100%',
                marginBottom: '4px'
              }}
            >
              Simulate Install Test
            </button>
            
            <button
              onClick={() => {
                trackEvent('notification-copy', 'impression');
                if (Math.random() < 0.3) {
                  trackEvent('notification-copy', 'conversion');
                }
              }}
              style={{
                background: 'rgba(255, 165, 0, 0.2)',
                border: '1px solid rgba(255, 165, 0, 0.3)',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '10px',
                color: '#ffa500',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Simulate Notification Test
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Export helper functions
export const ABTestHelpers = {
  getConfig: (testId: string) => {
    if (typeof window !== 'undefined' && (window as any).getABTestConfig) {
      return (window as any).getABTestConfig(testId);
    }
    return null;
  },
  
  trackEvent: (testId: string, event: 'impression' | 'conversion') => {
    if (typeof window !== 'undefined' && (window as any).trackABTestEvent) {
      (window as any).trackABTestEvent(testId, event);
    }
  }
};