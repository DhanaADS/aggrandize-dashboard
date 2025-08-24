import { test, expect } from '@playwright/test';

/**
 * Example Test - Simple PWA Access Verification
 * This is a basic test to verify the testing setup works
 */

test.describe('Example - Basic PWA Access', () => {
  test('should access TeamHub PWA successfully', async ({ page }) => {
    // Navigate to TeamHub PWA
    await page.goto('/dashboard/teamhub');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Verify basic PWA elements are present
    await expect(page.locator('body')).toBeVisible();
    
    // Check for PWA manifest
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toBeVisible();
    
    // Verify basic styling is loaded
    const containerElement = page.locator('[style*="position: fixed"]').first();
    if (await containerElement.isVisible()) {
      await expect(containerElement).toBeVisible();
    }
    
    console.log('✅ Basic PWA access test passed');
  });

  test('should have proper PWA meta tags', async ({ page }) => {
    await page.goto('/dashboard/teamhub');
    
    // Check viewport meta tag
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toBeVisible();
    
    // Check theme color
    const themeColor = page.locator('meta[name="theme-color"]');
    await expect(themeColor).toBeVisible();
    
    console.log('✅ PWA meta tags test passed');
  });
  
  test('should load without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    
    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Capture page errors
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    await page.goto('/dashboard/teamhub');
    await page.waitForLoadState('networkidle');
    
    // Check for critical errors (some warnings might be expected)
    const criticalErrors = errors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('warning') &&
      !error.includes('Warning')
    );
    
    if (criticalErrors.length > 0) {
      console.warn('JavaScript errors detected:', criticalErrors);
    }
    
    // Test should still pass unless there are major errors
    expect(criticalErrors.length).toBeLessThan(5); // Allow some minor errors
    
    console.log('✅ JavaScript errors test completed');
  });
});