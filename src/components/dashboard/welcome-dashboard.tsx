'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-nextauth';
import { useTheme } from '@/contexts/ThemeContext';
import styles from './welcome-dashboard.module.css';

interface User {
  name?: string;
  email?: string;
  image?: string;
  role?: string;
}

interface Task {
  id: string;
  name: string;
  project: string;
  dueDate: string;
  status: 'completed' | 'in-progress' | 'pending';
  priority: 'high' | 'medium' | 'low';
  priorityColor: string;
}

interface WelcomeDashboardProps {
  user?: User | null;
}

export function WelcomeDashboard({ user: propUser }: WelcomeDashboardProps = {}) {
  const { user: authUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const user = propUser || authUser;
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Mock task data - in real implementation, this would come from API
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      name: 'Finalize Q3 Marketing Report',
      project: 'Marketing',
      dueDate: 'Oct 25, 2023',
      status: 'in-progress',
      priority: 'high',
      priorityColor: '#EF4444'
    },
    {
      id: '2',
      name: 'Design new homepage mockups',
      project: 'Website Redesign',
      dueDate: 'Oct 28, 2023',
      status: 'pending',
      priority: 'medium',
      priorityColor: '#F59E0B'
    },
    {
      id: '3',
      name: 'Develop API for user authentication',
      project: 'Mobile App',
      dueDate: 'Nov 02, 2023',
      status: 'completed',
      priority: 'high',
      priorityColor: '#10B981'
    },
    {
      id: '4',
      name: 'Review and approve budget proposal',
      project: 'Finance',
      dueDate: 'Nov 05, 2023',
      status: 'pending',
      priority: 'medium',
      priorityColor: '#F59E0B'
    },
    {
      id: '5',
      name: 'Onboard new junior developer',
      project: 'Team Management',
      dueDate: 'Nov 10, 2023',
      status: 'pending',
      priority: 'low',
      priorityColor: '#6B7280'
    }
  ]);

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'completed':
        return { text: 'Completed', class: 'statusCompleted' };
      case 'in-progress':
        return { text: 'In Progress', class: 'statusInProgress' };
      case 'pending':
        return { text: 'Pending', class: 'statusPending' };
      default:
        return { text: 'Pending', class: 'statusPending' };
    }
  };

  const getPriorityDisplay = (priority: string, color: string) => {
    const priorityConfig = {
      high: { text: 'High', icon: 'trending_up', color: '#EF4444' },
      medium: { text: 'Medium', icon: 'trending_flat', color: '#F59E0B' },
      low: { text: 'Low', icon: 'trending_down', color: '#6B7280' }
    };
    
    return {
      ...priorityConfig[priority as keyof typeof priorityConfig],
      originalColor: color
    };
  };

  const handleNewTask = () => {
    // TODO: Implement new task creation
    console.log('New task creation');
  };

  const handleTaskAction = (taskId: string) => {
    // TODO: Implement task actions
    console.log('Task action for:', taskId);
  };

  const getUserDisplayName = () => {
    return user?.name?.split(' ')[0] || 'User';
  };

  const filteredTasks = tasks.filter(task => 
    task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.project.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`${styles.container} ${theme === 'dark' ? styles.dark : ''}`}>
      {/* Header Section */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          {user?.image ? (
            <img
              src={user.image}
              alt="User avatar"
              className={styles.userAvatar}
            />
          ) : (
            <div className={styles.userAvatarPlaceholder}>
              <span className="material-symbols-outlined">person</span>
            </div>
          )}
          <div className={styles.welcomeText}>
            <h1 className={styles.welcomeTitle}>
              Welcome Back, {getUserDisplayName()}!
            </h1>
            <p className={styles.welcomeSubtitle}>
              You have {tasks.filter(t => t.status !== 'completed').length} tasks to complete today. Good luck!
            </p>
          </div>
        </div>
        
        <div className={styles.headerActions}>
          <div className={styles.searchContainer}>
            <span className="material-symbols-outlined">search</span>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <button className={styles.notificationButton}>
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className={styles.quickActionButton}>
            <span className="material-symbols-outlined">add</span>
            Quick Actions
          </button>
          <button onClick={toggleTheme} className={styles.themeToggleButton}>
            <span className="material-symbols-outlined">{theme === 'light' ? 'dark_mode' : 'light_mode'}</span>
          </button>
        </div>
      </header>

      {/* Task Table Section */}
      <section className={styles.taskSection}>
        <div className={styles.taskHeader}>
          <h2 className={styles.taskTitle}>Current Tasks ({filteredTasks.length})</h2>
          <div className={styles.taskActions}>
            <button 
              className={styles.filterButton}
              onClick={() => setShowFilters(!showFilters)}
            >
              <span className="material-symbols-outlined small">filter_list</span>
              Filter
            </button>
            <button 
              className={styles.newTaskButton}
              onClick={handleNewTask}
            >
              <span className="material-symbols-outlined small">add</span>
              New Task
            </button>
          </div>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.taskTable}>
            <thead>
              <tr>
                <th>Task Name</th>
                <th>Project</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Priority</th>
                <th className={styles.actionsColumn}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => {
                const status = getStatusDisplay(task.status);
                const priority = getPriorityDisplay(task.priority, task.priorityColor);
                
                return (
                  <tr key={task.id} className={styles.taskRow}>
                    <td className={styles.taskNameCell}>
                      <div className={styles.taskNameContainer}>
                        <div 
                          className={styles.priorityDot}
                          style={{ backgroundColor: task.priorityColor }}
                        ></div>
                        <span className={styles.taskName}>{task.name}</span>
                      </div>
                    </td>
                    <td className={styles.projectCell}>{task.project}</td>
                    <td className={styles.dueDateCell}>{task.dueDate}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[status.class]}`}>
                        {status.text}
                      </span>
                    </td>
                    <td>
                      <span 
                        className={styles.priority}
                        style={{ color: priority.color }}
                      >
                        <span className="material-symbols-outlined small">
                          {priority.icon}
                        </span>
                        {priority.text}
                      </span>
                    </td>
                    <td className={styles.actionsCell}>
                      <button 
                        className={styles.actionButton}
                        onClick={() => handleTaskAction(task.id)}
                      >
                        <span className="material-symbols-outlined small">more_horiz</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}