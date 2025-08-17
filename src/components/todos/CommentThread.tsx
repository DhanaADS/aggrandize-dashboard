'use client';

import { useState, useEffect, useRef } from 'react';
import { todoCommentsApi, enhancedTodosApi } from '@/lib/todos-api';
import { TodoComment, TeamMember } from '@/types/todos';
import { realtimePresence, PresenceData } from '@/lib/realtime-presence';
import { notificationSounds } from '@/lib/notification-sounds';

interface CommentThreadProps {
  todoId: string;
  currentUser: string;
  teamMembers: TeamMember[];
  onNewComment?: (comment: TodoComment) => void;
  onMarkAsRead?: () => void;
}

interface ExtendedComment extends TodoComment {
  mentions?: string[];
  comment_type?: string;
}

export default function CommentThread({ todoId, currentUser, teamMembers, onNewComment, onMarkAsRead }: CommentThreadProps) {
  const [comments, setComments] = useState<ExtendedComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [selectedMentions, setSelectedMentions] = useState<string[]>([]);
  const [mentionPosition, setMentionPosition] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [isTyping, setIsTyping] = useState<Set<string>>(new Set());
  const [typingTimer, setTypingTimer] = useState<NodeJS.Timeout | null>(null);
  const [presenceData, setPresenceData] = useState<PresenceData[]>([]);
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const [isCurrentlyTyping, setIsCurrentlyTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const [timeUpdateTrigger, setTimeUpdateTrigger] = useState(0);

  useEffect(() => {
    loadComments();
    initializeRealtimePresence();

    // Start time update interval - reduced to 10 seconds for better responsiveness
    const timeInterval = setInterval(() => {
      console.log('⏰ Time update interval triggered for better UX');
      setTimeUpdateTrigger(prev => prev + 1);
    }, 10000); // Update every 10 seconds

    // Auto-mark as read when window becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden && onMarkAsRead) {
        console.log('👁️ Window became visible, marking task as read');
        onMarkAsRead();
      }
    };

    // Mark as read when user focuses on the window
    const handleWindowFocus = () => {
      if (onMarkAsRead) {
        console.log('🔍 Window focused, marking task as read');
        onMarkAsRead();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      cleanupRealtimePresence();
      clearInterval(timeInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      
      // Clear typing timer on unmount
      if (typingTimer) {
        clearTimeout(typingTimer);
        setTypingTimer(null);
      }
      setIsCurrentlyTyping(false);
    };
  }, [todoId, currentUser, onMarkAsRead]);

  const initializeRealtimePresence = async () => {
    try {
      // Always set up event listeners even if global presence is active
      console.log('🔄 CommentThread initializing for todo:', todoId, 'user:', currentUser);
      
      if ((window as any).globalPresenceActive) {
        console.log('🔄 Global presence already active, setting up event listeners only');
        // Still load presence data but don't create new connection
        await loadPresenceData();
      } else {
        // Only initialize if global presence is not active
        console.log('🚀 Initializing CommentThread real-time presence for:', todoId);
        await realtimePresence.joinTodoPresence(todoId, currentUser);
        
        // Load initial presence data
        await loadPresenceData();
      }

      // ALWAYS set up event listeners (moved outside if/else)
      const handlePresenceChange = (event: any) => {
        loadPresenceData();
      };

      const handleNewComment = (event: any) => {
        const { comment, todoId: eventTodoId } = event.detail;
        
        console.log('🎯 CommentThread handleNewComment called:', {
          currentTodoId: todoId,
          eventTodoId: eventTodoId || 'not provided',
          commentTodoId: comment?.todo_id,
          commentId: comment?.id,
          comment: comment?.comment,
          shouldProcess: eventTodoId === todoId && comment?.todo_id === todoId
        });
        
        // Only process comments that belong to this specific todo
        if (comment && eventTodoId === todoId && comment.todo_id === todoId) {
          // Clear typing indicator for the user who just sent a message
          setIsTyping(prev => {
            const newTyping = new Set(prev);
            newTyping.delete(comment.comment_by);
            return newTyping;
          });
          
          // Play notification sound for incoming comments from other users
          if (comment.comment_by !== currentUser) {
            notificationSounds.playNewCommentSound().catch(error => {
              console.warn('Failed to play comment notification sound:', error);
            });
          }
          
          // Add new comment instantly with deduplication
          setComments(prev => {
            console.log('🔍 Processing comment for UI update:', {
              newComment: comment,
              existingCommentsCount: prev.length,
              existingIds: prev.map(c => c.id)
            });
            
            // Check if comment already exists to prevent duplicates
            const exists = prev.some(existing => 
              existing.id === comment.id || 
              (existing.comment === comment.comment && 
               existing.comment_by === comment.comment_by &&
               Math.abs(new Date(existing.created_at).getTime() - new Date(comment.created_at).getTime()) < 2000)
            );
            
            if (exists) {
              console.log('❌ Comment already exists, skipping UI update');
              return prev;
            }
            
            // Smooth addition with proper sorting and transition marking
            const newComments = [...prev, {
              ...comment,
              id: comment.id || `realtime-${Date.now()}-${Math.random()}`,
              isNew: true // Mark as new for smooth animation
            }].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            
            console.log('✅ Adding comment to UI with proper sorting:', {
              newCommentsCount: newComments.length,
              addedComment: comment
            });
            
            // Force time update for new message
            setTimeUpdateTrigger(prev => prev + 1);
            
            // Remove 'isNew' flag after a short delay to prevent permanent styling
            setTimeout(() => {
              setComments(current => current.map(c => ({ ...c, isNew: false })));
            }, 1000);
            
            return newComments;
          });
          setTimeout(() => scrollToBottom(), 50);
        } else {
          console.log('❌ Ignoring comment not for this todo:', {
            comment: comment?.comment || 'no comment',
            commentTodoId: comment?.todo_id,
            eventTodoId,
            currentTodoId: todoId
          });
        }
      };

      // Fallback typing indicator listeners
      const handleUserTyping = (event: any) => {
        const { todoId: typingTodoId, userEmail, timestamp } = event.detail;
        if (typingTodoId === todoId && userEmail !== currentUser) {
          console.log('👤 User typing event received:', userEmail);
          setIsTyping(prev => new Set([...prev, userEmail]));
        }
      };

      const handleUserStopTyping = (event: any) => {
        const { todoId: typingTodoId, userEmail } = event.detail;
        if (typingTodoId === todoId && userEmail !== currentUser) {
          console.log('👤 User stop typing event received:', userEmail);
          setIsTyping(prev => {
            const newTyping = new Set(prev);
            newTyping.delete(userEmail);
            return newTyping;
          });
        }
      };

      // Listen for direct hybrid comments - single consolidated handler
      const handleHybridComment = (event: any) => {
        const { comment, todoId: eventTodoId } = event.detail;
        console.log('🎯 CommentThread received hybrid comment:', {
          currentTodoId: todoId,
          eventTodoId: eventTodoId,
          commentTodoId: comment?.todo_id,
          isForThisTodo: comment?.todo_id === todoId
        });
        
        // Only process comments for the current todo
        if (comment?.todo_id === todoId) {
          console.log('✅ Hybrid comment is for current todo, processing...');
          
          // Use the same logic as handleNewComment but avoid duplication
          if (comment && eventTodoId === todoId && comment.todo_id === todoId) {
            // Clear typing indicator for the user who just sent a message
            setIsTyping(prev => {
              const newTyping = new Set(prev);
              newTyping.delete(comment.comment_by);
              return newTyping;
            });
            
            // Play notification sound for incoming comments from other users
            if (comment.comment_by !== currentUser) {
              notificationSounds.playNewCommentSound().catch(error => {
                console.warn('Failed to play comment notification sound:', error);
              });
            }
            
            // Add new comment instantly with deduplication
            setComments(prev => {
              console.log('🔍 Processing hybrid comment for UI update:', {
                newComment: comment,
                existingCommentsCount: prev.length,
                existingIds: prev.map(c => c.id)
              });
              
              // Check if comment already exists to prevent duplicates
              const exists = prev.some(existing => 
                existing.id === comment.id || 
                (existing.comment === comment.comment && 
                 existing.comment_by === comment.comment_by &&
                 Math.abs(new Date(existing.created_at).getTime() - new Date(comment.created_at).getTime()) < 2000)
              );
              
              if (exists) {
                console.log('❌ Hybrid comment already exists, skipping UI update');
                return prev;
              }
              
              // Smooth addition with proper sorting and transition marking
              const newComments = [...prev, {
                ...comment,
                id: comment.id || `hybrid-${Date.now()}-${Math.random()}`,
                isNew: true // Mark as new for smooth animation
              }].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
              
              console.log('✅ Adding hybrid comment to UI with proper sorting:', {
                newCommentsCount: newComments.length,
                addedComment: comment
              });
              
              // Force time update for new message
              setTimeUpdateTrigger(prev => prev + 1);
              
              // Remove 'isNew' flag after a short delay to prevent permanent styling
              setTimeout(() => {
                setComments(current => current.map(c => ({ ...c, isNew: false })));
              }, 1000);
              
              return newComments;
            });
            setTimeout(() => scrollToBottom(), 50);
          }
        } else {
          console.log('❌ Hybrid comment is for different todo, ignoring...');
        }
      };

      window.addEventListener('presence-change', handlePresenceChange);
      // Only listen to hybrid-comment to prevent duplication
      window.addEventListener('hybrid-comment', handleHybridComment); // Single listener
      window.addEventListener('user-typing', handleUserTyping);
      window.addEventListener('user-stop-typing', handleUserStopTyping);

      // Store listeners for cleanup
      (window as any).presenceCleanup = () => {
        window.removeEventListener('presence-change', handlePresenceChange);
        window.removeEventListener('hybrid-comment', handleHybridComment);
        window.removeEventListener('user-typing', handleUserTyping);
        window.removeEventListener('user-stop-typing', handleUserStopTyping);
      };

      setRealtimeEnabled(true);
    } catch (error) {
      console.warn('⚠️ Real-time presence failed to initialize. Features will work in single-browser mode.', error);
      // Set fallback online users for demo purposes
      setOnlineUsers(new Set([currentUser]));
      setRealtimeEnabled(false);
    }
  };

  const cleanupRealtimePresence = async () => {
    try {
      await realtimePresence.leavePresence();
      
      // Clear typing timer
      if (typingTimer) {
        clearTimeout(typingTimer);
      }

      // Remove event listeners
      if ((window as any).presenceCleanup) {
        (window as any).presenceCleanup();
      }
    } catch (error) {
      console.error('Failed to cleanup real-time presence:', error);
    }
  };

  const loadPresenceData = async () => {
    try {
      const presence = await realtimePresence.getTodoPresence(todoId);
      console.log('👥 Loaded presence data:', presence);
      setPresenceData(presence || []);
      
      if (presence.length > 0) {
        // Real-time mode: use actual presence data
        const online = new Set(presence.filter(p => p.status === 'online' || p.status === 'typing').map(p => p.user_email));
        setOnlineUsers(online);
        console.log('🟢 Online users:', Array.from(online));
        
        // Only show typing for users who are actually typing (and not the current user)
        const typing = new Set(presence.filter(p => 
          p.status === 'typing' && 
          p.user_email !== currentUser &&
          p.last_seen && new Date(p.last_seen).getTime() > (Date.now() - 10000) // Within last 10 seconds
        ).map(p => p.user_email));
        console.log('⌨️ Typing users:', Array.from(typing));
        setIsTyping(typing);
        
        if (!realtimeEnabled) {
          setRealtimeEnabled(true);
        }
      } else {
        // Local mode: show all team members as online for better demo experience
        const onlineList = teamMembers.map(m => m.email);
        setOnlineUsers(new Set(onlineList));
        setIsTyping(new Set());
        console.log('🔄 Running in local mode - showing all team members as online');
        if (realtimeEnabled) {
          setRealtimeEnabled(false);
        }
      }
    } catch (error) {
      console.log('🔇 Presence data unavailable, using local mode');
      // Show all team members as online in fallback mode
      const onlineList = teamMembers.map(m => m.email);
      setOnlineUsers(new Set(onlineList));
      setIsTyping(new Set());
      setRealtimeEnabled(false);
    }
  };

  useEffect(() => {
    // Only scroll to bottom for new comments, not on initial load
    if (!initialLoad && comments.length > 0) {
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        setTimeout(() => scrollToBottom(), 100);
      });
    }
  }, [comments, initialLoad]);

  const loadComments = async () => {
    try {
      // Only show loading spinner on initial load, not on refreshes
      if (initialLoad) {
        setLoading(true);
      }
      
      const commentsData = await todoCommentsApi.getComments(todoId);
      
      // Smooth update for comments to prevent flickering
      setComments(prev => {
        // If we already have comments and this is a refresh, merge smoothly
        if (!initialLoad && prev.length > 0) {
          // Check if we actually have new data
          if (JSON.stringify(prev) === JSON.stringify(commentsData)) {
            return prev; // No change, prevent unnecessary re-render
          }
        }
        return commentsData;
      });
      
      // Mark as read when comments are loaded (user is viewing the thread)
      if (onMarkAsRead && initialLoad) {
        onMarkAsRead();
      }
      
      // Mark initial load as complete
      if (initialLoad) {
        setInitialLoad(false);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      if (initialLoad) {
        setLoading(false);
      }
    }
  };

  const scrollToBottom = () => {
    if (commentsEndRef.current) {
      // Use smooth scrolling with better performance
      const scrollContainer = commentsEndRef.current.closest('[style*="overflow"]');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      } else {
        commentsEndRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end',
          inline: 'nearest'
        });
      }
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || sending) return;

    const commentText = newComment.trim();
    const commentId = `temp-${Date.now()}`;
    
    try {
      setSending(true);
      
      // Check for mentions in the comment
      const mentionPattern = /@(\w+@[\w.-]+\.\w+|\w+)/g;
      const foundMentions: string[] = [];
      let match;
      
      while ((match = mentionPattern.exec(commentText)) !== null) {
        const mentionText = match[1];
        const member = teamMembers.find(m => 
          m.email.includes(mentionText) || m.name.toLowerCase().includes(mentionText.toLowerCase())
        );
        if (member && !foundMentions.includes(member.email)) {
          foundMentions.push(member.email);
        }
      }

      // Combine manually selected mentions with found mentions
      const allMentions = [...new Set([...selectedMentions, ...foundMentions])];

      // Create optimistic comment for instant UI update
      const optimisticComment: ExtendedComment = {
        id: commentId,
        todo_id: todoId,
        comment: commentText,
        comment_by: currentUser,
        created_at: new Date().toISOString(),
        mentions: allMentions,
        comment_type: 'message'
      };

      // Add comment to UI immediately (optimistic update) with smooth transition
      setComments(prev => [...prev, {
        ...optimisticComment,
        isNew: true,
        isOptimistic: true
      }]);
      
      // Clear form immediately for instant feedback
      setNewComment('');
      setSelectedMentions([]);
      setShowMentions(false);
      
      // Clear typing indicator immediately when sending
      setIsCurrentlyTyping(false);
      if (typingTimer) {
        clearTimeout(typingTimer);
        setTypingTimer(null);
      }
      
      // Send stop typing signal to real-time system
      try {
        await realtimePresence.stopTyping(currentUser, todoId);
      } catch (error) {
        console.error('Failed to stop typing indicator:', error);
      }
      
      // Force immediate scroll to new comment
      setTimeout(() => {
        scrollToBottom();
      }, 10);

      // Send to database in background
      let savedComment;
      if (allMentions.length > 0) {
        savedComment = await enhancedTodosApi.addCommentWithMentions(todoId, commentText, currentUser, allMentions);
      } else {
        savedComment = await todoCommentsApi.addComment(todoId, commentText, currentUser);
      }

      // Replace optimistic comment with real one from database smoothly
      setComments(prev => prev.map(comment => 
        comment.id === commentId ? { 
          ...savedComment, 
          id: savedComment.id,
          isOptimistic: false,
          isNew: false 
        } : comment
      ));

      // Trigger notification callback if provided
      if (onNewComment && savedComment) {
        onNewComment(savedComment);
      }

    } catch (error) {
      console.error('Failed to add comment:', error);
      
      // Remove optimistic comment on error
      setComments(prev => prev.filter(comment => comment.id !== commentId));
      
      // Restore form data on error
      setNewComment(commentText);
      setSelectedMentions(allMentions);
      
      alert('Failed to send comment. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Handle real-time typing indicators - debounced to prevent spam
  const handleTypingStart = async () => {
    try {
      // Only send typing indicator if not already typing
      if (!isCurrentlyTyping) {
        console.log('⌨️ Starting typing indicator for:', currentUser);
        setIsCurrentlyTyping(true);
        
        // Try to send to real-time presence system
        try {
          await realtimePresence.startTyping(currentUser, todoId);
        } catch (presenceError) {
          console.warn('Presence system unavailable, using local fallback');
        }
        
        // Also broadcast a simple custom event for cross-browser typing
        window.dispatchEvent(new CustomEvent('user-typing', {
          detail: { 
            todoId, 
            userEmail: currentUser, 
            timestamp: Date.now() 
          }
        }));
      }
      
      // Clear existing timer
      if (typingTimer) {
        clearTimeout(typingTimer);
      }

      // Set a timer to stop typing indicator after 3 seconds of inactivity
      const timer = setTimeout(async () => {
        setIsCurrentlyTyping(false);
        
        try {
          await realtimePresence.stopTyping(currentUser, todoId);
        } catch (presenceError) {
          console.warn('Presence system unavailable for stop typing');
        }
        
        // Broadcast stop typing event
        window.dispatchEvent(new CustomEvent('user-stop-typing', {
          detail: { 
            todoId, 
            userEmail: currentUser 
          }
        }));
        
        setTypingTimer(null);
      }, 3000);
      
      setTypingTimer(timer);
    } catch (error) {
      console.error('Failed to start typing indicator:', error);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const previousValue = newComment;
    setNewComment(value);

    // Only trigger typing indicator if user is actually adding content
    if (value.trim().length > 0 && value !== previousValue) {
      handleTypingStart();
    }

    // Check for @ mentions
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1 && lastAtIndex === cursorPosition - 1) {
      setMentionPosition(cursorPosition);
      setShowMentions(true);
      setMentionFilter('');
    } else if (lastAtIndex !== -1 && cursorPosition > lastAtIndex) {
      const mentionText = textBeforeCursor.substring(lastAtIndex + 1);
      if (!mentionText.includes(' ')) {
        setMentionFilter(mentionText);
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (member: TeamMember) => {
    const textBeforeCursor = newComment.substring(0, mentionPosition - 1);
    const textAfterCursor = newComment.substring(mentionPosition + mentionFilter.length);
    const newText = `${textBeforeCursor}@${member.name} ${textAfterCursor}`;
    
    setNewComment(newText);
    setSelectedMentions([...selectedMentions, member.email]);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const getFilteredMembers = () => {
    return teamMembers.filter(member => 
      member.name.toLowerCase().includes(mentionFilter.toLowerCase()) ||
      member.email.toLowerCase().includes(mentionFilter.toLowerCase())
    );
  };

  const formatCommentText = (text: string, mentions: string[] | null | undefined = []) => {
    // Handle null, undefined, or empty mentions array
    if (!mentions || !Array.isArray(mentions) || mentions.length === 0) return text;

    let formattedText = text;
    mentions.forEach(email => {
      const member = teamMembers.find(m => m.email === email);
      if (member) {
        const pattern = new RegExp(`@${member.name}`, 'g');
        formattedText = formattedText.replace(pattern, 
          `<span class="mention">@${member.name}</span>`
        );
      }
    });

    return formattedText;
  };

  const getTimeDisplay = (dateString: string) => {
    // Force re-calculation when timeUpdateTrigger changes
    const now = new Date();
    const commentDate = new Date(dateString);
    const diffInMinutes = Math.abs(now.getTime() - commentDate.getTime()) / (1000 * 60);
    
    // console.log(`🕐 Time update: ${dateString} -> diff: ${diffInMinutes.toFixed(1)} minutes`); // Disabled to reduce console noise
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${Math.floor(diffInMinutes)}m ago`;
    
    const diffInHours = diffInMinutes / 60;
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    
    const diffInDays = diffInHours / 24;
    return diffInDays < 7 ? `${Math.floor(diffInDays)}d ago` : commentDate.toLocaleDateString();
  };

  if (loading && initialLoad) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '500px',
        maxHeight: '500px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        background: 'rgba(0, 0, 0, 0.3)',
        overflow: 'hidden'
      }}>
        {/* Skeleton Comment Thread */}
        <div style={{
          flex: 1,
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {/* Skeleton Comments */}
          {[1, 2, 3].map((i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: i % 2 === 0 ? 'flex-end' : 'flex-start',
              animation: 'fadeInSmooth 0.6s ease-out',
              animationDelay: `${i * 0.1}s`,
              animationFillMode: 'both'
            }}>
              <div style={{
                maxWidth: '75%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: i % 2 === 0 ? 'flex-end' : 'flex-start'
              }}>
                {/* Skeleton Avatar & Info */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                  flexDirection: i % 2 === 0 ? 'row-reverse' : 'row'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.1)',
                    animation: 'pulse 2s infinite'
                  }} />
                  <div style={{
                    width: '80px',
                    height: '12px',
                    borderRadius: '4px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    animation: 'pulse 2s infinite'
                  }} />
                </div>
                {/* Skeleton Message */}
                <div style={{
                  width: `${Math.random() * 100 + 150}px`,
                  height: '60px',
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  animation: 'pulse 2s infinite',
                  animationDelay: `${i * 0.2}s`
                }} />
              </div>
            </div>
          ))}
        </div>
        
        {/* Skeleton Input */}
        <div style={{
          padding: '1rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{
            height: '60px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            animation: 'pulse 2s infinite'
          }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '500px', // Fixed height for single frame
      maxHeight: '500px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      background: 'rgba(0, 0, 0, 0.3)',
      overflow: 'hidden' // Prevent any overflow
    }}>
      {/* Comments List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem', // Reduced gap for compactness
        background: 'transparent',
        minHeight: 0, // Important for flex scrolling
        scrollBehavior: 'smooth'
      }}>
        {comments.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem 0'
          }}>
            <div style={{
              fontSize: '4rem',
              marginBottom: '1rem',
              opacity: 0.5
            }}>💬</div>
            <p style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.875rem',
              margin: 0
            }}>No comments yet. Start the conversation!</p>
          </div>
        ) : (
          comments.map((comment) => {
            const isMyComment = comment.comment_by === currentUser;
            const member = teamMembers.find(m => m.email === comment.comment_by);
            
            return (
              <div
                key={comment.id}
                style={{
                  display: 'flex',
                  justifyContent: isMyComment ? 'flex-end' : 'flex-start',
                  marginBottom: '0.5rem' // More compact spacing between comments
                }}
              >
                <div style={{
                  maxWidth: '75%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMyComment ? 'flex-end' : 'flex-start'
                }}>
                  {/* Comment Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.5rem',
                    flexDirection: isMyComment ? 'row-reverse' : 'row'
                  }}>
                    <div style={{ position: 'relative' }}>
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
                        background: isMyComment 
                          ? 'linear-gradient(135deg, #00ff88, #00d4ff)' 
                          : 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                        border: '2px solid rgba(255, 255, 255, 0.2)',
                        position: 'relative'
                      }}>
                        {isMyComment ? '📤' : '📥'}
                        <span style={{
                          position: 'absolute',
                          bottom: '-2px',
                          right: '2px',
                          fontSize: '0.6rem',
                          background: 'rgba(0, 0, 0, 0.8)',
                          borderRadius: '6px',
                          padding: '1px 3px',
                          lineHeight: 1
                        }}>
                          {isMyComment ? 'You' : (member?.name?.charAt(0) || comment.comment_by.charAt(0)).toUpperCase()}
                        </span>
                      </div>
                      
                      {/* Online/Offline Status Indicator */}
                      <div style={{
                        position: 'absolute',
                        bottom: '-4px',
                        right: '-4px',
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: onlineUsers.has(comment.comment_by) ? '#10b981' : '#ef4444',
                        border: '2px solid rgba(0, 0, 0, 0.9)',
                        animation: onlineUsers.has(comment.comment_by) ? 'pulse 2s infinite' : 'none',
                        boxShadow: onlineUsers.has(comment.comment_by) 
                          ? '0 0 8px rgba(16, 185, 129, 0.6)' 
                          : '0 0 8px rgba(239, 68, 68, 0.6)'
                      }} title={onlineUsers.has(comment.comment_by) ? 'Online' : 'Offline'} />
                    </div>
                    
                    <div style={{
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontSize: '0.75rem',
                      textAlign: isMyComment ? 'right' : 'left'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: isMyComment ? 'flex-end' : 'flex-start' }}>
                        <span style={{ fontWeight: 500 }}>
                          {isMyComment ? 'You' : (member?.name || comment.comment_by.split('@')[0])}
                        </span>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          color: onlineUsers.has(comment.comment_by) ? '#10b981' : '#ef4444'
                        }}>
                          <div style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: onlineUsers.has(comment.comment_by) ? '#10b981' : '#ef4444',
                            flexShrink: 0,
                            animation: onlineUsers.has(comment.comment_by) ? 'pulse 2s infinite' : 'none'
                          }} />
                          {onlineUsers.has(comment.comment_by) ? 'Online' : 'Offline'}
                        </div>
                      </div>
                      <div key={timeUpdateTrigger}>{getTimeDisplay(comment.created_at)}</div>
                    </div>
                  </div>

                  {/* Enhanced Comment Bubble */}
                  <div style={{
                    position: 'relative',
                    transition: 'all 0.3s ease',
                    background: isMyComment 
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(59, 130, 246, 0.25))' 
                      : 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))',
                    border: isMyComment 
                      ? '2px solid rgba(16, 185, 129, 0.4)' 
                      : '2px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '16px',
                    padding: '0.625rem 0.875rem',
                    boxShadow: isMyComment 
                      ? '0 12px 40px rgba(0, 255, 136, 0.15), 0 4px 16px rgba(0, 0, 0, 0.1)' 
                      : '0 12px 40px rgba(99, 102, 241, 0.15), 0 4px 16px rgba(0, 0, 0, 0.1)',
                    willChange: 'auto',
                    transform: `translateZ(0) ${(comment as any).isNew ? 'scale(1.02)' : 'scale(1)'}`,
                    opacity: (comment as any).isOptimistic ? 0.7 : ((comment as any).isNew ? 0.9 : 1),
                    animation: (comment as any).isNew ? 'slideInComment 0.4s ease-out' : 'none',
                    filter: (comment as any).isOptimistic ? 'brightness(0.9)' : 'none'
                  }}>
                    <div style={{
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '0.875rem',
                      lineHeight: '1.5',
                      wordWrap: 'break-word'
                    }}
                    dangerouslySetInnerHTML={{
                      __html: formatCommentText(comment.comment, comment.mentions || [])
                    }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {/* Typing Indicators */}
        {Array.from(isTyping).filter(email => email !== currentUser).map(email => {
          const member = teamMembers.find(m => m.email === email);
          return (
            <div key={email} style={{
              display: 'flex',
              justifyContent: 'flex-start',
              marginBottom: '1rem'
            }}>
              <div style={{
                maxWidth: '75%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem'
                }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      border: '2px solid rgba(255, 255, 255, 0.2)',
                      position: 'relative'
                    }}>
                      📥
                      <span style={{
                        position: 'absolute',
                        bottom: '-2px',
                        right: '2px',
                        fontSize: '0.6rem',
                        background: 'rgba(0, 0, 0, 0.8)',
                        borderRadius: '6px',
                        padding: '1px 3px',
                        lineHeight: 1
                      }}>
                        {member?.name?.charAt(0) || email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    {/* Online Status for Typing User */}
                    <div style={{
                      position: 'absolute',
                      bottom: '-4px',
                      right: '-4px',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: onlineUsers.has(email) ? '#10b981' : '#ef4444',
                      border: '2px solid rgba(0, 0, 0, 0.9)',
                      animation: 'pulse 2s infinite',
                      boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)'
                    }} />
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '0.75rem'
                  }}>
                    <span style={{ fontWeight: 500 }}>
                      {member?.name || email.split('@')[0]}
                    </span>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>is typing...</span>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#10b981',
                      animation: 'pulse 2s infinite'
                    }} />
                  </div>
                </div>

                <div style={{
                  background: 'rgba(139, 92, 246, 0.1)',
                  border: '2px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '24px',
                  padding: '1rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.6)',
                    animation: 'bounce 1.4s infinite both',
                    animationDelay: '0s'
                  }} />
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.6)',
                    animation: 'bounce 1.4s infinite both',
                    animationDelay: '0.2s'
                  }} />
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.6)',
                    animation: 'bounce 1.4s infinite both',
                    animationDelay: '0.4s'
                  }} />
                </div>
              </div>
            </div>
          );
        })}
        
        <div ref={commentsEndRef} />
      </div>

      {/* Comment Input */}
      <div style={{
        padding: '1rem', // Reduced padding for compactness
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'relative',
        background: 'rgba(0, 0, 0, 0.2)', // Subtle background
        borderBottomLeftRadius: '12px',
        borderBottomRightRadius: '12px'
      }}>
        {/* Mentions Dropdown */}
        {showMentions && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: '1.5rem',
            right: '1.5rem',
            marginBottom: '0.5rem',
            background: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '0.5rem',
            maxHeight: '10rem',
            overflowY: 'auto'
          }}>
            {getFilteredMembers().map((member) => (
              <button
                key={member.email}
                onClick={() => insertMention(member)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.75rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 600
                }}>
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{
                    color: '#ffffff',
                    fontWeight: 500,
                    fontSize: '0.875rem'
                  }}>{member.name}</div>
                  <div style={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '0.75rem'
                  }}>{member.email}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleCommentSubmit} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          {/* Selected Mentions */}
          {selectedMentions.length > 0 && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              {selectedMentions.map((email) => {
                const member = teamMembers.find(m => m.email === email);
                return (
                  <span
                    key={email}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      color: '#3b82f6',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '1rem',
                      fontSize: '0.75rem'
                    }}
                  >
                    @{member?.name || email.split('@')[0]}
                    <button
                      type="button"
                      onClick={() => setSelectedMentions(prev => prev.filter(e => e !== email))}
                      style={{
                        color: 'rgba(59, 130, 246, 0.7)',
                        background: 'none',
                        border: 'none',
                        marginLeft: '0.25rem',
                        cursor: 'pointer',
                        transition: 'color 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#3b82f6';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'rgba(59, 130, 246, 0.7)';
                      }}
                    >
                      ✕
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '0.75rem'
          }}>
            <div style={{
              flex: 1,
              position: 'relative'
            }}>
              <textarea
                ref={textareaRef}
                value={newComment}
                onChange={handleTextareaChange}
                placeholder="Type a comment... (use @ to mention)"
                rows={2} // Reduced from 3 to 2 for compactness
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '0.5rem',
                  padding: '0.5rem 0.75rem', // Reduced padding
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  resize: 'none',
                  outline: 'none',
                  minHeight: '40px', // Minimum height for usability
                  maxHeight: '80px' // Maximum height to prevent expansion
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleCommentSubmit(e);
                  }
                }}
              />
            </div>

            {/* Real-time Status & Test */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}>
              {/* Status Indicator */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.5rem',
                background: realtimeEnabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                border: realtimeEnabled ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: '0.5rem',
                minWidth: '80px'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: realtimeEnabled ? '#10b981' : '#f59e0b',
                  animation: realtimeEnabled ? 'pulse 2s infinite' : 'none'
                }} />
                <span style={{
                  color: realtimeEnabled ? '#10b981' : '#f59e0b',
                  fontSize: '0.6rem',
                  fontWeight: 500,
                  textAlign: 'center'
                }}>
                  {realtimeEnabled ? 'LIVE' : 'LOCAL'}
                </span>
                <span style={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '0.6rem',
                  textAlign: 'center'
                }}>
                  {realtimeEnabled ? `${onlineUsers.size} online` : 'Setup needed'}
                </span>
              </div>

            </div>

            <button
              type="submit"
              disabled={!newComment.trim() || sending}
              style={{
                background: newComment.trim() && !sending
                  ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
                  : 'rgba(107, 114, 128, 0.5)',
                color: newComment.trim() && !sending ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                fontWeight: 500,
                border: 'none',
                cursor: newComment.trim() && !sending ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                minWidth: '100px',
                justifyContent: 'center',
                opacity: sending ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (newComment.trim() && !sending) {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {sending ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '2px solid #ffffff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Sending...
                </>
              ) : (
                <>
                  <span>💬</span>
                  Reply
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .mention {
          color: #60a5fa;
          background-color: rgba(96, 165, 250, 0.2);
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-weight: 600;
        }
        
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          70% {
            box-shadow: 0 0 0 4px rgba(16, 185, 129, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }
        
        @keyframes bounce {
          0%, 60%, 100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-10px);
          }
        }
        
        @keyframes slideInComment {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          50% {
            opacity: 0.7;
            transform: translateY(5px) scale(1.01);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes fadeInSmooth {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}