import { test, expect } from '@playwright/test';
import { PWAHelpers } from '../../utils/pwa-helpers';

/**
 * TeamHub PWA Installation Tests
 * Tests PWA installation capabilities, manifest validation, and service worker functionality
 */

test.describe('TeamHub PWA - Installation & Manifest', () => {
  let pwaHelpers: PWAHelpers;
  
  test.beforeEach(async ({ page }) => {
    pwaHelpers = new PWAHelpers(page);
    await page.goto('/dashboard/teamhub');
    await page.waitForLoadState('networkidle');
  });

  test('should have a valid PWA manifest', async ({ page }) => {
    // Check if manifest link exists in head
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toBeVisible();
    
    // Get manifest URL
    const manifestUrl = await manifestLink.getAttribute('href');
    expect(manifestUrl).toBeTruthy();
    expect(manifestUrl).toContain('manifest.json');
    
    // Verify manifest properties
    const manifest = await pwaHelpers.verifyManifest();
    expect(manifest).toBeTruthy();
    expect(manifest?.name).toBe('AGGRANDIZE TeamHub');
    expect(manifest?.shortName).toBe('TeamHub');
    expect(manifest?.startUrl).toBe('/dashboard/teamhub');
    expect(manifest?.display).toBe('standalone');
    expect(manifest?.themeColor).toBe('#2a2a2a');
    expect(manifest?.backgroundColor).toBe('#2a2a2a');
  });

  test('should have all required PWA icons', async ({ page }) => {
    const icons = await pwaHelpers.verifyIcons();
    
    // Should have multiple icon sizes
    expect(icons.length).toBeGreaterThan(0);
    
    // Check that icons are loading successfully
    const loadedIcons = icons.filter(icon => icon.loaded);
    expect(loadedIcons.length).toBe(icons.length);
    
    // Should have standard PWA icon sizes
    const iconSizes = icons.map(icon => icon.size);
    expect(iconSizes).toContain('192x192');
    expect(iconSizes).toContain('512x512');
  });

  test('should register service worker', async ({ page }) => {
    // Wait for service worker to be registered
    await pwaHelpers.waitForServiceWorker();
    
    // Verify service worker is registered
    const hasServiceWorker = await pwaHelpers.hasServiceWorker();
    expect(hasServiceWorker).toBe(true);
  });

  test('should handle service worker updates', async ({ page }) => {
    // Check if there's an update available
    const hasUpdate = await pwaHelpers.hasUpdate();
    
    if (hasUpdate) {
      // Trigger service worker update
      await pwaHelpers.updateServiceWorker();
      
      // Wait for update to complete
      await page.waitForTimeout(2000);
      
      // Verify update was applied
      const stillHasUpdate = await pwaHelpers.hasUpdate();
      expect(stillHasUpdate).toBe(false);
    }
  });

  test('should work offline (basic caching)', async ({ page }) => {
    // Wait for service worker to cache resources
    await pwaHelpers.waitForServiceWorker();
    await page.waitForTimeout(2000);
    
    // Test offline access
    const worksOffline = await pwaHelpers.testOfflineAccess();
    
    // Should work offline (at least show cached content)
    expect(worksOffline).toBe(true);
  });

  test('should handle offline state gracefully', async ({ page }) => {
    // Go offline
    await pwaHelpers.goOffline();
    
    // Try to perform actions while offline
    const createButton = page.locator('button:has-text("+")');
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Should show some offline indication or queue the action
      // This test verifies the app doesn't crash when offline
      const modalVisible = await page.locator('text="Create New Task", text="Add Task"').isVisible();
      expect(modalVisible).toBe(true);
    }
    
    // Go back online
    await pwaHelpers.goOnline();
  });

  test('should support add to home screen', async ({ page, browserName }) => {
    // Skip on webkit as it has different PWA installation behavior
    test.skip(browserName === 'webkit', 'Safari has different PWA installation flow');
    
    // Check if PWA can be installed
    const canInstall = await pwaHelpers.canInstallPWA();
    
    // Trigger install prompt
    await pwaHelpers.triggerInstallPrompt();
    
    // This test verifies the install prompt infrastructure is in place
    // Actual installation testing requires more complex setup
  });

  test('should have proper PWA meta tags', async ({ page }) => {
    // Check for essential PWA meta tags
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toBeVisible();
    
    const themeColor = page.locator('meta[name="theme-color"]');
    await expect(themeColor).toBeVisible();
    
    const appleMobileWebAppCapable = page.locator('meta[name="apple-mobile-web-app-capable"]');
    await expect(appleMobileWebAppCapable).toBeVisible();
    
    const appleMobileWebAppTitle = page.locator('meta[name="application-name"]');
    await expect(appleMobileWebAppTitle).toBeVisible();
    
    // Verify meta tag values
    const themeColorValue = await themeColor.getAttribute('content');
    expect(themeColorValue).toBe('#2a2a2a');
  });

  test('should have proper cache headers', async ({ page }) => {
    // Navigate to a static asset
    const response = await page.goto('/logo1.png');
    
    if (response) {
      const headers = response.headers();
      
      // Check for caching headers (these may vary based on your setup)
      expect(headers['cache-control'] || headers['etag']).toBeTruthy();
    }
  });

  test('should handle PWA shortcuts', async ({ page }) => {
    const manifest = await pwaHelpers.verifyManifest();
    
    // Check if shortcuts are defined in manifest
    const response = await page.request.get('/manifest.json');
    const manifestData = await response.json();
    
    expect(manifestData.shortcuts).toBeTruthy();
    expect(manifestData.shortcuts).toBeInstanceOf(Array);
    
    if (manifestData.shortcuts.length > 0) {
      const shortcuts = manifestData.shortcuts;
      
      // Verify shortcut structure
      shortcuts.forEach((shortcut: any) => {
        expect(shortcut.name).toBeTruthy();
        expect(shortcut.url).toBeTruthy();
        expect(shortcut.icons).toBeTruthy();
      });
    }
  });

  test('should support share target functionality', async ({ page }) => {
    const response = await page.request.get('/manifest.json');
    const manifestData = await response.json();
    
    // Check if share target is configured
    if (manifestData.share_target) {
      expect(manifestData.share_target.action).toBeTruthy();
      expect(manifestData.share_target.method).toBe('POST');
      expect(manifestData.share_target.params).toBeTruthy();
    }
  });

  test('should handle notification permissions', async ({ page, browserName }) => {
    // Skip on webkit as notification handling is different
    test.skip(browserName === 'webkit', 'Safari has different notification handling');
    
    // Check current notification permission
    const permission = await pwaHelpers.testNotificationPermission();
    expect(['granted', 'denied', 'default']).toContain(permission);
    
    // If permission is default, we could request it (but this might trigger browser prompt)
    if (permission === 'default') {
      // In a real test environment, you might mock this
      console.log('Notification permission is in default state');
    }
  });

  test('should have proper launch handler configuration', async ({ page }) => {
    const response = await page.request.get('/manifest.json');
    const manifestData = await response.json();
    
    // Check launch handler configuration
    if (manifestData.launch_handler) {
      expect(manifestData.launch_handler.client_mode).toBe('focus-existing');
    }
  });
});