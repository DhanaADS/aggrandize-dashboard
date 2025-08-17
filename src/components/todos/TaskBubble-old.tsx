'use client';

import { useState } from 'react';
import { Todo, TeamMember, TodoStatus, PRIORITY_CONFIG, STATUS_CONFIG } from '@/types/todos';

interface TaskBubbleProps {
  todo: Todo;
  currentUser: string;
  teamMembers: TeamMember[];
  onStatusUpdate: (todoId: string, status: TodoStatus) => Promise<void>;
  onSelect?: () => void;
}

export default function TaskBubble({ 
  todo, 
  currentUser, 
  teamMembers, 
  onStatusUpdate,
  onSelect 
}: TaskBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const priorityConfig = PRIORITY_CONFIG[todo.priority];
  const statusConfig = STATUS_CONFIG[todo.status];
  const isMyTask = todo.created_by === currentUser;
  const isAssignedToMe = todo.assigned_to === currentUser || todo.assigned_to_array?.includes(currentUser);
  const canUpdate = isMyTask || isAssignedToMe;

  const getAssigneeDisplay = () => {
    if (todo.assigned_to_array && todo.assigned_to_array.length > 0) {
      return todo.assigned_to_array.map(email => {
        const member = teamMembers.find(m => m.email === email);
        return member ? member.name : email.split('@')[0];
      });
    }
    if (todo.assigned_to) {
      const member = teamMembers.find(m => m.email === todo.assigned_to);
      return [member ? member.name : todo.assigned_to.split('@')[0]];
    }
    return [];
  };

  const handleStatusUpdate = async (newStatus: TodoStatus) => {
    if (isUpdating) return;
    
    try {
      setIsUpdating(true);
      await onStatusUpdate(todo.id, newStatus);
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getTimeDisplay = () => {
    const now = new Date();
    const createdAt = new Date(todo.created_at);
    const diffInHours = Math.abs(now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60);
      return `${minutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      const days = Math.floor(diffInHours / 24);
      return days === 1 ? '1 day ago' : `${days} days ago`;
    }
  };

  return (
    <div 
      style={{
        display: 'flex',
        justifyContent: isMyTask ? 'flex-end' : 'flex-start',
        marginBottom: '1.5rem'
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div style={{
        maxWidth: '70%',
        alignItems: isMyTask ? 'flex-end' : 'flex-start',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Sender Info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '0.5rem',
          flexDirection: isMyTask ? 'row-reverse' : 'row'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '0.875rem',
            fontWeight: 600,
            background: isMyTask 
              ? 'linear-gradient(135deg, #00ff88, #00d4ff)' 
              : 'linear-gradient(135deg, #8b5cf6, #ec4899)'
          }}>
            {isMyTask ? 'Me' : todo.created_by.charAt(0).toUpperCase()}
          </div>
          
          <div style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '0.75rem',
            textAlign: isMyTask ? 'right' : 'left'
          }}>
            <div>{isMyTask ? 'You' : todo.created_by.split('@')[0]}</div>
            <div>{getTimeDisplay()}</div>
          </div>
        </div>

        {/* Message Bubble */}
        <div 
          style={{
            position: 'relative',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: isMyTask 
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(59, 130, 246, 0.2))' 
              : 'rgba(255, 255, 255, 0.08)',
            border: isMyTask 
              ? '1px solid rgba(16, 185, 129, 0.3)' 
              : '1px solid rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(20px)',
            borderRadius: isMyTask ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
            padding: '1rem',
            maxWidth: '100%',
            boxShadow: isMyTask 
              ? '0 8px 32px rgba(0, 255, 136, 0.1)' 
              : '0 8px 32px rgba(0, 0, 0, 0.2)'
          }}
          onClick={onSelect}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {/* Priority Badge */}
          <div 
            style={{ 
              position: 'absolute',
              top: '-8px',
              left: isMyTask ? 'auto' : '1rem',
              right: isMyTask ? '1rem' : 'auto',
              padding: '0.25rem 0.5rem',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              backgroundColor: priorityConfig.color,
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
            }}
          >
            <span>{priorityConfig.icon}</span>
            <span>{priorityConfig.label}</span>
          </div>

          {/* Task Content */}
          <div className="mt-2">
            <h3 className="text-white font-semibold text-base mb-2 leading-tight">
              {todo.title}
            </h3>
            
            {todo.description && (
              <p className="text-white/80 text-sm mb-3 leading-relaxed">
                {todo.description}
              </p>
            )}

            {/* Assignment Info */}
            {getAssigneeDisplay().length > 0 && (
              <div className="bg-black/20 rounded-lg p-2 mb-3 border border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-sm">👤</span>
                  <div className="flex flex-wrap gap-1">
                    {getAssigneeDisplay().map((name, index) => (
                      <span 
                        key={index}
                        className="text-white/90 text-sm bg-white/10 px-2 py-1 rounded-md"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Status Display */}
            <div className="flex items-center justify-between">
              <div 
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium"
                style={{
                  backgroundColor: `${statusConfig.color}20`,
                  borderColor: `${statusConfig.color}40`,
                  color: statusConfig.color
                }}
              >
                <span>{statusConfig.emoji}</span>
                <span>{statusConfig.label}</span>
              </div>

              {/* Due Date */}
              {todo.due_date && (
                <div className="text-white/60 text-xs">
                  Due: {new Date(todo.due_date).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          {/* Hover Actions */}
          {showActions && canUpdate && (
            <div className="absolute -bottom-12 left-0 right-0 flex justify-center">
              <div className="bg-black/80 backdrop-blur-xl rounded-lg p-2 border border-white/20 flex gap-1">
                {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                  <button
                    key={status}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusUpdate(status as TodoStatus);
                    }}
                    disabled={isUpdating || todo.status === status}
                    className={`p-2 rounded-md transition-all duration-200 ${
                      todo.status === status
                        ? 'bg-white/20 text-white cursor-default'
                        : 'hover:bg-white/10 text-white/70 hover:text-white hover:scale-110'
                    } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={config.label}
                  >
                    {config.emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading Overlay */}
          {isUpdating && (
            <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Quick Actions Bar */}
        <div className={`flex items-center gap-2 mt-2 ${isMyTask ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Reply Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.();
            }}
            className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white/70 hover:text-white text-xs transition-all duration-200 hover:scale-105"
          >
            <span>💬</span>
            <span>Reply</span>
          </button>

          {/* Progress Indicator */}
          {todo.progress > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs">
              <span>📊</span>
              <span>{todo.progress}%</span>
            </div>
          )}

          {/* Team Task Indicator */}
          {todo.is_team_todo && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400 text-xs">
              <span>👥</span>
              <span>Team</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}