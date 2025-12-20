/**
 * Umbrel Client Usage Examples
 *
 * This file demonstrates how to use the various Umbrel clients
 * in different scenarios.
 */

import {
  // Direct PostgreSQL client
  query,
  queryOne,
  testConnection,

  // API client
  apiClient,
  createApiClient,

  // Unified client
  determineConnection,
  getConnectionMode,
  getConnectionStatus,
  clearConnectionCache,
  setConnectionMode,

  // Business logic functions
  getExpenses,
  createExpense,
  getSalaries,
  getOrders,
} from './index';

// ============================================
// Example 1: Using Direct PostgreSQL Client
// ============================================

export async function exampleDirectClient() {
  console.log('=== Example 1: Direct PostgreSQL Client ===');

  // Test connection
  const isConnected = await testConnection();
  console.log('Connection status:', isConnected);

  // Raw query
  const result = await query('SELECT * FROM expenses LIMIT 5');
  console.log('Expenses:', result.rows);

  // Query single row
  const expense = await queryOne('SELECT * FROM expenses WHERE id = $1', ['expense-id']);
  console.log('Single expense:', expense);
}

// ============================================
// Example 2: Using API Client
// ============================================

export async function exampleApiClient() {
  console.log('=== Example 2: API Client ===');

  // Health check
  try {
    const health = await apiClient.healthCheck();
    console.log('API Health:', health);
  } catch (error) {
    console.error('API not available:', error);
  }

  // GET request
  const expenses = await apiClient.get('/expenses');
  console.log('Expenses from API:', expenses);

  // POST request
  const newExpense = await apiClient.post('/expenses', {
    amount_inr: 5000,
    category_id: 'cat_123',
    person_paid: 'Dhana',
    purpose: 'Office supplies',
    payment_method_id: 'pm_123',
    expense_date: '2024-12-20',
  });
  console.log('Created expense:', newExpense);

  // PUT request
  const updated = await apiClient.put('/expenses/123', {
    payment_status: 'paid',
  });
  console.log('Updated expense:', updated);

  // DELETE request
  await apiClient.delete('/expenses/123');
  console.log('Deleted expense');
}

// ============================================
// Example 3: Using Unified Client
// ============================================

export async function exampleUnifiedClient() {
  console.log('=== Example 3: Unified Client ===');

  // Get current mode
  const mode = getConnectionMode();
  console.log('Current mode:', mode);

  // Determine which connection to use
  try {
    const connection = await determineConnection();
    console.log('Using connection:', connection);

    // Get detailed status
    const status = getConnectionStatus();
    console.log('Connection status:', status);
  } catch (error) {
    console.error('No connections available:', error);
  }

  // Clear cache to force re-check
  clearConnectionCache();

  // Change mode programmatically
  setConnectionMode('api');
  console.log('Mode changed to API');
}

// ============================================
// Example 4: Using High-Level API Functions
// ============================================

export async function exampleHighLevelApi() {
  console.log('=== Example 4: High-Level API Functions ===');

  // Get filtered expenses
  const expenses = await getExpenses({
    payment_status: 'paid',
    date_from: '2024-01-01',
    date_to: '2024-12-31',
    search: 'office',
  });
  console.log(`Found ${expenses.length} paid expenses`);

  // Create new expense
  const newExpense = await createExpense({
    amount_inr: 5000,
    category_id: 'cat_123',
    person_paid: 'Dhana',
    purpose: 'Office supplies',
    payment_method_id: 'pm_123',
    expense_date: '2024-12-20',
  });
  console.log('Created expense:', newExpense.id);

  // Get salaries
  const salaries = await getSalaries({
    employee_name: 'Dhana',
    salary_month: '2024-12',
  });
  console.log(`Found ${salaries.length} salary records`);

  // Get orders
  const orders = await getOrders({
    status: 'in_progress',
    payment_status: 'partial',
  });
  console.log(`Found ${orders.length} in-progress orders`);
}

// ============================================
// Example 5: Error Handling
// ============================================

