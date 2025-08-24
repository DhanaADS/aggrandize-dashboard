import { Page, expect } from '@playwright/test';
import { TestUser } from '../fixtures/test-data';

/**
 * Authentication Helper Functions
 * Utilities for handling login/logout in tests
 */

export class AuthHelpers {
  constructor(private page: Page) {}

  /**
   * Navigate to login page
   */
  async goToLogin(): Promise<void> {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Login with Google OAuth (for testing)
   * Note: This assumes you have a test setup that bypasses real Google OAuth
   */
  async loginWithGoogle(user: TestUser): Promise<void> {
    await this.goToLogin();
    
    // Look for Google login button
    const googleButton = this.page.locator('button:has-text("Continue with Google"), button:has-text("Sign in with Google")');
    await expect(googleButton).toBeVisible();
    
    // Click Google login button
    await googleButton.click();
    
    // In a real test environment, you'd handle OAuth flow here
    // For now, we'll assume the app has a test mode that accepts mock credentials
    
    // Wait for redirect to dashboard
    await this.page.waitForURL('/dashboard**');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Login via direct authentication bypass (for testing)
   * This assumes you have a test endpoint that sets auth cookies directly
   */
  async loginDirectly(user: TestUser): Promise<void> {
    // Set authentication cookies directly for testing
    await this.page.context().addCookies([
      {
        name: 'next-auth.session-token',
        value: `test-session-${user.email}`,
        domain: new URL(this.page.url()).hostname,
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax'
      }
    ]);

    // Navigate to dashboard
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      // Check if we're on dashboard and not redirected to login
      const currentUrl = this.page.url();
      if (currentUrl.includes('/login')) {
        return false;
      }

      // Look for user-specific elements that indicate successful login
      const userElements = [
        this.page.locator('[data-testid="user-avatar"]'),
        this.page.locator('text="Good Morning"'),
        this.page.locator('text="Good Afternoon"'),
        this.page.locator('text="Good Evening"'),
        this.page.locator('text="Good Night"'),
      ];

      // Check if any user element is visible
      for (const element of userElements) {
        try {
          await element.waitFor({ timeout: 2000 });
          return true;
        } catch {
          // Continue to next element
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    // Look for user menu or logout button
    const userMenu = this.page.locator('[data-testid="user-menu"], button:has-text("Sign out")');
    
    if (await userMenu.isVisible()) {
      await userMenu.click();
      
      // If it's a dropdown menu, look for logout option
      const logoutOption = this.page.locator('text="Sign out", text="Logout", [data-testid="logout-button"]');
      if (await logoutOption.isVisible()) {
        await logoutOption.click();
      }
    } else {
      // Alternative: Clear cookies to force logout
      await this.page.context().clearCookies();
      await this.page.goto('/');
    }

    // Wait for redirect to login or home page
    await this.page.waitForURL('**/{login,/}');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to TeamHub PWA
   */
  async goToTeamHub(): Promise<void> {
    await this.page.goto('/dashboard/teamhub');
    await this.page.waitForLoadState('networkidle');
    
    // Wait for PWA to load
    await this.page.waitForSelector('text="Good Morning", text="Good Afternoon", text="Good Evening", text="Good Night"', {
      timeout: 10000
    });
  }

  /**
   * Ensure user is authenticated and on TeamHub
   */
  async ensureAuthenticated(user: TestUser): Promise<void> {
    const isAuthenticated = await this.isLoggedIn();
    
    if (!isAuthenticated) {
      await this.loginDirectly(user);
    }
    
    // Navigate to TeamHub
    await this.goToTeamHub();
    
    // Verify we're on the correct page
    await expect(this.page).toHaveURL(/\/dashboard\/teamhub/);
  }

  /**
   * Get current user info from the page
   */
  async getCurrentUser(): Promise<{ name: string; email?: string } | null> {
    try {
      // Look for greeting text that contains the user's name
      const greetingText = await this.page.locator('h1').first().textContent();
      
      if (greetingText) {
        // Extract name from greeting like "Good Morning, Dhana!"
        const match = greetingText.match(/Good\s+(?:Morning|Afternoon|Evening|Night),\s+([^!]+)!/);
        if (match) {
          return { name: match[1].trim() };
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Switch user (logout and login as different user)
   */
  async switchUser(newUser: TestUser): Promise<void> {
    await this.logout();
    await this.loginDirectly(newUser);
    await this.goToTeamHub();
  }

  /**
   * Check user permissions for specific actions
   */
  async hasPermission(action: 'create_task' | 'delete_task' | 'edit_task' | 'admin_access'): Promise<boolean> {
    switch (action) {
      case 'create_task':
        return await this.page.locator('button:has-text("+"), [data-testid="create-task-button"]').isVisible();
      
      case 'admin_access':
        // Check if admin menu items are visible
        return await this.page.locator('text="Admin", text="User Management"').isVisible();
      
      default:
        return true;
    }
  }
}