/**
 * Test Data Fixtures
 * Mock data for TeamHub PWA testing
 */

export interface TestUser {
  email: string;
  name: string;
  role: 'admin' | 'marketing' | 'processing';
  password?: string;
}

export interface TestTodo {
  id: string;
  title: string;
  description: string;
  created_by: string;
  assigned_to: string;
  assigned_to_array: string[];
  category: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'assigned' | 'in_progress' | 'pending_approval' | 'done';
  progress: number;
  due_date: string | null;
  start_date: string;
  tags: string[];
  is_team_todo: boolean;
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
}

export interface TestMessage {
  id: string;
  todo_id: string;
  comment_by: string;
  comment: string;
  created_at: string;
  attachments?: string[];
  reactions?: { emoji: string; users: string[] }[];
}

// Test Users
export const TEST_USERS: TestUser[] = [
  {
    email: 'dhana@aggrandizedigital.com',
    name: 'Dhana',
    role: 'admin',
    password: 'test123'
  },
  {
    email: 'veera@aggrandizedigital.com',
    name: 'Veera',
    role: 'marketing',
    password: 'test123'
  },
  {
    email: 'saravana@aggrandizedigital.com',
    name: 'Saravana',
    role: 'marketing',
    password: 'test123'
  },
  {
    email: 'saran@aggrandizedigital.com',
    name: 'Saran',
    role: 'marketing',
    password: 'test123'
  },
  {
    email: 'abbas@aggrandizedigital.com',
    name: 'Abbas',
    role: 'processing',
    password: 'test123'
  },
  {
    email: 'gokul@aggrandizedigital.com',
    name: 'Gokul',
    role: 'processing',
    password: 'test123'
  }
];

// Test Tasks
export const TEST_TODOS: TestTodo[] = [
  {
    id: 'test-todo-1',
    title: 'Review marketing strategy',
    description: 'Complete analysis of Q4 marketing campaigns and prepare recommendations',
    created_by: 'dhana@aggrandizedigital.com',
    assigned_to: 'veera@aggrandizedigital.com',
    assigned_to_array: ['veera@aggrandizedigital.com'],
    category: 'work',
    priority: 'high',
    status: 'in_progress',
    progress: 65,
    due_date: '2025-08-25T10:00:00Z',
    start_date: '2025-08-20T09:00:00Z',
    tags: ['marketing', 'urgent'],
    is_team_todo: true,
    is_recurring: false,
    created_at: '2025-08-20T09:00:00Z',
    updated_at: '2025-08-23T14:30:00Z'
  },
  {
    id: 'test-todo-2',
    title: 'Update inventory system',
    description: 'Add new product categories and update stock levels',
    created_by: 'dhana@aggrandizedigital.com',
    assigned_to: 'abbas@aggrandizedigital.com',
    assigned_to_array: ['abbas@aggrandizedigital.com', 'gokul@aggrandizedigital.com'],
    category: 'feature',
    priority: 'medium',
    status: 'assigned',
    progress: 0,
    due_date: '2025-08-30T17:00:00Z',
    start_date: '2025-08-23T09:00:00Z',
    tags: ['inventory', 'system'],
    is_team_todo: true,
    is_recurring: false,
    created_at: '2025-08-23T09:00:00Z',
    updated_at: '2025-08-23T09:00:00Z'
  },
  {
    id: 'test-todo-3',
    title: 'Client presentation ready',
    description: 'Prepare slides for upcoming client meeting next week',
    created_by: 'veera@aggrandizedigital.com',
    assigned_to: 'saran@aggrandizedigital.com',
    assigned_to_array: ['saran@aggrandizedigital.com'],
    category: 'meeting',
    priority: 'urgent',
    status: 'pending_approval',
    progress: 90,
    due_date: '2025-08-26T14:00:00Z',
    start_date: '2025-08-22T10:00:00Z',
    tags: ['presentation', 'client'],
    is_team_todo: true,
    is_recurring: false,
    created_at: '2025-08-22T10:00:00Z',
    updated_at: '2025-08-23T12:00:00Z'
  },
  {
    id: 'test-todo-4',
    title: 'Website bug fixes',
    description: 'Fix responsive issues on mobile devices',
    created_by: 'dhana@aggrandizedigital.com',
    assigned_to: 'dhana@aggrandizedigital.com',
    assigned_to_array: ['dhana@aggrandizedigital.com'],
    category: 'bug',
    priority: 'high',
    status: 'done',
    progress: 100,
    due_date: '2025-08-24T18:00:00Z',
    start_date: '2025-08-23T08:00:00Z',
    tags: ['website', 'mobile', 'bug'],
    is_team_todo: false,
    is_recurring: false,
    created_at: '2025-08-23T08:00:00Z',
    updated_at: '2025-08-23T16:00:00Z'
  }
];

