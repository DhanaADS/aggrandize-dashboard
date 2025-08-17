'use client';

import { useState, useEffect } from 'react';
import { Todo, TeamMember, PRIORITY_CONFIG, STATUS_CONFIG } from '@/types/todos';

interface CompletedTasksSidebarProps {
  completedTasks: Todo[];
  teamMembers: TeamMember[];
  currentUser: string;
  onTaskClick?: (task: Todo) => void;
  onRestoreTask?: (taskId: string) => Promise<void>;
}

export default function CompletedTasksSidebar({ 
  completedTasks, 
  teamMembers, 
  currentUser,
  onTaskClick,
  onRestoreTask 
}: CompletedTasksSidebarProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [isCollapsed, setIsCollapsed] = useState(true); // Default to minimized
  const [userFilter, setUserFilter] = useState<string>('all'); // 'all', 'mine', 'assigned', specific email

  // Filter tasks based on user selection
  const getFilteredTasks = () => {
    return completedTasks.filter(task => {
      switch (userFilter) {
        case 'mine':
          return task.created_by === currentUser;
        case 'assigned':
          return task.assigned_to === currentUser || task.assigned_to_array?.includes(currentUser);
        case 'all':
          return true;
        default:
          // Specific user email
          return task.created_by === userFilter || 
                 task.assigned_to === userFilter || 
                 task.assigned_to_array?.includes(userFilter);
      }
    });
  };

  // Group completed tasks by month with filtering
  const groupTasksByMonth = () => {
    const groups: Record<string, Todo[]> = {};
    const filteredTasks = getFilteredTasks();
    
    filteredTasks.forEach(task => {
      const completedDate = task.completed_at || task.updated_at;
      const monthKey = new Date(completedDate).toISOString().substring(0, 7); // YYYY-MM
      
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(task);
    });

    // Sort months in descending order (newest first)
    const sortedMonths = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    const sortedGroups: Record<string, Todo[]> = {};
    
    sortedMonths.forEach(month => {
      // Sort tasks within each month by completion date (newest first)
      sortedGroups[month] = groups[month].sort((a, b) => {
        const dateA = new Date(a.completed_at || a.updated_at).getTime();
        const dateB = new Date(b.completed_at || b.updated_at).getTime();
        return dateB - dateA;
      });
    });

    return sortedGroups;
  };

  const taskGroups = groupTasksByMonth();
  const months = Object.keys(taskGroups);

  // Set current month as default selection
  useEffect(() => {
    if (months.length > 0 && !selectedMonth) {
      setSelectedMonth(months[0]); // Current/latest month
    }
  }, [months, selectedMonth]);

  const getMonthDisplayName = (monthKey: string) => {
    const date = new Date(monthKey + '-01');
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const getTaskDisplayName = (task: Todo) => {
    return task.title.length > 25 ? `${task.title.substring(0, 25)}...` : task.title;
  };

  const getAssigneeDisplay = (task: Todo) => {
    if (task.assigned_to_array && task.assigned_to_array.length > 0) {
      const member = teamMembers.find(m => m.email === task.assigned_to_array![0]);
      return member ? member.name.charAt(0).toUpperCase() : task.assigned_to_array[0].charAt(0).toUpperCase();
    }
    if (task.assigned_to) {
      const member = teamMembers.find(m => m.email === task.assigned_to);
      return member ? member.name.charAt(0).toUpperCase() : task.assigned_to.charAt(0).toUpperCase();
    }
    return '?';
  };

  const selectedTasks = selectedMonth ? taskGroups[selectedMonth] || [] : [];

  return (
    <div style={{
      width: isCollapsed ? '60px' : '320px',
      height: '100%', // Use container height
      background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.8), rgba(20, 20, 40, 0.9))',
      backdropFilter: 'blur(20px)',
      borderRight: '1px solid rgba(255, 255, 255, 0.1)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.3s ease',
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {!isCollapsed && (
          <div>
            <h3 style={{
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: 600,
              margin: 0,
              marginBottom: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                padding: '0.25rem',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
              }}>✅</span>
              Completed Tasks
            </h3>
            <p style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.75rem',
              margin: 0
            }}>
              {completedTasks.length} tasks completed
            </p>
          </div>
        )}
        
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.6)',
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: '0.25rem',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
          }}
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* User Filter */}
          <div style={{
            padding: '1rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <label style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.75rem',
              fontWeight: 500,
              display: 'block',
              marginBottom: '0.5rem'
            }}>
              Filter by User
            </label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '0.5rem',
                padding: '0.5rem',
                color: '#ffffff',
                fontSize: '0.875rem',
                outline: 'none',
                marginBottom: '0.75rem'
              }}
            >
              <option value="all" style={{ background: '#1a1a2e', color: '#ffffff' }}>
                All Users ({completedTasks.length})
              </option>
              <option value="mine" style={{ background: '#1a1a2e', color: '#ffffff' }}>
                My Tasks ({completedTasks.filter(t => t.created_by === currentUser).length})
              </option>
              <option value="assigned" style={{ background: '#1a1a2e', color: '#ffffff' }}>
                Assigned to Me ({completedTasks.filter(t => t.assigned_to === currentUser || t.assigned_to_array?.includes(currentUser)).length})
              </option>
              {teamMembers.map(member => {
                const memberTaskCount = completedTasks.filter(t => 
                  t.created_by === member.email || 
                  t.assigned_to === member.email || 
                  t.assigned_to_array?.includes(member.email)
                ).length;
                
                if (memberTaskCount === 0 || member.email === currentUser) return null;
                
                return (
                  <option key={member.email} value={member.email} style={{ background: '#1a1a2e', color: '#ffffff' }}>
                    {member.name} ({memberTaskCount})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Month Selector */}
          {months.length > 0 && (
            <div style={{
              padding: '1rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <label style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.75rem',
                fontWeight: 500,
                display: 'block',
                marginBottom: '0.5rem'
              }}>
                Filter by Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '0.5rem',
                  padding: '0.5rem',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              >
                {months.map(month => (
                  <option key={month} value={month} style={{ background: '#1a1a2e', color: '#ffffff' }}>
                    {getMonthDisplayName(month)} ({taskGroups[month].length})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Completed Tasks List */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0.5rem'
          }}>
            {selectedTasks.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '2rem 1rem',
                color: 'rgba(255, 255, 255, 0.6)'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
                <p style={{ fontSize: '0.875rem', margin: 0 }}>
                  No completed tasks{selectedMonth ? ` for ${getMonthDisplayName(selectedMonth)}` : ''}
                </p>
              </div>
            ) : (
              selectedTasks.map((task, index) => {
                const priorityConfig = PRIORITY_CONFIG[task.priority];
                const isMyTask = task.created_by === currentUser;
                const isAssignedToMe = task.assigned_to === currentUser || task.assigned_to_array?.includes(currentUser);
                
                return (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick?.(task)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '0.5rem',
                      padding: '0.75rem',
                      marginBottom: '0.5rem',
                      cursor: onTaskClick ? 'pointer' : 'default',
                      transition: 'all 0.2s ease',
                      borderLeft: `3px solid ${priorityConfig.color}`
                    }}
                    onMouseEnter={(e) => {
                      if (onTaskClick) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.transform = 'translateX(2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (onTaskClick) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }
                    }}
                  >
                    {/* Task Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.5rem'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span style={{
                          fontSize: '0.7rem',
                          color: 'rgba(255, 255, 255, 0.5)'
                        }}>
                          #{index + 1}
                        </span>
                        <span style={{ fontSize: '0.75rem' }}>
                          {priorityConfig.icon}
                        </span>
                      </div>
                      
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: isMyTask 
                          ? 'linear-gradient(135deg, #00ff88, #00d4ff)' 
                          : 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.65rem',
                        color: '#ffffff',
                        fontWeight: 600
                      }}>
                        {getAssigneeDisplay(task)}
                      </div>
                    </div>

                    {/* Task Title */}
                    <h4 style={{
                      color: '#ffffff',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      margin: '0 0 0.5rem 0',
                      lineHeight: '1.3',
                      textDecoration: 'line-through',
                      opacity: 0.8
                    }}>
                      {getTaskDisplayName(task)}
                    </h4>

                    {/* Task Meta and Actions */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.65rem',
                      color: 'rgba(255, 255, 255, 0.5)'
                    }}>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem'
                      }}>
                        <span>
                          {new Date(task.completed_at || task.updated_at).toLocaleDateString()}
                        </span>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          {isMyTask && <span title="Created by me">👤</span>}
                          {isAssignedToMe && <span title="Assigned to me">📋</span>}
                        </div>
                      </div>
                      
                      {/* Restore Button */}
                      {onRestoreTask && (isMyTask || isAssignedToMe) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRestoreTask(task.id);
                          }}
                          style={{
                            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                            border: 'none',
                            borderRadius: '0.25rem',
                            padding: '0.25rem 0.5rem',
                            color: '#ffffff',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.05)';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                          title="Restore task to active status"
                        >
                          🔄 Restore
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Collapsed State */}
      {isCollapsed && (
        <div style={{
          padding: '1rem 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #10b981, #059669)',
            padding: '0.75rem',
            borderRadius: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
          }}>
            ✅
          </div>
          <div style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '0.7rem',
            transform: 'rotate(-90deg)',
            whiteSpace: 'nowrap'
          }}>
            {completedTasks.length} completed
          </div>
        </div>
      )}
    </div>
  );
}