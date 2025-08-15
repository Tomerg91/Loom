import { Page, BrowserContext, expect } from '@playwright/test';
import { TestUser, getTestUserByEmail } from './test-data';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: TestUser;
}

/**
 * Authentication helpers for E2E tests
 * Provides utilities for signing in, signing out, and managing user sessions
 */
export class TestAuthHelper {
  constructor(private page: Page) {}

  /**
   * Sign in a user through the UI
   */
  async signInUser(email: string, password: string = 'password123'): Promise<void> {
    console.log(`🔐 Signing in user: ${email}`);

    // Navigate to sign in page
    await this.page.goto('/auth/signin');
    
    // Wait for the sign in form to load
    await this.page.waitForSelector('[data-testid="email-input"]', { timeout: 10000 });
    
    // Fill in credentials
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    
    // Submit the form
    await this.page.click('[data-testid="signin-button"]');
    
    // Wait for successful redirect (should go to dashboard or intended page)
    await this.page.waitForURL(/\/(dashboard|client|coach|admin)/, { timeout: 15000 });
    
    // Verify user is signed in by checking for user menu
    await expect(this.page.locator('[data-testid="user-menu"]')).toBeVisible({ timeout: 10000 });
    
    console.log(`✅ Successfully signed in: ${email}`);
  }

  /**
   * Sign in a specific test user by role
   */
  async signInUserByRole(role: 'client' | 'coach' | 'admin'): Promise<void> {
    const user = getTestUserByEmail(`${role}@example.com`);
    if (!user) {
      throw new Error(`Test user with role ${role} not found`);
    }
    
    await this.signInUser(user.email, user.password);
  }

  /**
   * Sign out the current user
   */
  async signOutUser(): Promise<void> {
    console.log('🔓 Signing out user');
    
    try {
      // Check if user menu is visible (user is signed in)
      const userMenu = this.page.locator('[data-testid="user-menu"]');
      if (await userMenu.isVisible()) {
        // Click user menu
        await userMenu.click();
        
        // Click sign out button
        await this.page.click('text=Sign out');
        
        // Wait for redirect to sign in page
        await this.page.waitForURL('/auth/signin', { timeout: 10000 });
        
        console.log('✅ Successfully signed out');
      } else {
        console.log('ℹ️ User was not signed in');
      }
    } catch (error) {
      console.error('❌ Sign out failed:', error);
      // Force navigation to sign in page
      await this.page.goto('/auth/signin');
    }
  }

  /**
   * Check if a user is currently signed in
   */
  async isUserSignedIn(): Promise<boolean> {
    try {
      const userMenu = this.page.locator('[data-testid="user-menu"]');
      return await userMenu.isVisible({ timeout: 5000 });
    } catch {
      return false;
    }
  }

