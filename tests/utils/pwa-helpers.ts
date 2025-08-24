import { Page, expect } from '@playwright/test';

/**
 * PWA Testing Utilities
 * Helper functions for testing Progressive Web App functionality
 */

export class PWAHelpers {
  constructor(private page: Page) {
    // Set test mode headers for all PWA helper requests
    this.page.setExtraHTTPHeaders({
      'x-playwright-test': 'true'
    });
  }

  /**
   * Check if the page has a valid service worker registered
   */
  async hasServiceWorker(): Promise<boolean> {
    const registration = await this.page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        return await navigator.serviceWorker.getRegistration();
      }
      return null;
    });
    return !!registration;
  }

  /**
   * Wait for service worker to be registered
   */
  async waitForServiceWorker(timeout = 10000): Promise<void> {
    await this.page.waitForFunction(
      () => {
        return 'serviceWorker' in navigator && navigator.serviceWorker.controller;
      },
      { timeout }
    );
  }

  /**
   * Check if the app can be installed (has beforeinstallprompt event)
   */
  async canInstallPWA(): Promise<boolean> {
    return await this.page.evaluate(() => {
      return window.matchMedia('(display-mode: browser)').matches;
    });
  }

  /**
   * Trigger the install prompt for PWA
   */
  async triggerInstallPrompt(): Promise<void> {
    await this.page.evaluate(() => {
      // Simulate beforeinstallprompt event
      const event = new Event('beforeinstallprompt');
      window.dispatchEvent(event);
    });
  }

  /**
   * Check if the app is running in standalone mode (installed PWA)
   */
  async isStandalone(): Promise<boolean> {
    return await this.page.evaluate(() => {
      return window.matchMedia('(display-mode: standalone)').matches;
    });
  }

  /**
   * Verify PWA manifest properties
   */
  async verifyManifest(): Promise<{
    name: string;
    shortName: string;
    startUrl: string;
    display: string;
    themeColor: string;
    backgroundColor: string;
  } | null> {
    return await this.page.evaluate(async () => {
      const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      if (!manifestLink) return null;

      try {
        const response = await fetch(manifestLink.href);
        const manifest = await response.json();
        return {
          name: manifest.name,
          shortName: manifest.short_name,
          startUrl: manifest.start_url,
          display: manifest.display,
          themeColor: manifest.theme_color,
          backgroundColor: manifest.background_color,
        };
      } catch (error) {
        return null;
      }
    });
  }

  /**
   * Test offline functionality by going offline
   */
  async goOffline(): Promise<void> {
    await this.page.context().setOffline(true);
  }

  /**
   * Go back online
   */
  async goOnline(): Promise<void> {
    await this.page.context().setOffline(false);
  }

  /**
   * Check if page works offline
   */
  async testOfflineAccess(): Promise<boolean> {
    await this.goOffline();
    
    try {
      await this.page.reload();
      // Check if critical content is still available
      const isAccessible = await this.page.isVisible('body');
      await this.goOnline();
      return isAccessible;
    } catch (error) {
      await this.goOnline();
      return false;
    }
  }

  /**
   * Simulate pull-to-refresh gesture on mobile
   */
  async pullToRefresh(): Promise<void> {
    const viewport = this.page.viewportSize();
    if (!viewport) return;

    // Simulate pull-to-refresh gesture
    await this.page.mouse.move(viewport.width / 2, 100);
    await this.page.mouse.down();
    await this.page.mouse.move(viewport.width / 2, 300, { steps: 10 });
    await this.page.waitForTimeout(500); // Wait for refresh trigger
    await this.page.mouse.up();
  }

  /**
   * Check if PWA icons are loaded correctly
   */
  async verifyIcons(): Promise<{ size: string; loaded: boolean }[]> {
    return await this.page.evaluate(async () => {
      const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      if (!manifestLink) return [];

      try {
        const response = await fetch(manifestLink.href);
        const manifest = await response.json();
        const icons = manifest.icons || [];

        const iconTests = await Promise.all(
          icons.map(async (icon: any) => {
            try {
              const imgResponse = await fetch(icon.src);
              return {
                size: icon.sizes,
                loaded: imgResponse.ok,
              };
            } catch {
              return {
                size: icon.sizes,
                loaded: false,
              };
            }
          })
        );

        return iconTests;
      } catch (error) {
        return [];
      }
    });
  }

  /**
   * Test push notification capabilities
   */
  async testNotificationPermission(): Promise<'granted' | 'denied' | 'default'> {
    return await this.page.evaluate(async () => {
      if (!('Notification' in window)) return 'denied';
      
      if (Notification.permission === 'granted') {
        return 'granted';
      } else if (Notification.permission === 'denied') {
        return 'denied';
      } else {
        return 'default';
      }
    });
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission(): Promise<'granted' | 'denied' | 'default'> {
    return await this.page.evaluate(async () => {
      if (!('Notification' in window)) return 'denied';
      
      const permission = await Notification.requestPermission();
      return permission;
    });
  }

  /**
   * Check if app has been updated (new service worker available)
   */
  async hasUpdate(): Promise<boolean> {
    return await this.page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      
      const registration = await navigator.serviceWorker.getRegistration();
      return !!(registration && registration.waiting);
    });
  }

  /**
   * Trigger service worker update
   */
  async updateServiceWorker(): Promise<void> {
    await this.page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return;
      
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    });
  }
}