// Test Messages
export const TEST_MESSAGES: TestMessage[] = [
  {
    id: 'msg-1',
    todo_id: 'test-todo-1',
    comment_by: 'dhana@aggrandizedigital.com',
    comment: 'Hey Veera, can you provide an update on the marketing analysis?',
    created_at: '2025-08-23T10:00:00Z'
  },
  {
    id: 'msg-2',
    todo_id: 'test-todo-1',
    comment_by: 'veera@aggrandizedigital.com',
    comment: 'Sure! I\'ve completed 65% of the analysis. The Q3 campaigns performed better than expected.',
    created_at: '2025-08-23T10:15:00Z'
  },
  {
    id: 'msg-3',
    todo_id: 'test-todo-1',
    comment_by: 'dhana@aggrandizedigital.com',
    comment: 'Great work! 👍',
    created_at: '2025-08-23T10:16:00Z',
    reactions: [
      { emoji: '👍', users: ['veera@aggrandizedigital.com'] }
    ]
  }
];

// Helper functions for test data
export class TestDataHelper {
  /**
   * Get a test user by role
   */
  static getUserByRole(role: TestUser['role']): TestUser {
    const user = TEST_USERS.find(u => u.role === role);
    if (!user) throw new Error(`No test user found with role: ${role}`);
    return user;
  }

  /**
   * Get admin test user
   */
  static getAdminUser(): TestUser {
    return this.getUserByRole('admin');
  }

  /**
   * Get marketing test user
   */
  static getMarketingUser(): TestUser {
    return this.getUserByRole('marketing');
  }

  /**
   * Get processing test user
   */
  static getProcessingUser(): TestUser {
    return this.getUserByRole('processing');
  }

  /**
   * Get todos assigned to a specific user
   */
  static getTodosForUser(userEmail: string): TestTodo[] {
    return TEST_TODOS.filter(todo => 
      todo.created_by === userEmail ||
      todo.assigned_to === userEmail ||
      todo.assigned_to_array.includes(userEmail)
    );
  }

  /**
   * Get todos by status
   */
  static getTodosByStatus(status: TestTodo['status']): TestTodo[] {
    return TEST_TODOS.filter(todo => todo.status === status);
  }

  /**
   * Get active todos (not completed)
   */
  static getActiveTodos(): TestTodo[] {
    return TEST_TODOS.filter(todo => todo.status !== 'done');
  }

  /**
   * Get completed todos
   */
  static getCompletedTodos(): TestTodo[] {
    return TEST_TODOS.filter(todo => todo.status === 'done');
  }

  /**
   * Get urgent todos
   */
  static getUrgentTodos(): TestTodo[] {
    return TEST_TODOS.filter(todo => 
      todo.priority === 'urgent' || todo.priority === 'high'
    );
  }

  /**
   * Get overdue todos
   */
  static getOverdueTodos(): TestTodo[] {
    const now = new Date();
    return TEST_TODOS.filter(todo => {
      if (!todo.due_date) return false;
      return new Date(todo.due_date) < now && todo.status !== 'done';
    });
  }

  /**
   * Get messages for a specific todo
   */
  static getMessagesForTodo(todoId: string): TestMessage[] {
    return TEST_MESSAGES.filter(msg => msg.todo_id === todoId);
  }

  /**
   * Create a new test todo
   */
  static createTestTodo(overrides: Partial<TestTodo> = {}): TestTodo {
    const baseId = Date.now().toString();
    return {
      id: `test-todo-${baseId}`,
      title: `Test Task ${baseId}`,
      description: 'This is a test task for automated testing',
      created_by: 'dhana@aggrandizedigital.com',
      assigned_to: 'veera@aggrandizedigital.com',
      assigned_to_array: ['veera@aggrandizedigital.com'],
      category: 'general',
      priority: 'medium',
      status: 'assigned',
      progress: 0,
      due_date: null,
      start_date: new Date().toISOString(),
      tags: ['test'],
      is_team_todo: true,
      is_recurring: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    };
  }
}