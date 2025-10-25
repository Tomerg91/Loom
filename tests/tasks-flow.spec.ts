/**
 * E2E Tests for Tasks Module
 * Tests user flows for coach and client task management
 * 
 * Run with: npx playwright test tests/tasks-flow.spec.ts
 */
import { test, expect } from '@playwright/test';

const COACH_EMAIL = 'coach@example.com';
const COACH_PASSWORD = 'TestPassword123!';
const CLIENT_EMAIL = 'client@example.com';
const CLIENT_PASSWORD = 'TestPassword123!';

test.describe('Tasks Module - Coach Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as coach
    await page.goto('/auth/signin');
    await page.fill('input[name="email"]', COACH_EMAIL);
    await page.fill('input[name="password"]', COACH_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/coach/dashboard');
  });

  test('should create a new task with all fields', async ({ page }) => {
    // Navigate to tasks page
    await page.goto('/coach/tasks');
    
    // Click create task button
    await page.click('button:has-text("Create Task")');
    
    // Wait for dialog to open
    await expect(page.locator('role=dialog')).toBeVisible();
    
    // Fill in task details
    await page.fill('input[name="title"]', 'Complete weekly reflection');
    await page.fill('textarea[name="description"]', 'Finish the reflection worksheet and submit by Friday');
    
    // Select client from dropdown
    await page.click('select[name="clientId"]');
    await page.click('option:has-text("John Doe")');
    
    // Select priority
    await page.click('select[name="priority"]');
    await page.click('option:has-text("High")');
    
    // Set due date
    await page.fill('input[name="dueDate"]', '2025-12-31');
    
    // Select category
    await page.click('select[name="category"]');
    await page.click('option:has-text("Reflection")');
    
    // Submit form
    await page.click('button:has-text("Create")');
    
    // Wait for success message
    await expect(page.locator('text=Task created successfully')).toBeVisible();
    
    // Verify task appears in list
    await expect(page.locator('text=Complete weekly reflection')).toBeVisible();
    await expect(page.locator('text=John Doe')).toBeVisible();
    await expect(page.locator('text=High')).toBeVisible();
  });

  test('should save task as template', async ({ page }) => {
    await page.goto('/coach/tasks');
    
    // Create a task
    await page.click('button:has-text("Create Task")');
    await page.fill('input[name="title"]', 'Weekly check-in template');
    await page.click('select[name="clientId"]');
    await page.click('option:first-child');
    
    // Check "Save as template" checkbox
    await page.check('input[name="saveAsTemplate"]');
    
    await page.click('button:has-text("Create")');
    
    // Verify template is saved
    await page.click('button:has-text("Templates")');
    await expect(page.locator('text=Weekly check-in template')).toBeVisible();
  });

  test('should assign task to multiple clients', async ({ page }) => {
    await page.goto('/coach/tasks');
    
    // Create initial task
    await page.click('button:has-text("Create Task")');
    await page.fill('input[name="title"]', 'Group homework assignment');
    await page.click('select[name="clientId"]');
    await page.click('option:first-child');
    await page.click('button:has-text("Create")');
    
    // Click on task to open details
    await page.click('text=Group homework assignment');
    
    // Click assign button
    await page.click('button:has-text("Assign to More Clients")');
    
    // Select multiple clients
    await page.check('input[value="client-id-2"]');
    await page.check('input[value="client-id-3"]');
    
    // Submit assignment
    await page.click('button:has-text("Assign")');
    
    // Verify success
    await expect(page.locator('text=Task assigned successfully')).toBeVisible();
    await expect(page.locator('text=3 clients')).toBeVisible();
  });

  test('should view client progress on task', async ({ page }) => {
    await page.goto('/coach/tasks');
    
    // Click on existing task
    await page.click('tr:has-text("Client task") >> text=View');
    
    // Verify progress section is visible
    await expect(page.locator('text=Progress Updates')).toBeVisible();
    
    // Check progress percentage is displayed
    await expect(page.locator('text=50%')).toBeVisible();
    
    // Check progress notes are visible
    await expect(page.locator('text=Made good progress today')).toBeVisible();
    
    // Check timestamp
    await expect(page.locator('text=/Updated.*ago/')).toBeVisible();
  });

  test('should filter tasks by status', async ({ page }) => {
    await page.goto('/coach/tasks');
    
    // Open status filter
    await page.click('select[name="status"]');
    await page.click('option:has-text("Pending")');
    
    // Wait for filtered results
    await page.waitForTimeout(500);
    
    // Verify only pending tasks are shown
    const taskRows = page.locator('tbody tr');
    const count = await taskRows.count();
    
    for (let i = 0; i < count; i++) {
      await expect(taskRows.nth(i).locator('text=Pending')).toBeVisible();
    }
  });

  test('should filter tasks by priority', async ({ page }) => {
    await page.goto('/coach/tasks');
    
    // Open priority filter
    await page.click('select[name="priority"]');
    await page.click('option:has-text("High")');
    
    // Wait for filtered results
    await page.waitForTimeout(500);
    
    // Verify only high priority tasks are shown
    const taskRows = page.locator('tbody tr');
    const count = await taskRows.count();
    
    for (let i = 0; i < count; i++) {
      await expect(taskRows.nth(i).locator('[data-priority="HIGH"]')).toBeVisible();
    }
  });

  test('should search tasks by title', async ({ page }) => {
    await page.goto('/coach/tasks');
    
    // Type in search box
    await page.fill('input[placeholder*="Search"]', 'reflection');
    
    // Wait for search results (uses deferred value)
    await page.waitForTimeout(1000);
    
    // Verify only matching tasks are shown
    await expect(page.locator('text=Complete weekly reflection')).toBeVisible();
  });
});