  /**
   * Get the current user's display name from the UI
   */
  async getCurrentUserName(): Promise<string | null> {
    try {
      const userMenu = this.page.locator('[data-testid="user-menu"]');
      if (await userMenu.isVisible()) {
        const userName = await userMenu.textContent();
        return userName?.trim() || null;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Verify user has specific role-based access
   */
  async verifyUserRole(expectedRole: 'client' | 'coach' | 'admin'): Promise<boolean> {
    try {
      // Navigate to role-specific page and check access
      const rolePages = {
        client: '/client',
        coach: '/coach',
        admin: '/admin',
      };
      
      await this.page.goto(rolePages[expectedRole]);
      
      // If we're redirected away, user doesn't have access
      const currentUrl = this.page.url();
      return currentUrl.includes(rolePages[expectedRole]);
    } catch {
      return false;
    }
  }

  /**
   * Verify protected route redirects when not authenticated
   */
  async verifyProtectedRouteRedirect(protectedPath: string): Promise<boolean> {
    try {
      await this.page.goto(protectedPath);
      await this.page.waitForURL('/auth/signin', { timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Test user registration flow
   */
  async registerNewUser(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: 'client' | 'coach';
  }): Promise<boolean> {
    try {
      console.log(`👤 Registering new user: ${userData.email}`);
      
      // Navigate to signup page
      await this.page.goto('/auth/signup');
      
      // Fill registration form
      await this.page.fill('[data-testid="first-name-input"]', userData.firstName);
      await this.page.fill('[data-testid="last-name-input"]', userData.lastName);
      await this.page.fill('[data-testid="email-input"]', userData.email);
      await this.page.fill('[data-testid="password-input"]', userData.password);
      await this.page.fill('[data-testid="confirm-password-input"]', userData.password);
      
      // Select role
      await this.page.click('[data-testid="role-select"]');
      await this.page.click(`text=${userData.role === 'client' ? 'Client' : 'Coach'}`);
      
      // Submit form
      await this.page.click('[data-testid="signup-button"]');
      
      // Wait for redirect to signin with success message
      await this.page.waitForURL('/auth/signin', { timeout: 15000 });
      
      // Check for success message
      const successMessage = this.page.locator('text=Account created successfully');
      await expect(successMessage).toBeVisible({ timeout: 10000 });
      
      console.log(`✅ Successfully registered: ${userData.email}`);
      return true;
    } catch (error) {
      console.error(`❌ Registration failed for ${userData.email}:`, error);
      return false;
    }
  }

  /**
   * Test password reset flow
   */
  async requestPasswordReset(email: string): Promise<boolean> {
    try {
      console.log(`🔑 Requesting password reset for: ${email}`);
      
      // Navigate to signin page
      await this.page.goto('/auth/signin');
      
      // Click forgot password link
      await this.page.click('text=Forgot your password?');
      await this.page.waitForURL('/auth/reset-password');
      
      // Fill reset form
      await this.page.fill('[data-testid="email-input"]', email);
      await this.page.click('[data-testid="reset-button"]');
      
      // Check for success message
      const successMessage = this.page.locator('text=Password reset email sent');
      await expect(successMessage).toBeVisible({ timeout: 10000 });
      
      console.log(`✅ Password reset requested for: ${email}`);
      return true;
    } catch (error) {
      console.error(`❌ Password reset failed for ${email}:`, error);
      return false;
    }
  }

  /**
   * Clear all authentication state
   */
  async clearAuthState(): Promise<void> {
    try {
      // Clear local storage
      await this.page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      // Clear cookies
      await this.page.context().clearCookies();
      
      console.log('🧹 Authentication state cleared');
    } catch (error) {
      console.error('❌ Failed to clear auth state:', error);
    }
  }

  /**
   * Set up authentication state programmatically (for faster test setup)
   */
  async setAuthState(user: TestUser, tokens: { accessToken: string; refreshToken: string }): Promise<void> {
    try {
      console.log(`⚡ Setting auth state for: ${user.email}`);
      
      // Set authentication tokens in local storage
      await this.page.evaluate(
        ({ accessToken, refreshToken, user }) => {
          const authState = {
            access_token: accessToken,
            refresh_token: refreshToken,
            user: {
              id: (user as any).id || 'test-user-id',
              email: user.email,
              user_metadata: {
                first_name: user.firstName,
                last_name: user.lastName,
                role: user.role,
              },
            },
            expires_at: Date.now() + 3600000, // 1 hour from now
          };
          
          localStorage.setItem('supabase.auth.token', JSON.stringify(authState));
        },
        { ...tokens, user }
      );
      
      console.log(`✅ Auth state set for: ${user.email}`);
    } catch (error) {
      console.error(`❌ Failed to set auth state for ${user.email}:`, error);
    }
  }

  /**
   * Verify authentication persists across page refreshes
   */
  async verifyAuthPersistence(): Promise<boolean> {
    try {
      // Check if user is signed in
      const isSignedIn = await this.isUserSignedIn();
      if (!isSignedIn) {
        return false;
      }
      
      // Refresh the page
      await this.page.reload();
      
      // Wait for page to load and check if still signed in
      await this.page.waitForLoadState('networkidle');
      return await this.isUserSignedIn();
    } catch {
      return false;
    }
  }

  /**
   * Test session timeout handling
   */
  async testSessionTimeout(): Promise<boolean> {
    try {
      // Clear auth tokens to simulate expired session
      await this.page.evaluate(() => {
        localStorage.removeItem('supabase.auth.token');
      });
      
      // Try to access a protected page
      await this.page.goto('/dashboard');
      
      // Should be redirected to signin
      await this.page.waitForURL('/auth/signin', { timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create auth helper instance for a page
 */
export function createAuthHelper(page: Page): TestAuthHelper {
  return new TestAuthHelper(page);
}

/**
 * Global auth helper functions that can be used across tests
 */
export const authHelpers = {
  /**
   * Quick sign in for test setup
   */
  async quickSignIn(page: Page, role: 'client' | 'coach' | 'admin' = 'client'): Promise<void> {
    const authHelper = createAuthHelper(page);
    await authHelper.signInUserByRole(role);
  },

  /**
   * Ensure user is signed out before test
   */
  async ensureSignedOut(page: Page): Promise<void> {
    const authHelper = createAuthHelper(page);
    await authHelper.signOutUser();
  },

  /**
   * Sign in with specific credentials
   */
  async signInWithCredentials(page: Page, email: string, password: string = 'password123'): Promise<void> {
    const authHelper = createAuthHelper(page);
    await authHelper.signInUser(email, password);
  },
};

/**
 * Auth fixture for test isolation
 */
export class AuthTestFixture {
  private originalState: any = null;

  constructor(private page: Page) {}

  /**
   * Save current auth state
   */
  async saveState(): Promise<void> {
    this.originalState = await this.page.evaluate(() => {
      return {
        localStorage: { ...localStorage },
        sessionStorage: { ...sessionStorage },
      };
    });
  }

  /**
   * Restore auth state
   */
  async restoreState(): Promise<void> {
    if (this.originalState) {
      await this.page.evaluate((state) => {
        localStorage.clear();
        sessionStorage.clear();
        
        Object.entries(state.localStorage).forEach(([key, value]) => {
          localStorage.setItem(key, value as string);
        });
        
        Object.entries(state.sessionStorage).forEach(([key, value]) => {
          sessionStorage.setItem(key, value as string);
        });
      }, this.originalState);
    }
  }

  /**
   * Clean up fixture
   */
  async cleanup(): Promise<void> {
    this.originalState = null;
  }
}