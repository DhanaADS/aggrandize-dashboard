// AGGRANDIZE Team Hub - Push Notification Service
// Social Media Style Notifications: Task Assigned, Comments, Status Changes, Mentions

interface NotificationData {
  taskId?: string;
  taskTitle?: string;
  assignedBy?: string;
  commenter?: string;
  mentioner?: string;
  completer?: string;
  url?: string;
  [key: string]: any;
}

interface PushNotificationOptions {
  userEmail: string;
  type: 'task_assigned' | 'new_comment' | 'task_status_change' | 'mention';
  data: NotificationData;
  skipSelf?: string; // Skip notification if same as this email (avoid self-notifications)
}

class PushNotificationService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  }

  // 📋 Task Assignment Notification
  async sendTaskAssignedNotification({
    userEmail,
    data,
    skipSelf
  }: {
    userEmail: string;
    data: NotificationData;
    skipSelf?: string;
  }) {
    if (skipSelf && userEmail === skipSelf) {
      console.log(`⏭️ Skipping self-notification for task assignment to ${userEmail}`);
      return { success: true, skipped: true };
    }

    const payload = {
      title: `📋 New Task: ${data.taskTitle}`,
      body: `Assigned by ${data.assignedBy || 'Team'}`,
      tag: 'task_assigned',
      data: {
        taskId: data.taskId,
        url: data.taskId ? `/dashboard/teamhub?task=${data.taskId}` : '/dashboard/teamhub',
        type: 'task_assigned' as const,
        assignedBy: data.assignedBy
      },
      actions: [
        { action: 'view-task', title: 'View Task' },
        { action: 'complete-task', title: 'Mark Complete' }
      ]
    };

    return this.sendNotification({
      userEmail,
      type: 'task_assigned',
      data,
      payload
    });
  }

  // 💬 New Comment Notification
  async sendNewCommentNotification({
    userEmail,
    data,
    skipSelf
  }: {
    userEmail: string;
    data: NotificationData;
    skipSelf?: string;
  }) {
    if (skipSelf && userEmail === skipSelf) {
      console.log(`⏭️ Skipping self-notification for comment from ${userEmail}`);
      return { success: true, skipped: true };
    }

    const commenterName = data.commenter?.split('@')[0] || 'Someone';
    const taskTitle = data.taskTitle || 'your task';

    const payload = {
      title: `💬 New Comment`,
      body: `${commenterName} commented on "${taskTitle}"`,
      tag: 'new_comment',
      data: {
        taskId: data.taskId,
        url: data.taskId ? `/dashboard/teamhub?task=${data.taskId}` : '/dashboard/teamhub',
        type: 'new_comment' as const,
        commenter: data.commenter
      },
      actions: [
        { action: 'view-task', title: 'View Comment' },
        { action: 'reply', title: 'Reply' }
      ]
    };

    return this.sendNotification({
      userEmail,
      type: 'new_comment',
      data,
      payload
    });
  }

  // ✅ Task Status Change Notification
  async sendTaskStatusChangeNotification({
    userEmail,
    data,
    skipSelf
  }: {
    userEmail: string;
    data: NotificationData;
    skipSelf?: string;
  }) {
    if (skipSelf && userEmail === skipSelf) {
      console.log(`⏭️ Skipping self-notification for status change by ${userEmail}`);
      return { success: true, skipped: true };
    }

    const completerName = data.completer?.split('@')[0] || 'Someone';
    const taskTitle = data.taskTitle || 'Task';
    const isCompleted = data.newStatus === 'completed';

    const payload = {
      title: isCompleted ? `✅ Task Completed` : `🔄 Task Status Changed`,
      body: isCompleted 
        ? `${completerName} completed "${taskTitle}"`
        : `${completerName} updated "${taskTitle}"`,
      tag: 'task_status_change',
      data: {
        taskId: data.taskId,
        url: data.taskId ? `/dashboard/teamhub?task=${data.taskId}` : '/dashboard/teamhub',
        type: 'task_status_change' as const,
        completer: data.completer,
        newStatus: data.newStatus
      },
      actions: [
        { action: 'view-task', title: 'View Task' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    };

    return this.sendNotification({
      userEmail,
      type: 'task_status_change',
      data,
      payload
    });
  }

  // 🏷️ Mention Notification
  async sendMentionNotification({
    userEmail,
    data,
    skipSelf
  }: {
    userEmail: string;
    data: NotificationData;
    skipSelf?: string;
  }) {
    if (skipSelf && userEmail === skipSelf) {
      console.log(`⏭️ Skipping self-mention notification for ${userEmail}`);
      return { success: true, skipped: true };
    }

    const mentionerName = data.mentioner?.split('@')[0] || 'Someone';
    const taskTitle = data.taskTitle || 'a task';

    const payload = {
      title: `🏷️ You were mentioned`,
      body: `${mentionerName} mentioned you in "${taskTitle}"`,
      tag: 'mention',
      data: {
        taskId: data.taskId,
        url: data.taskId ? `/dashboard/teamhub?task=${data.taskId}` : '/dashboard/teamhub',
        type: 'mention' as const,
        mentioner: data.mentioner
      },
      actions: [
        { action: 'view-task', title: 'View Mention' },
        { action: 'reply', title: 'Reply' }
      ]
    };

    return this.sendNotification({
      userEmail,
      type: 'mention',
      data,
      payload
    });
  }

  // Core notification sender
  private async sendNotification({
    userEmail,
    type,
    data,
    payload
  }: {
    userEmail: string;
    type: 'task_assigned' | 'new_comment' | 'task_status_change' | 'mention';
    data: NotificationData;
    payload: any;
  }) {
    try {
      const response = await fetch(`${this.baseUrl}/api/push/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail,
          notificationType: type,
          payload
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error(`❌ Failed to send ${type} notification to ${userEmail}:`, result.error);
        return { success: false, error: result.error };
      }

      if (result.sentCount > 0) {
        console.log(`✅ ${type} notification sent to ${userEmail} (${result.sentCount} devices)`);
      }

      return {
        success: true,
        sentCount: result.sentCount,
        failedCount: result.failedCount
      };

    } catch (error) {
      console.error(`❌ Error sending ${type} notification to ${userEmail}:`, error);
      return { success: false, error: 'Network error' };
    }
  }

  // Batch send notifications to multiple users (for multi-assignee tasks)
  async sendBatchNotifications(notifications: PushNotificationOptions[]) {
    const results = await Promise.all(
      notifications.map(async (notification) => {
        const { type, userEmail, data, skipSelf } = notification;

        switch (type) {
          case 'task_assigned':
            return this.sendTaskAssignedNotification({ userEmail, data, skipSelf });
          case 'new_comment':
            return this.sendNewCommentNotification({ userEmail, data, skipSelf });
          case 'task_status_change':
            return this.sendTaskStatusChangeNotification({ userEmail, data, skipSelf });
          case 'mention':
            return this.sendMentionNotification({ userEmail, data, skipSelf });
          default:
            console.error(`❌ Unknown notification type: ${type}`);
            return { success: false, error: 'Unknown notification type' };
        }
      })
    );

    return results;
  }

  // Helper method to extract mentions from comment text
  extractMentions(commentText: string): string[] {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const matches = commentText.match(emailRegex);
    return matches || [];
  }

  // Helper method to get team member emails from task
  async getTaskParticipants(taskId: string): Promise<string[]> {
    // This would typically query the database to get all users involved with a task
    // (assignees, creator, commenters, etc.)
    // For now, return empty array as placeholder
    return [];
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();

// Export helper functions for easy use in todos-api.ts
export const NotificationHelpers = {
  // Task assignment notification
  taskAssigned: (assigneeEmail: string, taskTitle: string, assignedBy: string, taskId: string) =>
    pushNotificationService.sendTaskAssignedNotification({
      userEmail: assigneeEmail,
      data: { taskId, taskTitle, assignedBy },
      skipSelf: assignedBy
    }),

  // New comment notification
  newComment: (userEmail: string, taskTitle: string, commenter: string, taskId: string) =>
    pushNotificationService.sendNewCommentNotification({
      userEmail,
      data: { taskId, taskTitle, commenter },
      skipSelf: commenter
    }),

  // Task status change notification
  taskStatusChange: (userEmail: string, taskTitle: string, completer: string, taskId: string, newStatus: string) =>
    pushNotificationService.sendTaskStatusChangeNotification({
      userEmail,
      data: { taskId, taskTitle, completer, newStatus },
      skipSelf: completer
    }),

  // Mention notification
  mention: (userEmail: string, taskTitle: string, mentioner: string, taskId: string) =>
    pushNotificationService.sendMentionNotification({
      userEmail,
      data: { taskId, taskTitle, mentioner },
      skipSelf: mentioner
    }),

  // Extract email mentions from text
  extractMentions: (text: string) => pushNotificationService.extractMentions(text)
};