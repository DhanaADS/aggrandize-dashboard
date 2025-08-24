import { test, expect } from '@playwright/test';
import { PWAHelpers } from '../../utils/pwa-helpers';
import { AuthHelpers } from '../../utils/auth-helpers';
import { TestDataHelper } from '../../fixtures/test-data';

/**
 * Core TeamHub PWA Functionality Tests
 * Tests essential PWA features and task management functionality
 */

test.describe('TeamHub PWA - Core Functionality', () => {
  let pwaHelpers: PWAHelpers;
  let authHelpers: AuthHelpers;
  
  test.beforeEach(async ({ page }) => {
    pwaHelpers = new PWAHelpers(page);
    authHelpers = new AuthHelpers(page);
    
    // Authenticate as admin user
    const adminUser = TestDataHelper.getAdminUser();
    await authHelpers.ensureAuthenticated(adminUser);
  });

  test('should load TeamHub PWA successfully', async ({ page }) => {
    // Verify we're on the TeamHub page
    await expect(page).toHaveURL(/\/dashboard\/teamhub/);
    
    // Check for main PWA elements
    await expect(page.locator('h1')).toContainText(/Good (Morning|Afternoon|Evening|Night)/);
    await expect(page.locator('text="Tasks"')).toBeVisible();
    await expect(page.locator('text="Completed"')).toBeVisible();
    await expect(page.locator('text="Chat"')).toBeVisible();
    
    // Verify floating action button is present
    await expect(page.locator('button:has-text("+")')).toBeVisible();
  });

  test('should display correct user greeting based on time', async ({ page }) => {
    const greeting = await page.locator('h1').first().textContent();
    expect(greeting).toMatch(/Good (Morning|Afternoon|Evening|Night), \w+!/);
  });

  test('should show task statistics correctly', async ({ page }) => {
    // Check for stats card
    const statsCard = page.locator('[style*="background: rgba(255, 255, 255, 0.15)"]').first();
    await expect(statsCard).toBeVisible();
    
    // Verify pending tasks count
    const pendingTasks = statsCard.locator('text="Pending Tasks"');
    await expect(pendingTasks).toBeVisible();
    
    // Verify urgent tasks count
    const urgentTasks = statsCard.locator('text="Urgent"');
    await expect(urgentTasks).toBeVisible();
  });

  test('should navigate between tabs correctly', async ({ page }) => {
    // Test Tasks tab (default)
    await expect(page.locator('h2:has-text("Today\'s Tasks")')).toBeVisible();
    
    // Click Completed tab
    await page.locator('button:has-text("Completed")').click();
    await expect(page.locator('h2:has-text("Completed Tasks")')).toBeVisible();
    
    // Click Chat tab
    await page.locator('button:has-text("Chat")').click();
    await expect(page.locator('h2:has-text("Task Discussions")')).toBeVisible();
    
    // Go back to Tasks tab
    await page.locator('button:has-text("Tasks")').click();
    await expect(page.locator('h2:has-text("Today\'s Tasks")')).toBeVisible();
  });

  test('should create a new task successfully', async ({ page }) => {
    // Click the floating action button to create task
    await page.locator('button:has-text("+")').click();
    
    // Verify task creation modal is open
    await expect(page.locator('text="Create New Task", text="Add Task"')).toBeVisible();
    
    // Fill in task details
    const testTask = TestDataHelper.createTestTodo({
      title: 'Test PWA Task Creation',
      description: 'This task was created via Playwright test'
    });
    
    await page.fill('input[placeholder*="title"], input[name="title"]', testTask.title);
    await page.fill('textarea[placeholder*="description"], textarea[name="description"]', testTask.description);
    
    // Select priority
    await page.selectOption('select[name="priority"]', testTask.priority);
    
    // Submit the form
    await page.locator('button:has-text("Create"), button[type="submit"]').click();
    
    // Verify task was created and appears in the list
    await expect(page.locator(`text="${testTask.title}"`)).toBeVisible();
    
    // Verify success feedback
    // Note: This might be a toast notification or console log
    const taskElements = page.locator('[style*="background: #2a2a2a"]');
    await expect(taskElements.first()).toBeVisible();
  });

  test('should update task status correctly', async ({ page }) => {
    // Find a task item and click it
    const taskItem = page.locator('[style*="background: #2a2a2a"]').first();
    await expect(taskItem).toBeVisible();
    await taskItem.click();
    
    // Verify task details modal opens
    await expect(page.locator('text="Task Details", text="Update Status"')).toBeVisible();
    
    // Update task status
    const statusButton = page.locator('button:has-text("In Progress"), button:has-text("Mark as Done")');
    if (await statusButton.isVisible()) {
      await statusButton.click();
      
      // Verify status update
      await expect(page.locator('text="✅"')).toBeVisible();
    }
  });

  test('should access task chat functionality', async ({ page }) => {
    // Go to Chat tab
    await page.locator('button:has-text("Chat")').click();
    await expect(page.locator('h2:has-text("Task Discussions")')).toBeVisible();
    
    // Click on a task to open chat
    const taskForChat = page.locator('[style*="background: #2a2a2a"]').first();
    if (await taskForChat.isVisible()) {
      await taskForChat.click();
      
      // Verify chat interface is loaded
      await expect(page.locator('text="← Back to Tasks"')).toBeVisible();
      
      // Check for message input
      const messageInput = page.locator('textarea[placeholder*="message"], input[placeholder*="message"]');
      await expect(messageInput).toBeVisible();
      
      // Test sending a message
      await messageInput.fill('Test message from Playwright');
      await page.locator('button:has-text("Send"), button[type="submit"]').click();
      
      // Verify message appears
      await expect(page.locator('text="Test message from Playwright"')).toBeVisible();
    }
  });

  test('should display severity alerts correctly', async ({ page }) => {
    const alertSection = page.locator('[style*="borderTop: 1px solid rgba(255, 255, 255, 0.2)"]');
    
    // Check for different types of alerts
    const urgentAlert = page.locator('text*="urgent task"');
    const overdueAlert = page.locator('text*="overdue task"');
    const messageAlert = page.locator('text*="new message"');
    
    // At least one type of alert should be visible if there are active items
    const hasAlerts = await urgentAlert.isVisible() || 
                     await overdueAlert.isVisible() || 
                     await messageAlert.isVisible();
    
    if (hasAlerts) {
      await expect(alertSection).toBeVisible();
    }
  });

  test('should handle empty states gracefully', async ({ page }) => {
    // Go to Completed tab (might be empty)
    await page.locator('button:has-text("Completed")').click();
    
    // Look for empty state or completed tasks
    const emptyState = page.locator('text="No completed tasks"');
    const completedTasks = page.locator('[style*="textDecoration: line-through"]');
    
    const hasCompletedTasks = await completedTasks.count() > 0;
    
    if (!hasCompletedTasks) {
      await expect(emptyState).toBeVisible();
    }
  });

  test('should maintain PWA container isolation', async ({ page }) => {
    // Verify PWA container styling
    const pwaContainer = page.locator('[style*="position: fixed"]').first();
    await expect(pwaContainer).toBeVisible();
    
    // Check that container has proper isolation properties
    const containerStyle = await pwaContainer.getAttribute('style');
    expect(containerStyle).toContain('position: fixed');
    expect(containerStyle).toContain('overflow: hidden');
    expect(containerStyle).toContain('isolation: isolate');
  });

  test('should handle real-time updates', async ({ page, context }) => {
    // Open second page to simulate another user
    const page2 = await context.newPage();
    const authHelpers2 = new AuthHelpers(page2);
    
    // Authenticate as different user
    const marketingUser = TestDataHelper.getMarketingUser();
    await authHelpers2.ensureAuthenticated(marketingUser);
    
    // Create a task from second page
    await page2.locator('button:has-text("+")').click();
    await page2.fill('input[placeholder*="title"], input[name="title"]', 'Real-time Test Task');
    await page2.locator('button:has-text("Create"), button[type="submit"]').click();
    
    // Verify task appears on first page (real-time sync)
    await page.waitForSelector('text="Real-time Test Task"', { timeout: 5000 });
    await expect(page.locator('text="Real-time Test Task"')).toBeVisible();
    
    await page2.close();
  });

  test('should handle task deletion with permissions', async ({ page }) => {
    // Create a task first
    await page.locator('button:has-text("+")').click();
    await page.fill('input[placeholder*="title"], input[name="title"]', 'Task to Delete');
    await page.locator('button:has-text("Create"), button[type="submit"]').click();
    
    // Wait for task to appear
    await expect(page.locator('text="Task to Delete"')).toBeVisible();
    
    // Click on the task to open details
    await page.locator('text="Task to Delete"').click();
    
    // Look for delete button (should be visible for task creator)
    const deleteButton = page.locator('button:has-text("Delete"), button:has-text("🗑")');
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      
      // Confirm deletion
      await page.on('dialog', dialog => dialog.accept());
      
      // Verify task is removed
      await expect(page.locator('text="Task to Delete"')).not.toBeVisible();
    }
  });
});