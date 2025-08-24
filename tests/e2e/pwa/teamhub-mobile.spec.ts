import { test, expect } from '@playwright/test';
import { PWAHelpers } from '../../utils/pwa-helpers';
import { AuthHelpers } from '../../utils/auth-helpers';
import { TestDataHelper } from '../../fixtures/test-data';

/**
 * TeamHub PWA Mobile Tests
 * Tests mobile-specific functionality, responsive design, and touch interactions
 */

test.describe('TeamHub PWA - Mobile Experience', () => {
  let pwaHelpers: PWAHelpers;
  let authHelpers: AuthHelpers;
  
  test.beforeEach(async ({ page }) => {
    pwaHelpers = new PWAHelpers(page);
    authHelpers = new AuthHelpers(page);
    
    // Authenticate as admin user
    const adminUser = TestDataHelper.getAdminUser();
    await authHelpers.ensureAuthenticated(adminUser);
  });

  test.describe('Mobile Phone Experience', () => {
    test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

    test('should display properly on mobile phone', async ({ page }) => {
      // Verify mobile-optimized layout
      await expect(page.locator('h1')).toBeVisible();
      
      // Check that elements are properly sized for mobile
      const container = page.locator('[style*="position: fixed"]').first();
      await expect(container).toBeVisible();
      
      // Verify tab navigation is touch-friendly
      const tabs = page.locator('button:has-text("Tasks"), button:has-text("Completed"), button:has-text("Chat")');
      await expect(tabs.first()).toBeVisible();
      
      // Check floating action button is accessible
      const fab = page.locator('button:has-text("+")');
      await expect(fab).toBeVisible();
      
      // Verify text is readable (not too small)
      const taskTitle = page.locator('h2:has-text("Today\'s Tasks")');
      await expect(taskTitle).toBeVisible();
    });

    test('should handle touch interactions correctly', async ({ page }) => {
      // Test tap on task item
      const taskItem = page.locator('[style*="background: #2a2a2a"]').first();
      if (await taskItem.isVisible()) {
        await taskItem.tap();
        
        // Should open task details
        await expect(page.locator('text="Task Details", h3')).toBeVisible();
        
        // Test tap to close
        const backButton = page.locator('button:has-text("← Back"), button:has-text("Close")');
        if (await backButton.isVisible()) {
          await backButton.tap();
        }
      }
      
      // Test tap on floating action button
      await page.locator('button:has-text("+")').tap();
      await expect(page.locator('text="Create New Task", text="Add Task"')).toBeVisible();
    });

    test('should support pull-to-refresh', async ({ page }) => {
      // Simulate pull-to-refresh gesture
      await pwaHelpers.pullToRefresh();
      
      // Verify page refreshes or shows refresh indicator
      await page.waitForTimeout(1000);
      
      // Check that the page is still functional after refresh
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('button:has-text("Tasks")')).toBeVisible();
    });

    test('should have proper scroll behavior', async ({ page }) => {
      // Scroll down the tasks list
      await page.mouse.wheel(0, 500);
      
      // Header should still be accessible or properly handled
      const header = page.locator('h1').first();
      
      // Either header is fixed or scrolled out of view
      const headerVisible = await header.isVisible();
      
      // Scroll back up
      await page.mouse.wheel(0, -500);
      
      // Header should be visible again
      await expect(header).toBeVisible();
    });

    test('should handle keyboard input on mobile', async ({ page }) => {
      // Open task creation
      await page.locator('button:has-text("+")').tap();
      
      // Test text input
      const titleInput = page.locator('input[placeholder*="title"], input[name="title"]');
      await titleInput.tap();
      await titleInput.fill('Mobile Test Task');
      
      // Verify input is properly visible and not obscured by virtual keyboard
      await expect(titleInput).toHaveValue('Mobile Test Task');
      
      // Test textarea input
      const descriptionInput = page.locator('textarea[placeholder*="description"], textarea[name="description"]');
      if (await descriptionInput.isVisible()) {
        await descriptionInput.tap();
        await descriptionInput.fill('Testing mobile keyboard input');
        await expect(descriptionInput).toHaveValue('Testing mobile keyboard input');
      }
    });

    test('should handle orientation changes', async ({ page }) => {
      // Test portrait mode (default)
      await expect(page.locator('h1')).toBeVisible();
      
      // Simulate landscape mode
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(500);
      
      // Verify layout still works in landscape
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('button:has-text("Tasks")')).toBeVisible();
      
      // Switch back to portrait
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      
      await expect(page.locator('h1')).toBeVisible();
    });
  });

  test.describe('Tablet Experience', () => {
    test.use({ viewport: { width: 768, height: 1024 } }); // iPad size

    test('should display properly on tablet', async ({ page }) => {
      // Verify tablet layout
      await expect(page.locator('h1')).toBeVisible();
      
      // Check that content uses available space effectively
      const container = page.locator('[style*="position: fixed"]').first();
      await expect(container).toBeVisible();
      
      // Verify tabs are properly spaced
      const tabContainer = page.locator('button:has-text("Tasks")').locator('..');
      await expect(tabContainer).toBeVisible();
      
      // Check that task cards have appropriate sizing
      const taskItems = page.locator('[style*="background: #2a2a2a"]');
      const taskCount = await taskItems.count();
      if (taskCount > 0) {
        await expect(taskItems.first()).toBeVisible();
      }
    });

    test('should handle tablet-specific interactions', async ({ page }) => {
      // Test double-tap zoom (should be prevented in PWA)
      const taskItem = page.locator('[style*="background: #2a2a2a"]').first();
      if (await taskItem.isVisible()) {
        await taskItem.dblclick();
        
        // Should open task details, not zoom
        await expect(page.locator('text="Task Details", h3')).toBeVisible();
      }
    });
  });

  test.describe('Cross-Device Responsive Design', () => {
    const viewports = [
      { name: 'iPhone SE', width: 375, height: 667 },
      { name: 'iPhone 12 Pro', width: 390, height: 844 },
      { name: 'iPad', width: 768, height: 1024 },
      { name: 'iPad Pro', width: 1024, height: 1366 },
    ];

    viewports.forEach(({ name, width, height }) => {
      test(`should work on ${name} (${width}x${height})`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        
        // Verify core functionality works
        await expect(page.locator('h1')).toBeVisible();
        await expect(page.locator('button:has-text("Tasks")')).toBeVisible();
        await expect(page.locator('button:has-text("+")')).toBeVisible();
        
        // Test navigation
        await page.locator('button:has-text("Chat")').click();
        await expect(page.locator('h2:has-text("Task Discussions")')).toBeVisible();
        
        // Go back to tasks
        await page.locator('button:has-text("Tasks")').click();
        await expect(page.locator('h2:has-text("Today\'s Tasks")')).toBeVisible();
      });
    });
  });

  test.describe('Touch Gestures and Interactions', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should support swipe gestures', async ({ page }) => {
      // Note: Basic swipe testing - more advanced gesture testing would require additional setup
      
      // Test horizontal swipe on task item (if implemented)
      const taskItem = page.locator('[style*="background: #2a2a2a"]').first();
      if (await taskItem.isVisible()) {
        const bbox = await taskItem.boundingBox();
        if (bbox) {
          // Simulate swipe gesture
          await page.mouse.move(bbox.x + 50, bbox.y + bbox.height / 2);
          await page.mouse.down();
          await page.mouse.move(bbox.x + bbox.width - 50, bbox.y + bbox.height / 2, { steps: 10 });
          await page.mouse.up();
          
          await page.waitForTimeout(500);
          
          // Verify swipe action (could reveal action buttons or open task)
          // This depends on your implementation
        }
      }
    });

    test('should handle long press interactions', async ({ page }) => {
      const taskItem = page.locator('[style*="background: #2a2a2a"]').first();
      if (await taskItem.isVisible()) {
        // Simulate long press
        const bbox = await taskItem.boundingBox();
        if (bbox) {
          await page.mouse.move(bbox.x + bbox.width / 2, bbox.y + bbox.height / 2);
          await page.mouse.down();
          await page.waitForTimeout(800); // Long press duration
          await page.mouse.up();
          
          // Check if context menu or action appears
          await page.waitForTimeout(500);
          
          // This test verifies long press doesn't break the app
          await expect(page.locator('h1')).toBeVisible();
        }
      }
    });

    test('should handle pinch zoom prevention', async ({ page }) => {
      // PWA should prevent pinch zoom
      // This is more of a configuration test than interaction test
      
      const viewport = page.locator('meta[name="viewport"]');
      const content = await viewport.getAttribute('content');
      
      // Should have user-scalable=no or maximum-scale=1
      expect(content).toMatch(/(user-scalable=no|maximum-scale=1)/);
    });
  });

  test.describe('Mobile-Specific Features', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should handle device rotation gracefully', async ({ page }) => {
      // Test portrait
      await expect(page.locator('h1')).toBeVisible();
      
      // Rotate to landscape
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(500);
      
      // Verify layout adapts
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('button:has-text("Tasks")')).toBeVisible();
      
      // Rotate back to portrait
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      
      await expect(page.locator('h1')).toBeVisible();
    });

    test('should work with mobile browsers', async ({ page, browserName }) => {
      // Test mobile-specific browser behaviors
      
      // Check if PWA meta tags work correctly
      const appleMobileCapable = page.locator('meta[name="apple-mobile-web-app-capable"]');
      await expect(appleMobileCapable).toBeVisible();
      
      // Verify status bar style
      const statusBarStyle = page.locator('meta[name="apple-mobile-web-app-status-bar-style"]');
      if (await statusBarStyle.isVisible()) {
        const content = await statusBarStyle.getAttribute('content');
        expect(['default', 'black', 'black-translucent']).toContain(content);
      }
    });

    test('should maintain performance on mobile', async ({ page }) => {
      // Basic performance test
      const startTime = Date.now();
      
      // Navigate and wait for full load
      await page.goto('/dashboard/teamhub');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time (adjust as needed)
      expect(loadTime).toBeLessThan(10000); // 10 seconds max
      
      // Verify app is responsive after load
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('button:has-text("+")')).toBeVisible();
    });
  });
});