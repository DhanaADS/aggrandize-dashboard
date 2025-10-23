'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TodoComment, TeamMember } from '@/types/todos';
import { todoCommentsApi } from '@/lib/todos-api';
import { useAuth } from '@/lib/auth-nextauth';
import styles from '@/app/dashboard/teamhub/teamhub.module.css';

// --- SUB-COMPONENTS ---

const MessageBubble = ({ comment, member, isOwnMessage }: { comment: TodoComment; member?: TeamMember; isOwnMessage: boolean }) => (
  <div className={`${styles.messageBubbleContainer} ${isOwnMessage ? styles.messageBubbleOwn : ''}`}>
    <div className={styles.messageBubbleAvatar}>{member?.name?.charAt(0) || '?'}</div>
    <div className={`${styles.messageBubble} ${isOwnMessage ? styles.messageBubbleOwnText : ''}`}>
      <div className={styles.messageBubbleText}>{comment.comment}</div>
      <div className={styles.messageBubbleTime}>{new Date(comment.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
    </div>
  </div>
);

const ChatInput = ({ onSend }: { onSend: (text: string) => void }) => {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim()) {
      onSend(text.trim());
      setText('');
    }
  };

  return (
    <div className={styles.chatInputContainer}>
      <input
        type="text"
        className={styles.chatInput}
        placeholder="Type a message..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
      />
      <button className={styles.sendButton} onClick={handleSend} aria-label="Send message">
        →
      </button>
    </div>
  );
};

// --- MAIN COMPONENT ---

export default function CommentThread({ todoId, onNewComment, actions }: { todoId: string; onNewComment?: () => void; actions?: React.ReactNode }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<TodoComment[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!todoId) return;
      setLoading(true);
      try {
        const [commentsData, membersData] = await Promise.all([
          todoCommentsApi.getComments(todoId),
          (await import('@/lib/team-members-api')).getTeamMembersCached(),
        ]);
        setComments(commentsData);
        setTeamMembers(membersData);
      } catch (error) {
        console.error('Failed to load comment thread data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [todoId]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handleSendComment = async (text: string) => {
    if (!user?.email) return;
    const optimisticComment: TodoComment = {
      id: `temp-${Date.now()}`,
      todo_id: todoId,
      comment: text,
      comment_by: user.email,
      created_at: new Date().toISOString(),
    };
    setComments((prev) => [...prev, optimisticComment]);
    try {
      await todoCommentsApi.addComment(todoId, text, user.email);
      if (onNewComment) onNewComment();
    } catch (error) {
      console.error('Failed to send comment:', error);
      setComments((prev) => prev.filter((c) => c.id !== optimisticComment.id));
    }
  };

  return (
    <div className={styles.commentThreadContainer}>
      <div className={styles.commentsArea}>
        {loading ? (
          <div className={styles.loadingState}>Loading messages...</div>
        ) : comments.length === 0 ? (
          <div className={styles.emptyComments}>No messages yet. Start a conversation!</div>
        ) : (
          comments.map((comment) => (
            <MessageBubble
              key={comment.id}
              comment={comment}
              member={teamMembers.find((m) => m.email === comment.comment_by)}
              isOwnMessage={comment.comment_by === user?.email}
            />
          ))
        )}
        <div ref={commentsEndRef} />
      </div>
      <div className={styles.inputArea}>
        {actions ? <div className={styles.actionsArea}>{actions}</div> : <ChatInput onSend={handleSendComment} />}
      </div>
    </div>
  );
}
