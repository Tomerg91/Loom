import { test, expect } from '@playwright/test';

import { createAuthHelper, testConstants, testUtils, getTestUserByRole, getTestUserByEmail } from '../../../tests/helpers';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state for clean test isolation
    const authHelper = createAuthHelper(page);
    await authHelper.clearAuthState();
    
    // Start from the index page
    await page.goto('/');
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
  });

  test('complete signin flow', async ({ page }) => {
    const authHelper = createAuthHelper(page);
    const testUser = getTestUserByRole('client')!;

    // Should redirect to signin page when not authenticated
    await expect(page).toHaveURL('/auth/signin');

    // Use auth helper for consistent sign in
    await authHelper.signInUser(testUser.email, testUser.password);
    
    // Should redirect to dashboard on successful signin
    await expect(page).toHaveURL(/\/(dashboard|client)/, { timeout: 15000 });
    
    // Should show user info in navigation
    await expect(page.locator(testConstants.selectors.userMenu)).toBeVisible({ timeout: 10000 });
    
    // Verify user is properly authenticated
    const isSignedIn = await authHelper.isUserSignedIn();
    expect(isSignedIn).toBe(true);
  });

  test('signin validation errors', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Try to submit empty form
    await page.click(testConstants.selectors.signInButton);
    
    // Should show validation errors
    await expect(page.locator(`text=${testConstants.errorMessages.required}`)).toBeVisible();
    
    // Enter invalid email
    await page.fill(testConstants.selectors.emailInput, 'invalid-email');
    await page.click(testConstants.selectors.signInButton);
    
    await expect(page.locator(`text=${testConstants.errorMessages.invalidEmail}`)).toBeVisible();
  });

  test('signin error handling', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Fill form with invalid credentials
    await page.fill('[data-testid="email-input"]', 'wrong@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    
    await page.click('[data-testid="signin-button"]');
    
    // Should show error message
    await expect(page.locator('text=Invalid login credentials')).toBeVisible();
    
    // Should stay on signin page
    await expect(page).toHaveURL('/auth/signin');
  });

  test('signup flow', async ({ page }) => {
    const _authHelper = createAuthHelper(page);
    const randomEmail = testUtils.randomEmail();
    
    await page.goto('/auth/signin');
    
    // Navigate to signup
    await page.click('text=Sign up here');
    await expect(page).toHaveURL('/auth/signup');
    
    // Fill out signup form with test data
    const userData = {
      firstName: 'Test',
      lastName: 'User',
      email: randomEmail,
      password: testConstants.DEFAULT_PASSWORD,
      role: 'client' as const
    };
    
    await page.fill('[data-testid="first-name-input"]', userData.firstName);
    await page.fill('[data-testid="last-name-input"]', userData.lastName);
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.fill('[data-testid="password-input"]', userData.password);
    await page.fill('[data-testid="confirm-password-input"]', userData.password);
    
    // Select role
    await page.click('[data-testid="role-select"]');
    await page.click('text=Client');
    
    await page.click('[data-testid="signup-button"]');
    
    // Should redirect to signin with success message
    await expect(page).toHaveURL('/auth/signin', { timeout: 15000 });
    await expect(page.locator('text=Account created successfully')).toBeVisible({ timeout: 10000 });
  });

  test('signout flow', async ({ page }) => {
    const authHelper = createAuthHelper(page);
    const testUser = getTestUserByEmail('test@example.com')!;
    
    // First signin using auth helper
    await authHelper.signInUser(testUser.email, testUser.password);
    
    // Verify user is signed in
    await expect(page).toHaveURL(/\/(dashboard|client)/, { timeout: 15000 });
    
    // Use auth helper for consistent signout
    await authHelper.signOutUser();
    
    // Should redirect to signin page
    await expect(page).toHaveURL('/auth/signin');
    
    // Verify user is signed out
    const isSignedIn = await authHelper.isUserSignedIn();
    expect(isSignedIn).toBe(false);
    
    // Should not be able to access protected pages
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/auth/signin');
  });

  test('protected route access', async ({ page }) => {
    const authHelper = createAuthHelper(page);
    const protectedRoutes = ['/dashboard', '/sessions', '/coach', '/client', '/admin'];
    
    // Ensure user is signed out first
    await authHelper.signOutUser();
    
    // Try to access protected routes without authentication
    for (const route of protectedRoutes) {
      const redirectResult = await authHelper.verifyProtectedRouteRedirect(route);
      expect(redirectResult).toBe(true);
    }
  });

  test('role-based access control', async ({ page }) => {
    const authHelper = createAuthHelper(page);
    
    // Signin as client using helper
    await authHelper.signInUserByRole('client');
    
    // Should be able to access client pages
    const hasClientAccess = await authHelper.verifyUserRole('client');
    expect(hasClientAccess).toBe(true);
    
    // Should not be able to access coach pages
    const coachAccessDenied = await authHelper.verifyProtectedRouteRedirect('/coach');
    expect(coachAccessDenied).toBe(false); // Should not have access
    
    // Should not be able to access admin pages
    const adminAccessDenied = await authHelper.verifyProtectedRouteRedirect('/admin');
    expect(adminAccessDenied).toBe(false); // Should not have access
  });

  test('session persistence', async ({ page }) => {
    const authHelper = createAuthHelper(page);
    const testUser = getTestUserByEmail('test@example.com')!;
    
    // Signin using auth helper
    await authHelper.signInUser(testUser.email, testUser.password);
    
    await expect(page).toHaveURL(/\/(dashboard|client)/, { timeout: 15000 });
    
    // Test auth persistence using the helper
    const persistenceResult = await authHelper.verifyAuthPersistence();
    expect(persistenceResult).toBe(true);
    
    // Should still be authenticated after refresh
    await expect(page).toHaveURL(/\/(dashboard|client)/);
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('password reset flow', async ({ page }) => {
    const authHelper = createAuthHelper(page);
    const testUser = getTestUserByEmail('test@example.com')!;
    
    // Use auth helper for password reset flow
    const resetResult = await authHelper.requestPasswordReset(testUser.email);
    expect(resetResult).toBe(true);
  });

  test('coach role-based access', async ({ page }) => {
    const authHelper = createAuthHelper(page);
    
    // Signin as coach
    await authHelper.signInUserByRole('coach');

    // Should be able to access coach pages
    const hasCoachAccess = await authHelper.verifyUserRole('coach');
    expect(hasCoachAccess).toBe(true);

    // Should be able to navigate to coach dashboard
    await page.goto('/coach');
    await expect(page).toHaveURL(/\/coach/);

    // Should not be able to access admin pages
    const adminAccessDenied = await authHelper.verifyProtectedRouteRedirect('/admin');
    expect(adminAccessDenied).toBe(false);
  });

  test('admin role-based access', async ({ page }) => {
    const authHelper = createAuthHelper(page);
    
    // Signin as admin
    await authHelper.signInUserByRole('admin');

    // Should be able to access admin pages
    const hasAdminAccess = await authHelper.verifyUserRole('admin');
    expect(hasAdminAccess).toBe(true);

    // Should be able to navigate to admin dashboard
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/);
  });

  test('session timeout handling', async ({ page }) => {
    const authHelper = createAuthHelper(page);
    const testUser = getTestUserByEmail('test@example.com')!;
    
    // Signin first
    await authHelper.signInUser(testUser.email, testUser.password);
    
    // Test session timeout
    const timeoutResult = await authHelper.testSessionTimeout();
    expect(timeoutResult).toBe(true);
  });

  test.afterEach(async ({ page }) => {
    // Clean up auth state after each test
    const authHelper = createAuthHelper(page);
    await authHelper.clearAuthState();
  });
});