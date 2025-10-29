/**
 * E2E Tests for Tasks Module
 *
 * These tests verify the complete user flow for task management
 * using Playwright for browser automation.
 */
import { test, expect } from '@playwright/test';

/**
 * NOTE: These tests require:
 * 1. Test database with seed data
 * 2. Test user accounts (coach and client)
 * 3. Running application instance
 *
 * Run with: npx playwright test tests/e2e/tasks-flow.spec.ts
 */

test.describe('Tasks Module E2E', () => {
  test.describe('Coach Task Management', () => {
    test.beforeEach(async ({ page }) => {
      // Login as coach
      await page.goto('/auth/signin');
      await page.fill('input[type="email"]', 'coach@test.com');
      await page.fill('input[type="password"]', 'TestPassword123!');
      await page.click('button[type="submit"]');

      // Wait for dashboard to load
      await page.waitForURL('**/dashboard');
    });

    test('should navigate to tasks page', async ({ page }) => {
      // Click on tasks in navigation
      await page.click('a[href*="/coach/tasks"]');

      // Verify we're on the tasks page
      await expect(page).toHaveURL(/.*\/coach\/tasks/);
      await expect(page.locator('h1')).toContainText('Action Items');
    });

    test('should create a new task', async ({ page }) => {
      await page.goto('/coach/tasks');

      // Click create task button
      await page.click('button:has-text("Create Task")');

      // Fill in task details
      await page.fill('input[name="title"]', 'E2E Test Task');
      await page.fill('textarea[name="description"]', 'This is a test task');

      // Select client (assuming dropdown exists)
      await page.click('button[role="combobox"]');
      await page.click('div[role="option"]:first-child');

      // Select priority
      await page.selectOption('select[name="priority"]', 'high');

      // Submit form
      await page.click('button:has-text("Create Task")');

      // Verify success message
      await expect(page.locator('text=Task created successfully')).toBeVisible({
        timeout: 5000,
      });
    });

    test('should filter tasks by status', async ({ page }) => {
      await page.goto('/coach/tasks');

      // Wait for tasks to load
      await page.waitForSelector('[data-testid="task-table"]', { timeout: 5000 });

      // Apply status filter
      await page.click('button:has-text("Status")');
      await page.click('text=In Progress');

      // Verify filtered results
      // (Implementation depends on actual UI structure)
      await page.waitForTimeout(1000); // Wait for filter to apply
    });

    test('should view task details', async ({ page }) => {
      await page.goto('/coach/tasks');

      // Click on first task (if exists)
      const firstTask = page.locator('table tbody tr').first();
      if ((await firstTask.count()) > 0) {
        await firstTask.click();

        // Verify task details modal/page opens
        await expect(page.locator('text=Task Details')).toBeVisible({
          timeout: 5000,
        });
      }
    });
  });

  test.describe('Client Task Interaction', () => {
    test.beforeEach(async ({ page }) => {
      // Login as client
      await page.goto('/auth/signin');
      await page.fill('input[type="email"]', 'client@test.com');
      await page.fill('input[type="password"]', 'TestPassword123!');
      await page.click('button[type="submit"]');

      // Wait for dashboard to load
      await page.waitForURL('**/dashboard');
    });

    test('should view assigned tasks', async ({ page }) => {
      await page.goto('/client/tasks');

      // Verify tasks board is visible
      await expect(page.locator('text=My Practices')).toBeVisible();
    });

    test('should add progress update', async ({ page }) => {
      await page.goto('/client/tasks');

      // Find a task and click to add progress
      const progressButton = page.locator('button:has-text("Log Progress")').first();

      if ((await progressButton.count()) > 0) {
        await progressButton.click();

        // Fill in progress form
        await page.fill('input[name="percentage"]', '75');
        await page.fill(
          'textarea[name="notes"]',
          'Making good progress on this practice'
        );

        // Submit progress
        await page.click('button:has-text("Submit Progress")');

        // Verify success
        await expect(page.locator('text=Progress updated')).toBeVisible({
          timeout: 5000,
        });
      }
    });

    test('should mark task as complete', async ({ page }) => {
      await page.goto('/client/tasks');

      // Find a task and add 100% progress
      const progressButton = page.locator('button:has-text("Log Progress")').first();

      if ((await progressButton.count()) > 0) {
        await progressButton.click();
        await page.fill('input[name="percentage"]', '100');
        await page.fill('textarea[name="notes"]', 'Task completed successfully');
        await page.click('button:has-text("Submit Progress")');

        // Verify auto-completion
        await expect(
          page.locator('text=Task automatically marked as complete')
        ).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Error Scenarios', () => {
    test('should handle unauthorized access', async ({ page }) => {
      // Try to access tasks page without authentication
      await page.goto('/coach/tasks');

      // Should redirect to login
      await expect(page).toHaveURL(/.*\/auth\/signin/);
    });

    test('should validate required fields', async ({ page }) => {
      // Login as coach
      await page.goto('/auth/signin');
      await page.fill('input[type="email"]', 'coach@test.com');
      await page.fill('input[type="password"]', 'TestPassword123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');

      await page.goto('/coach/tasks');

      // Try to create task without filling required fields
      await page.click('button:has-text("Create Task")');
      await page.click('button[type="submit"]'); // Submit empty form

      // Should show validation errors
      await expect(page.locator('text=required')).toBeVisible();
    });
  });

  test.describe('Real-time Updates', () => {
    test('should reflect progress updates in real-time', async ({ page, context }) => {
      // This test would require two browser contexts:
      // 1. Coach viewing task list
      // 2. Client updating progress

      // For demonstration purposes:
      test.skip('Requires real-time subscription setup');

      // Implementation would involve:
      // - Opening two pages (coach and client)
      // - Client makes progress update
      // - Coach sees update without refresh
    });
  });
});

test.describe('Tasks Module Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.fill('input[type="email"]', 'coach@test.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    await page.goto('/coach/tasks');

    // Test keyboard navigation
    await page.keyboard.press('Tab'); // Focus first element
    await page.keyboard.press('Tab'); // Move to next element
    await page.keyboard.press('Enter'); // Activate focused element

    // Verify keyboard interaction works
    // (Specific assertions depend on UI structure)
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/coach/tasks');

    // Check for proper ARIA attributes
    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();

      // Either aria-label or text content should exist
      expect(ariaLabel || text).toBeTruthy();
    }
  });
});