test.describe('Tasks Module - Client Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as client
    await page.goto('/auth/signin');
    await page.fill('input[name="email"]', CLIENT_EMAIL);
    await page.fill('input[name="password"]', CLIENT_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/client/dashboard');
  });

  test('should view assigned tasks', async ({ page }) => {
    await page.goto('/client/tasks');
    
    // Verify tasks page loads
    await expect(page.locator('h1:has-text("My Tasks")')).toBeVisible();
    
    // Verify tasks are displayed
    await expect(page.locator('text=Complete weekly reflection')).toBeVisible();
    await expect(page.locator('text=Pending')).toBeVisible();
  });

  test('should filter tasks by status', async ({ page }) => {
    await page.goto('/client/tasks');
    
    // Click on status filter
    await page.click('button:has-text("All")');
    await page.click('button:has-text("In Progress")');
    
    // Verify only in-progress tasks are shown
    await expect(page.locator('text=In Progress')).toBeVisible();
    await expect(page.locator('text=Pending')).not.toBeVisible();
  });

  test('should add progress update with percentage', async ({ page }) => {
    await page.goto('/client/tasks');
    
    // Click on task to open details
    await page.click('text=Complete weekly reflection');
    
    // Click update progress button
    await page.click('button:has-text("Update Progress")');
    
    // Wait for dialog
    await expect(page.locator('role=dialog')).toBeVisible();
    
    // Set progress percentage
    await page.fill('input[name="percentage"]', '75');
    
    // Add notes
    await page.fill('textarea[name="notes"]', 'Made good progress today. Almost done.');
    
    // Submit
    await page.click('button:has-text("Submit")');
    
    // Verify success message
    await expect(page.locator('text=Progress updated successfully')).toBeVisible();
    
    // Verify progress is reflected
    await expect(page.locator('text=75%')).toBeVisible();
  });

  test('should add progress update with file attachment', async ({ page }) => {
    await page.goto('/client/tasks');
    
    // Click on task
    await page.click('text=Complete weekly reflection');
    
    // Click update progress
    await page.click('button:has-text("Update Progress")');
    
    // Set progress
    await page.fill('input[name="percentage"]', '90');
    
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./tests/fixtures/sample-document.pdf');
    
    // Submit
    await page.click('button:has-text("Submit")');
    
    // Verify file is attached
    await expect(page.locator('text=sample-document.pdf')).toBeVisible();
  });

  test('should mark task as complete at 100% progress', async ({ page }) => {
    await page.goto('/client/tasks');
    
    // Click on task
    await page.click('text=Complete weekly reflection');
    
    // Click update progress
    await page.click('button:has-text("Update Progress")');
    
    // Set to 100%
    await page.fill('input[name="percentage"]', '100');
    await page.fill('textarea[name="notes"]', 'All done!');
    
    // Submit
    await page.click('button:has-text("Submit")');
    
    // Verify task status changes to completed
    await expect(page.locator('text=Completed')).toBeVisible();
    await expect(page.locator('text=100%')).toBeVisible();
    
    // Verify completion timestamp is shown
    await expect(page.locator('text=/Completed.*ago/')).toBeVisible();
  });

  test('should view task history', async ({ page }) => {
    await page.goto('/client/tasks');
    
    // Click on completed task
    await page.click('text=Weekly reflection >> nth=0');
    
    // Click history tab
    await page.click('button:has-text("History")');
    
    // Verify progress updates are listed
    await expect(page.locator('text=Progress Update')).toBeVisible();
    await expect(page.locator('text=50%')).toBeVisible();
    await expect(page.locator('text=75%')).toBeVisible();
    await expect(page.locator('text=100%')).toBeVisible();
  });
});

