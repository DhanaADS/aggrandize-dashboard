'use client';

import React, { useState, useEffect, useRef } from 'react';
import { todoCommentsApi, enhancedTodosApi, todoReactionsApi, todoAttachmentsApi } from '@/lib/todos-api';
import { TodoComment, TeamMember } from '@/types/todos';
import { realtimePresence, PresenceData } from '@/lib/realtime-presence';
import { notificationSounds } from '@/lib/notification-sounds';
import { createClient } from '@/lib/supabase/client';

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
  const [reactions, setReactions] = useState<Record<string, Array<{emoji: string, count: number, users: string[]}>>>({});
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null); // commentId when picker is open
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null); // commentId when message is hovered
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [attachments, setAttachments] = useState<Record<string, any[]>>({});
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Click outside to close pickers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showReactionPicker && !((event.target as Element)?.closest('[data-reaction-picker]'))) {
        setShowReactionPicker(null);
      }
      if (showEmojiPicker && !((event.target as Element)?.closest('[data-emoji-picker]'))) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showReactionPicker, showEmojiPicker]);

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

  // Unified real-time subscription for reactions (database changes and broadcasts)
  useEffect(() => {
    if (comments.length === 0) return;

    const supabase = createClient();
    const channel = supabase.channel(`reactions-${todoId}`);

    const subscription = channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'todo_comment_reactions',
          filter: `comment_id=in.(${comments.map((c) => `'${c.id}'`).join(',')})`,
        },
        async (payload) => {
          console.log('🔥 Real-time reaction change (postgres_changes):', payload);
          // Refetch all reactions for simplicity and consistency
          const commentIds = comments.map((comment) => comment.id);
          const reactionsData = await todoReactionsApi.getReactions(commentIds);
          setReactions(reactionsData);
        }
      )
      .on(
        'broadcast',
        { event: 'reaction_update' },
        async (payload) => {
          console.log('📡 Received reaction broadcast:', payload);
          // To ensure consistency, we refetch reactions on any broadcast event.
          // This simplifies the logic and avoids potential desync issues with optimistic updates.
          const commentIds = comments.map((comment) => comment.id);
          const reactionsData = await todoReactionsApi.getReactions(commentIds);
          setReactions(reactionsData);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`📢 Subscribed to reactions channel: reactions-${todoId}`);
        }
      });

    return () => {
      console.log(`👋 Unsubscribing from reactions channel: reactions-${todoId}`);
      supabase.removeChannel(channel);
    };
  }, [comments, todoId, currentUser]); // Dependencies updated for correctness

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
      
      // Load attachments for all comments
      const attachmentPromises = commentsData.map(comment => 
        todoAttachmentsApi.getCommentAttachmentsNew(comment.id)
      );
      const attachmentResults = await Promise.all(attachmentPromises);
      
      // Build attachments mapping
      const attachmentsMap: Record<string, any[]> = {};
      commentsData.forEach((comment, index) => {
        if (attachmentResults[index] && attachmentResults[index].length > 0) {
          attachmentsMap[comment.id] = attachmentResults[index];
        }
      });
      setAttachments(attachmentsMap);
      
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
      
      // Load reactions for comments
      if (commentsData && commentsData.length > 0) {
        const commentIds = commentsData.map(comment => comment.id);
        const reactionsData = await todoReactionsApi.getReactions(commentIds);
        setReactions(reactionsData);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      if (initialLoad) {
        setLoading(false);
      }
    }
  };

  const handleReaction = async (commentId: string, emoji: string) => {
    const supabase = createClient();
    
    try {
      const commentReactions = reactions[commentId] || [];
      const existingReaction = commentReactions.find(r => r.emoji === emoji);
      const userHasReacted = existingReaction?.users.includes(currentUser);

      // OPTIMISTIC UPDATE - Update UI immediately
      if (userHasReacted) {
        // Remove reaction optimistically
        const updatedUsers = existingReaction.users.filter(email => email !== currentUser);
        if (updatedUsers.length === 0) {
          // Remove entire reaction if no users left
          setReactions(prev => ({
            ...prev,
            [commentId]: commentReactions.filter(r => r.emoji !== emoji)
          }));
        } else {
          // Update users list
          setReactions(prev => ({
            ...prev,
            [commentId]: commentReactions.map(r => 
              r.emoji === emoji ? { ...r, users: updatedUsers, count: updatedUsers.length } : r
            )
          }));
        }
        
        // Then update database
        await todoReactionsApi.removeReaction(commentId, emoji, currentUser);
      } else {
        // Add reaction optimistically
        const newReactions = [...commentReactions];
        if (existingReaction) {
          // Add user to existing reaction
          const updatedUsers = [...existingReaction.users, currentUser];
          newReactions.forEach(r => {
            if (r.emoji === emoji) {
              r.users = updatedUsers;
              r.count = updatedUsers.length;
            }
          });
        } else {
          // Create new reaction
          newReactions.push({
            emoji,
            users: [currentUser],
            count: 1
          });
        }
        
        setReactions(prev => ({
          ...prev,
          [commentId]: newReactions
        }));
        
        // Then update database
        await todoReactionsApi.addReaction(commentId, emoji, currentUser);
      }

      // BROADCAST to other users immediately using the unified channel
      const channel = supabase.channel(`reactions-${todoId}`);
      channel.send({
        type: 'broadcast',
        event: 'reaction_update',
        payload: { 
          commentId, 
          emoji, 
          userEmail: currentUser, 
          action: userHasReacted ? 'remove' : 'add',
          timestamp: Date.now(),
          // Add a unique ID to prevent the sender from processing their own broadcast
          senderId: currentUser 
        }
      });

    } catch (error) {
      console.error('Failed to handle reaction:', error);
      // Revert optimistic update on error by refreshing reactions
      const commentIds = comments.map(c => c.id);
      const reactionsData = await todoReactionsApi.getReactions(commentIds);
      setReactions(reactionsData);
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
      setPendingFiles([]);
      
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

      // Upload files if any
      if (pendingFiles.length > 0) {
        try {
          setUploadingFiles(true);
          const uploadPromises = pendingFiles.map(file => 
            todoAttachmentsApi.uploadFile(file, savedComment.id, currentUser)
          );
          
          const uploadedAttachments = await Promise.all(uploadPromises);
          
          // Store attachments for rendering
          setAttachments(prev => ({
            ...prev,
            [savedComment.id]: uploadedAttachments
          }));
          
          console.log('Files uploaded successfully:', uploadedAttachments);
        } catch (uploadError) {
          console.error('File upload failed:', uploadError);
          alert('Comment sent but file upload failed. Please try uploading again.');
        } finally {
          setUploadingFiles(false);
          setPendingFiles([]);
        }
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
    let formattedText = text;
    
    // Format URLs as clickable links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    formattedText = formattedText.replace(urlRegex, 
      '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: #00d4ff; text-decoration: underline;">$1</a>'
    );
    
    // Handle mentions
    if (mentions && Array.isArray(mentions) && mentions.length > 0) {
      mentions.forEach(email => {
        const member = teamMembers.find(m => m.email === email);
        if (member) {
          const pattern = new RegExp(`@${member.name}`, 'g');
          formattedText = formattedText.replace(pattern, 
            `<span style="color: #00ff88; background: rgba(0, 255, 136, 0.1); padding: 0.125rem 0.25rem; border-radius: 4px; font-weight: 500;">@${member.name}</span>`
          );
        }
      });
    }

    return formattedText;
  };

  const getDayLabel = (dateString: string) => {
    const now = new Date();
    const messageDate = new Date(dateString);
    
    // Reset time to midnight for proper day comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
    
    const diffInDays = Math.floor((today.getTime() - msgDay.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) {
      return messageDate.toLocaleDateString('en-US', { weekday: 'long' });
    }
    return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getTimeDisplay = (dateString: string) => {
    // For WhatsApp style, just show time in HH:MM format
    const commentDate = new Date(dateString);
    return commentDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    });
  };

  // File upload functionality
  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Store files for sending with the comment
    setPendingFiles(Array.from(files));
    
    // Show file names in input
    const fileNames = Array.from(files).map(file => file.name).join(', ');
    setNewComment(prev => prev + `📎 ${fileNames} `);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Emoji picker functionality
  const commonEmojis = ['😀', '😂', '🥰', '😍', '🤔', '👍', '👎', '❤️', '🎉', '🔥', '💯', '👌', '🚀', '💪', '🙏', '😎', '🤝', '💡', '⚡', '🎯'];

  const insertEmoji = (emoji: string) => {
    setNewComment(prev => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  if (loading && initialLoad) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '700px',
        maxHeight: '700px',
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
                maxWidth: '85%',
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
      height: '700px', // Fixed height for single frame
      maxHeight: '700px',
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
          comments.map((comment, index) => {
            const isMyComment = comment.comment_by === currentUser;
            const member = teamMembers.find(m => m.email === comment.comment_by);
            
            // Check if we need to show a day stamp
            const showDayStamp = index === 0 || 
              getDayLabel(comment.created_at) !== getDayLabel(comments[index - 1].created_at);
            
            return (
              <React.Fragment key={comment.id}>
                {/* Day Stamp */}
                {showDayStamp && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    margin: '1rem 0 0.5rem 0'
                  }}>
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '0.7rem',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontWeight: 500
                    }}>
                      {getDayLabel(comment.created_at)}
                    </div>
                  </div>
                )}
                
                {/* Message */}
              <div
                key={comment.id}
                style={{
                  display: 'flex',
                  justifyContent: isMyComment ? 'flex-end' : 'flex-start',
                  marginBottom: '0.5rem', // More compact spacing between comments
                  position: 'relative'
                }}
                onMouseEnter={() => setHoveredMessage(comment.id)}
                onMouseLeave={() => setHoveredMessage(null)}
              >
                <div style={{
                  maxWidth: '85%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMyComment ? 'flex-end' : 'flex-start'
                }}>
                  {/* WhatsApp Style Comment Bubble */}
                  <div style={{
                    position: 'relative',
                    transition: 'all 0.3s ease',
                    background: isMyComment ? '#005c4b' : '#262626', // WhatsApp green for sent, proper gray for received
                    border: 'none',
                    borderRadius: '18px',
                    padding: '0.5rem 0.75rem',
                    maxWidth: '75%',
                    minWidth: 'fit-content',
                    alignSelf: isMyComment ? 'flex-end' : 'flex-start',
                    marginBottom: '0.25rem',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
                  }}>
                    <div style={{
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '0.875rem',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap'
                    }}>
                      <span 
                        dangerouslySetInnerHTML={{
                          __html: formatCommentText(comment.comment, comment.mentions || []) + 
                            `<span style="color: rgba(255, 255, 255, 0.5); font-size: 0.65rem; font-weight: 400; margin-left: 0.5rem;">&nbsp;${getTimeDisplay(comment.created_at)}</span>`
                        }}
                      />
                    </div>

                    {/* Attachments */}
                    {attachments[comment.id] && attachments[comment.id].length > 0 && (
                      <div style={{
                        marginTop: '0.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}>
                        {attachments[comment.id].map((attachment) => (
                          <div 
                            key={attachment.id}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              todoAttachmentsApi.downloadAttachment(attachment.file_url, attachment.file_name);
                            }}
                            style={{ cursor: 'context-menu' }}
                            title="Right-click to download"
                          >
                            {attachment.file_type.startsWith('image/') ? (
                              // Image Preview
                              <div style={{
                                borderRadius: '12px',
                                overflow: 'hidden',
                                maxWidth: '300px',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                position: 'relative'
                              }}>
                                <img
                                  src={attachment.file_url}
                                  alt={attachment.file_name}
                                  style={{
                                    width: '100%',
                                    height: 'auto',
                                    display: 'block'
                                  }}
                                />
                                {/* Download indicator */}
                                <div style={{
                                  position: 'absolute',
                                  top: '0.5rem',
                                  right: '0.5rem',
                                  background: 'rgba(0, 0, 0, 0.7)',
                                  borderRadius: '50%',
                                  width: '24px',
                                  height: '24px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  opacity: 0.7
                                }}>
                                  <span style={{ fontSize: '0.75rem' }}>⬇️</span>
                                </div>
                              </div>
                            ) : (
                              // File Preview
                              <div style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                padding: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                maxWidth: '300px',
                                transition: 'background-color 0.2s ease',
                                position: 'relative'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                              }}
                              >
                                {/* File Icon */}
                                <div style={{
                                  width: '48px',
                                  height: '48px',
                                  borderRadius: '8px',
                                  background: attachment.file_type.includes('pdf') ? '#ef4444' : 
                                             attachment.file_type.includes('doc') ? '#3b82f6' :
                                             attachment.file_type.includes('sheet') ? '#10b981' : '#8b5cf6',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#ffffff',
                                  fontSize: '0.75rem',
                                  fontWeight: '600'
                                }}>
                                  {attachment.file_type.includes('pdf') ? 'PDF' :
                                   attachment.file_type.includes('doc') ? 'DOC' :
                                   attachment.file_type.includes('sheet') || attachment.file_type.includes('csv') ? 'XLS' :
                                   attachment.file_extension.toUpperCase()}
                                </div>
                                
                                {/* File Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    color: '#ffffff',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    marginBottom: '0.25rem',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {attachment.file_name}
                                  </div>
                                  <div style={{
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    fontSize: '0.75rem'
                                  }}>
                                    {(attachment.file_size / 1024).toFixed(1)} KB • {attachment.file_extension}
                                  </div>
                                </div>

                                {/* Download icon */}
                                <div style={{
                                  color: 'rgba(255, 255, 255, 0.6)',
                                  fontSize: '1.2rem'
                                }}>
                                  ⬇️
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Instagram-Style React Icon - Only on Hover */}
                    {hoveredMessage === comment.id && (
                      <div
                        data-reaction-picker
                        style={{
                          position: 'absolute',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          right: isMyComment ? 'calc(100% + 0.5rem)' : 'auto',
                          left: isMyComment ? 'auto' : 'calc(100% + 0.5rem)',
                          zIndex: 10
                        }}>
                        <button
                          onClick={() => setShowReactionPicker(
                            showReactionPicker === comment.id ? null : comment.id
                          )}
                          style={{
                            background: 'rgba(0, 0, 0, 0.8)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            borderRadius: '50%',
                            width: '28px',
                            height: '28px',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0.8,
                            backdropFilter: 'blur(4px)' // Re-add backdropFilter
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '1';
                            e.currentTarget.style.transform = 'scale(1.1)';
                            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.9)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '0.8';
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)';
                          }}
                          title="React to this message"
                        >
                          ☺️
                        </button>
                        
                        {/* Expandable Emoji Picker */}
                        {showReactionPicker === comment.id && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '-3.5rem',
                              left: isMyComment ? 'auto' : '0',
                              right: isMyComment ? '0' : 'auto',
                              background: 'rgba(0, 0, 0, 0.9)',
                              backdropFilter: 'blur(10px)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              borderRadius: '16px',
                              padding: '0.5rem',
                              display: 'flex',
                              gap: '0.25rem',
                              zIndex: 1000,
                              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
                            }}
                          >
                            {['👍', '😂', '❤️', '🙏', '🔥'].map(emoji => ( // 5 common emojis
                              <button
                                key={emoji}
                                onClick={() => {
                                  handleReaction(comment.id, emoji);
                                  setShowReactionPicker(null);
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  borderRadius: '8px',
                                  padding: '0.375rem',
                                  fontSize: '1.1rem',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                  e.currentTarget.style.transform = 'scale(1.2)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'transparent';
                                  e.currentTarget.style.transform = 'scale(1)';
                                }}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Active Reactions Display - Instagram Style (Bottom Right Corner) */}
                {(() => {
                  const commentReactions = reactions[comment.id] || [];
                  const activeReactions = commentReactions.filter(r => r.count > 0);
                  
                  if (activeReactions.length === 0) return null;
                  
                  return (
                    <div style={{
                      position: 'absolute',
                      bottom: '-8px',
                      right: isMyComment ? '8px' : 'auto',
                      left: isMyComment ? 'auto' : '8px',
                      display: 'flex',
                      gap: '0.25rem',
                      flexWrap: 'wrap',
                      zIndex: 5
                    }}>
                      {activeReactions.map(reactionData => {
                        const userHasReacted = reactionData.users.includes(currentUser);
                        return (
                          <button
                            key={reactionData.emoji}
                            onClick={() => handleReaction(comment.id, reactionData.emoji)}
                            style={{
                              background: 'rgba(0, 0, 0, 0.8)',
                              border: '1px solid rgba(255, 255, 255, 0.3)',
                              borderRadius: '12px',
                              padding: '0.25rem 0.4rem',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              color: '#ffffff',
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.05)';
                              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.9)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)';
                            }}
                            title={`${reactionData.users.join(', ')} reacted with ${reactionData.emoji}`}
                          >
                            {reactionData.emoji}
                            <span style={{ fontSize: '0.6rem', fontWeight: '600' }}>
                              {reactionData.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
              </React.Fragment>
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
                maxWidth: '85%',
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
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            {/* Attachment Button */}
            <button
              type="button"
              onClick={handleFileUpload}
              disabled={uploadingFiles}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: 'rgba(255, 255, 255, 0.7)',
                cursor: uploadingFiles ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                opacity: uploadingFiles ? 0.5 : 1
              }}
              title="Attach files or images"
            >
              {uploadingFiles ? '⏳' : '+'}
            </button>

            <div style={{
              flex: 1,
              position: 'relative'
            }}>
              <textarea
                ref={textareaRef}
                value={newComment}
                onChange={handleTextareaChange}
                placeholder="Type a message..."
                rows={1}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '24px',
                  padding: '0.75rem 3rem 0.75rem 1rem',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  resize: 'none',
                  outline: 'none',
                  minHeight: '48px',
                  maxHeight: '120px',
                  lineHeight: '1.4'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (newComment.trim()) {
                      handleCommentSubmit(e);
                    }
                  }
                }}
              />
              
              {/* Emoji Picker Button */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.6)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem'
                }}
                title="Add emoji"
              >
                ☺️
              </button>

              {/* Emoji Picker Dropdown */}
              {showEmojiPicker && (
                <div 
                  data-emoji-picker
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    right: '0.75rem',
                    marginBottom: '0.5rem',
                    background: 'rgba(0, 0, 0, 0.9)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    padding: '0.75rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: '0.5rem',
                    minWidth: '200px',
                    maxHeight: '150px',
                    overflowY: 'auto',
                    zIndex: 1000
                  }}>
                  {commonEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        background: 'transparent',
                        border: 'none',
                        fontSize: '1.2rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
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