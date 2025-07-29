import { test, expect } from '@playwright/test';
import { createAuthHelper, testConstants, getTestUserByRole } from '../../../tests/helpers';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the index page
    await page.goto('/');
  });

  test('complete signin flow', async ({ page }) => {
    const authHelper = createAuthHelper(page);
    const testUser = getTestUserByRole('client')!;

    // Should redirect to signin page when not authenticated
    await expect(page).toHaveURL('/auth/signin');

    // Use auth helper for consistent sign in
    await authHelper.signInUser(testUser.email, testUser.password);
    
    // Should redirect to dashboard on successful signin
    await expect(page).toHaveURL(/\/(dashboard|client)/);
    
    // Should show user info in navigation
    await expect(page.locator(testConstants.selectors.userMenu)).toBeVisible();
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
    await page.goto('/auth/signin');
    
    // Navigate to signup
    await page.click('text=Sign up here');
    await expect(page).toHaveURL('/auth/signup');
    
    // Fill out signup form
    await page.fill('[data-testid="first-name-input"]', 'Test');
    await page.fill('[data-testid="last-name-input"]', 'User');
    await page.fill('[data-testid="email-input"]', 'newuser@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.fill('[data-testid="confirm-password-input"]', 'password123');
    
    // Select role
    await page.click('[data-testid="role-select"]');
    await page.click('text=Client');
    
    await page.click('[data-testid="signup-button"]');
    
    // Should redirect to signin with success message
    await expect(page).toHaveURL('/auth/signin');
    await expect(page.locator('text=Account created successfully')).toBeVisible();
  });

  test('signout flow', async ({ page }) => {
    // First signin
    await page.goto('/auth/signin');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="signin-button"]');
    
    await expect(page).toHaveURL('/dashboard');
    
    // Open user menu and signout
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Sign out');
    
    // Should redirect to signin page
    await expect(page).toHaveURL('/auth/signin');
    
    // Should not be able to access protected pages
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/auth/signin');
  });

  test('protected route access', async ({ page }) => {
    // Try to access protected routes without authentication
    const protectedRoutes = ['/dashboard', '/sessions', '/coach', '/client'];
    
    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL('/auth/signin');
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
    await page.goto('/coach');
    await expect(page).not.toHaveURL(/\/coach/); // Redirected away
    
    // Should not be able to access admin pages
    await page.goto('/admin');
    await expect(page).not.toHaveURL(/\/admin/); // Redirected away
  });

  test('session persistence', async ({ page }) => {
    // Signin
    await page.goto('/auth/signin');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="signin-button"]');
    
    await expect(page).toHaveURL('/dashboard');
    
    // Refresh page
    await page.reload();
    
    // Should still be authenticated
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('password reset flow', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Click forgot password link
    await page.click('text=Forgot your password?');
    await expect(page).toHaveURL('/auth/reset-password');
    
    // Fill reset form
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.click('[data-testid="reset-button"]');
    
    // Should show success message
    await expect(page.locator('text=Password reset email sent')).toBeVisible();
  });
});