test.describe('Tasks Module - Error Scenarios', () => {
  test('should show validation error for empty title', async ({ page }) => {
    await page.goto('/coach/tasks');
    await page.click('button:has-text("Create Task")');
    
    // Leave title empty
    await page.click('select[name="clientId"]');
    await page.click('option:first-child');
    
    // Try to submit
    await page.click('button:has-text("Create")');
    
    // Verify error message
    await expect(page.locator('text=Title is required')).toBeVisible();
  });

  test('should prevent client from accessing coach tasks page', async ({ page }) => {
    // Login as client
    await page.goto('/auth/signin');
    await page.fill('input[name="email"]', CLIENT_EMAIL);
    await page.fill('input[name="password"]', CLIENT_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/client/dashboard');
    
    // Try to access coach tasks page
    await page.goto('/coach/tasks');
    
    // Verify access denied or redirect
    await expect(page).toHaveURL(/client\/dashboard|auth\/signin|403/);
    await expect(page.locator('text=/Access denied|Unauthorized|Forbidden/i')).toBeVisible();
  });

  test('should handle network error gracefully', async ({ page, context }) => {
    // Simulate offline mode
    await context.setOffline(true);
    
    await page.goto('/coach/tasks');
    
    // Try to create task
    await page.click('button:has-text("Create Task")');
    await page.fill('input[name="title"]', 'Test task');
    await page.click('button:has-text("Create")');
    
    // Verify error message
    await expect(page.locator('text=/Network error|Failed to create|Connection error/i')).toBeVisible();
    
    // Re-enable network
    await context.setOffline(false);
  });

  test('should reject invalid progress percentage', async ({ page }) => {
    await page.goto('/client/tasks');
    await page.click('text=Complete weekly reflection');
    await page.click('button:has-text("Update Progress")');
    
    // Try invalid percentage
    await page.fill('input[name="percentage"]', '150');
    await page.click('button:has-text("Submit")');
    
    // Verify error
    await expect(page.locator('text=/must be between 0 and 100/i')).toBeVisible();
  });

  test('should reject negative progress percentage', async ({ page }) => {
    await page.goto('/client/tasks');
    await page.click('text=Complete weekly reflection');
    await page.click('button:has-text("Update Progress")');
    
    // Try negative percentage
    await page.fill('input[name="percentage"]', '-10');
    await page.click('button:has-text("Submit")');
    
    // Verify error
    await expect(page.locator('text=/must be between 0 and 100/i')).toBeVisible();
  });
});

test.describe('Tasks Module - Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/coach/tasks');
    
    // Tab through elements
    await page.keyboard.press('Tab'); // Focus on first interactive element
    await page.keyboard.press('Tab'); // Move to next element
    await page.keyboard.press('Enter'); // Activate element
    
    // Verify keyboard navigation works
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/coach/tasks');
    
    // Check for ARIA labels
    await expect(page.locator('[aria-label="Create new task"]')).toBeVisible();
    await expect(page.locator('[aria-label="Filter tasks by status"]')).toBeVisible();
    await expect(page.locator('[aria-label="Search tasks"]')).toBeVisible();
  });

  test('should announce status changes to screen readers', async ({ page }) => {
    await page.goto('/coach/tasks');
    await page.click('button:has-text("Create Task")');
    await page.fill('input[name="title"]', 'Test task');
    await page.click('button:has-text("Create")');
    
    // Check for aria-live region
    await expect(page.locator('[aria-live="polite"]')).toContainText('Task created successfully');
  });
});