export async function exampleErrorHandling() {
  console.log('=== Example 5: Error Handling ===');

  // Handle connection errors
  try {
    const connection = await determineConnection();
    console.log('Connected via:', connection);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Connection failed:', error.message);

      // Check status for details
      const status = getConnectionStatus();
      console.error('Status:', status);

      // Try clearing cache and retrying
      clearConnectionCache();
    }
  }

  // Handle API errors
  try {
    const expenses = await apiClient.get('/expenses');
    console.log('Got expenses:', expenses);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        console.error('Request timed out');
      } else if (error.message.includes('401')) {
        console.error('Unauthorized - check API key');
      } else {
        console.error('API error:', error.message);
      }
    }
  }

  // Handle business logic errors
  try {
    const expense = await createExpense({
      amount_inr: 5000,
      category_id: 'invalid-category',
      person_paid: 'Dhana',
      purpose: 'Test',
      payment_method_id: 'pm_123',
      expense_date: '2024-12-20',
    });
    console.log('Created:', expense);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Failed to create expense:', error.message);
    }
  }
}

// ============================================
// Example 6: Production Usage Pattern
// ============================================

export async function exampleProductionUsage() {
  console.log('=== Example 6: Production Usage Pattern ===');

  // Recommended pattern for production:
  // 1. Let unified client handle connection selection
  // 2. Use high-level API functions
  // 3. Implement proper error handling

  try {
    // Unified client automatically picks best connection
    const expenses = await getExpenses({
      payment_status: 'pending',
    });

    console.log(`Found ${expenses.length} pending expenses`);

    // Process expenses...
    for (const expense of expenses) {
      console.log(`- ${expense.purpose}: ₹${expense.amount_inr}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Failed to fetch expenses:', error.message);

      // Log connection status for debugging
      const status = getConnectionStatus();
      console.error('Connection status:', status);

      // Optionally notify monitoring service
      // notifyError('Umbrel connection failed', error, status);
    }
  }
}

// ============================================
// Example 7: Custom API Client Configuration
// ============================================

export async function exampleCustomApiClient() {
  console.log('=== Example 7: Custom API Client ===');

  // Create custom API client with different settings
  const customClient = createApiClient();

  // Use custom timeout
  const data = await customClient.get('/expenses', 5000); // 5 second timeout
  console.log('Got data:', data);

  // Health check with custom client
  const health = await customClient.healthCheck();
  console.log('Health:', health);
}

// ============================================
// Example 8: Mode Switching
// ============================================

export async function exampleModeSwitching() {
  console.log('=== Example 8: Mode Switching ===');

  // Start in auto mode
  console.log('Starting in auto mode');
  let connection = await determineConnection();
  console.log('Using:', connection);

  // Switch to direct only
  console.log('Switching to direct mode');
  setConnectionMode('direct');
  clearConnectionCache(); // Clear cache after mode change

  try {
    connection = await determineConnection();
    console.log('Using:', connection);
  } catch (error) {
    console.error('Direct connection not available');
  }

  // Switch to API only
  console.log('Switching to API mode');
  setConnectionMode('api');
  clearConnectionCache();

  try {
    connection = await determineConnection();
    console.log('Using:', connection);
  } catch (error) {
    console.error('API connection not available');
  }

  // Switch back to auto
  console.log('Switching back to auto mode');
  setConnectionMode('auto');
  clearConnectionCache();
}

// ============================================
// Example 9: Performance Monitoring
// ============================================

export async function examplePerformanceMonitoring() {
  console.log('=== Example 9: Performance Monitoring ===');

  // Compare direct vs API performance
  clearConnectionCache();

  // Test direct connection
  const directStart = Date.now();
  try {
    setConnectionMode('direct');
    await determineConnection();
    const expenses = await getExpenses();
    const directTime = Date.now() - directStart;
    console.log(`Direct: ${expenses.length} expenses in ${directTime}ms`);
  } catch (error) {
    console.log('Direct connection not available');
  }

  // Test API connection
  const apiStart = Date.now();
  try {
    setConnectionMode('api');
    clearConnectionCache();
    await determineConnection();
    const expenses = await getExpenses();
    const apiTime = Date.now() - apiStart;
    console.log(`API: ${expenses.length} expenses in ${apiTime}ms`);
  } catch (error) {
    console.log('API connection not available');
  }

  // Reset to auto mode
  setConnectionMode('auto');
  clearConnectionCache();
}

// ============================================
// Run all examples
// ============================================

export async function runAllExamples() {
  const examples = [
    exampleDirectClient,
    exampleApiClient,
    exampleUnifiedClient,
    exampleHighLevelApi,
    exampleErrorHandling,
    exampleProductionUsage,
    exampleCustomApiClient,
    exampleModeSwitching,
    examplePerformanceMonitoring,
  ];

  for (const example of examples) {
    try {
      await example();
      console.log('\n');
    } catch (error) {
      console.error(`Example failed: ${example.name}`, error);
      console.log('\n');
    }
  }
}
