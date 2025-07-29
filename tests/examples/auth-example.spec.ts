import { test, expect } from '@playwright/test';
import { createAuthHelper, testConstants, getTestUserByRole } from '../helpers';

/**
 * Example E2E test demonstrating the test infrastructure
 * This file shows how to use the test helpers and utilities
 */

test.describe('Authentication Examples', () => {
  test.beforeEach(async ({ page }) => {
    // Each test starts with a clean slate
    await page.goto('/');
  });

  test('complete sign in flow with test user', async ({ page }) => {
    const authHelper = createAuthHelper(page);
    
    // Use predefined test user
    const testUser = getTestUserByRole('client');
    expect(testUser).toBeTruthy();
    
    // Sign in using helper
    await authHelper.signInUser(testUser!.email, testUser!.password);
    
    // Verify successful sign in
    await expect(page).toHaveURL(/\/(dashboard|client)/);
    await expect(page.locator(testConstants.selectors.userMenu)).toBeVisible();
  });

  test('sign in and verify role-based access', async ({ page }) => {
    const authHelper = createAuthHelper(page);
    
    // Sign in as coach
    await authHelper.signInUserByRole('coach');
    
    // Verify coach can access coach pages
    const hasCoachAccess = await authHelper.verifyUserRole('coach');
    expect(hasCoachAccess).toBe(true);
    
    // Verify coach cannot access admin pages
    await page.goto('/admin');
    // Should be redirected away from admin pages
    await expect(page).not.toHaveURL(/\/admin/);
  });

  test('sign out flow', async ({ page }) => {
    const authHelper = createAuthHelper(page);
    
    // First sign in
    await authHelper.signInUserByRole('client');
    
    // Verify signed in
    expect(await authHelper.isUserSignedIn()).toBe(true);
    
    // Sign out
    await authHelper.signOutUser();
    
    // Verify signed out
    await expect(page).toHaveURL('/auth/signin');
    expect(await authHelper.isUserSignedIn()).toBe(false);
  });

  test('protected route redirects when not authenticated', async ({ page }) => {
    const authHelper = createAuthHelper(page);
    
    // Ensure user is signed out
    await authHelper.signOutUser();
    
    // Try to access protected routes
    const protectedRoutes = ['/dashboard', '/sessions', '/coach', '/client'];
    
    for (const route of protectedRoutes) {
      const redirected = await authHelper.verifyProtectedRouteRedirect(route);
      expect(redirected).toBe(true);
    }
  });

  test('session persistence across page refresh', async ({ page }) => {
    const authHelper = createAuthHelper(page);
    
    // Sign in
    await authHelper.signInUserByRole('client');
    
    // Verify auth persists across refresh
    const persists = await authHelper.verifyAuthPersistence();
    expect(persists).toBe(true);
  });

  test('password reset request', async ({ page }) => {
    const authHelper = createAuthHelper(page);
    const testUser = getTestUserByRole('client');
    
    // Request password reset
    const success = await authHelper.requestPasswordReset(testUser!.email);
    expect(success).toBe(true);
  });

  test('user registration flow', async ({ page }) => {
    const authHelper = createAuthHelper(page);
    
    // Generate unique test data
    const uniqueId = Math.random().toString(36).substring(7);
    const userData = {
      firstName: 'Test',
      lastName: 'User',
      email: `testuser-${uniqueId}@example.com`,
      password: 'password123',
      role: 'client' as const,
    };
    
    // Register new user
    const success = await authHelper.registerNewUser(userData);
    expect(success).toBe(true);
    
    // Should be on sign in page with success message
    await expect(page).toHaveURL('/auth/signin');
    await expect(page.locator(`text=${testConstants.successMessages.accountCreated}`)).toBeVisible();
  });

  test('sign in validation errors', async ({ page }) => {
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

  test('sign in with invalid credentials', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Fill form with invalid credentials
    await page.fill(testConstants.selectors.emailInput, 'wrong@example.com');
    await page.fill(testConstants.selectors.passwordInput, 'wrongpassword');
    await page.click(testConstants.selectors.signInButton);
    
    // Should show error message
    await expect(page.locator(`text=${testConstants.errorMessages.invalidCredentials}`)).toBeVisible();
    
    // Should stay on sign in page
    await expect(page).toHaveURL('/auth/signin');
  });

  test('auth state cleanup', async ({ page }) => {
    const authHelper = createAuthHelper(page);
    
    // Sign in
    await authHelper.signInUserByRole('client');
    expect(await authHelper.isUserSignedIn()).toBe(true);
    
    // Clear auth state
    await authHelper.clearAuthState();
    
    // Navigate to protected page - should be redirected
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/auth/signin');
  });

  test('concurrent user sessions', async ({ browser }) => {
    // Create two separate contexts (like different browsers/users)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    const auth1 = createAuthHelper(page1);
    const auth2 = createAuthHelper(page2);
    
    try {
      // Sign in different users in each context
      await auth1.signInUserByRole('client');
      await auth2.signInUserByRole('coach');
      
      // Verify both are signed in independently
      expect(await auth1.isUserSignedIn()).toBe(true);
      expect(await auth2.isUserSignedIn()).toBe(true);
      
      // Verify they have different access levels
      await page1.goto('/coach');
      await expect(page1).not.toHaveURL(/\/coach/); // Client can't access coach pages
      
      await page2.goto('/coach');
      await expect(page2).toHaveURL(/\/coach/); // Coach can access coach pages
      
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});