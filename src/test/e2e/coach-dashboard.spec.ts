import { test, expect } from '@playwright/test';

test.describe('Coach Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as coach
    await page.goto('/auth/signin');
    await page.fill('[data-testid="email-input"]', 'coach@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="signin-button"]');
    
    await expect(page).toHaveURL('/dashboard');
  });

  test('coach dashboard overview', async ({ page }) => {
    await page.goto('/coach');
    
    // Should show coach-specific dashboard
    await expect(page.locator('text=Coach Dashboard')).toBeVisible();
    
    // Should show key metrics
    await expect(page.locator('[data-testid="total-clients"]')).toBeVisible();
    await expect(page.locator('[data-testid="upcoming-sessions"]')).toBeVisible();
    await expect(page.locator('[data-testid="completed-sessions"]')).toBeVisible();
    await expect(page.locator('[data-testid="monthly-revenue"]')).toBeVisible();
    
    // Should show upcoming sessions list
    await expect(page.locator('[data-testid="upcoming-sessions-list"]')).toBeVisible();
    
    // Should show recent notes
    await expect(page.locator('[data-testid="recent-notes"]')).toBeVisible();
  });

  test('manage availability', async ({ page }) => {
    await page.goto('/coach/availability');
    
    // Should show availability management page
    await expect(page.locator('text=Manage Availability')).toBeVisible();
    
    // Should show weekly calendar
    await expect(page.locator('[data-testid="availability-calendar"]')).toBeVisible();
    
    // Add new time slot
    await page.click('[data-testid="add-time-slot"]');
    
    // Fill time slot form
    await page.selectOption('[data-testid="day-select"]', 'monday');
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '10:00');
    
    await page.click('[data-testid="save-time-slot"]');
    
    // Should show success message
    await expect(page.locator('text=Time slot added successfully')).toBeVisible();
    
    // Should see new time slot in calendar
    await expect(page.locator('[data-testid="time-slot-monday-0900"]')).toBeVisible();
  });

  test('edit availability time slot', async ({ page }) => {
    await page.goto('/coach/availability');
    
    // Click on existing time slot
    await page.click('[data-testid="time-slot"]:first-child');
    
    // Should show edit form
    await expect(page.locator('[data-testid="edit-time-slot-form"]')).toBeVisible();
    
    // Modify time
    await page.fill('[data-testid="end-time"]', '11:00');
    
    await page.click('[data-testid="save-time-slot"]');
    
    // Should show success message
    await expect(page.locator('text=Time slot updated successfully')).toBeVisible();
    
    // Should see updated time in calendar
    await expect(page.locator('text=11:00')).toBeVisible();
  });

  test('delete availability time slot', async ({ page }) => {
    await page.goto('/coach/availability');
    
    // Click delete on a time slot
    await page.click('[data-testid="delete-time-slot"]:first-child');
    
    // Confirm deletion
    await page.click('[data-testid="confirm-delete"]');
    
    // Should show success message
    await expect(page.locator('text=Time slot deleted successfully')).toBeVisible();
    
    // Time slot should be removed from calendar
    // This test would need specific slot identifier to verify removal
  });

  test('view and manage client notes', async ({ page }) => {
    await page.goto('/coach/notes');
    
    // Should show notes management page
    await expect(page.locator('text=Client Notes')).toBeVisible();
    
    // Should show existing notes
    await expect(page.locator('[data-testid="notes-list"]')).toBeVisible();
    
    // Create new note
    await page.click('[data-testid="create-note-button"]');
    
    // Fill note form
    await page.selectOption('[data-testid="client-select"]', 'client-1');
    await page.fill('[data-testid="note-title"]', 'Session Progress Note');
    await page.fill('[data-testid="note-content"]', 'Client is making good progress on their goals.');
    
    // Select privacy level
    await page.click('[data-testid="privacy-select"]');
    await page.click('text=Shared with client');
    
    // Add tags
    await page.fill('[data-testid="tags-input"]', 'progress, goals');
    
    await page.click('[data-testid="save-note"]');
    
    // Should show success message
    await expect(page.locator('text=Note saved successfully')).toBeVisible();
    
    // Should see new note in list
    await expect(page.locator('text=Session Progress Note')).toBeVisible();
  });

  test('search and filter notes', async ({ page }) => {
    await page.goto('/coach/notes');
    
    // Search for specific note
    await page.fill('[data-testid="notes-search"]', 'progress');
    
    // Should filter notes by search term
    await expect(page.locator('[data-testid="note-item"]:has-text("progress")')).toBeVisible();
    
    // Filter by client
    await page.selectOption('[data-testid="client-filter"]', 'client-1');
    
    // Should show only notes for selected client
    await expect(page.locator('[data-testid="note-item"]')).toBeVisible();
    
    // Filter by privacy level
    await page.selectOption('[data-testid="privacy-filter"]', 'private');
    
    // Should show only private notes
    const privateNotes = page.locator('[data-testid="note-item"]:has-text("Private")');
    await expect(privateNotes.first()).toBeVisible();
  });

  test('edit existing note', async ({ page }) => {
    await page.goto('/coach/notes');
    
    // Click on existing note
    await page.click('[data-testid="note-item"]:first-child');
    
    // Should show note details
    await expect(page.locator('[data-testid="note-details"]')).toBeVisible();
    
    // Click edit button
    await page.click('[data-testid="edit-note-button"]');
    
    // Modify note content
    await page.fill('[data-testid="note-content"]', 'Updated note content with new insights.');
    
    await page.click('[data-testid="save-note"]');
    
    // Should show success message
    await expect(page.locator('text=Note updated successfully')).toBeVisible();
    
    // Should see updated content
    await expect(page.locator('text=Updated note content')).toBeVisible();
  });

  test('session management from coach view', async ({ page }) => {
    await page.goto('/coach');
    
    // Click on upcoming session
    await page.click('[data-testid="upcoming-session"]:first-child');
    
    // Should navigate to session details
    await expect(page).toHaveURL(/\/sessions\/[^\/]+$/);
    
    // Should show coach-specific actions
    await expect(page.locator('[data-testid="start-session-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="add-notes-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="reschedule-session-button"]')).toBeVisible();
  });

  test('mark session as completed', async ({ page }) => {
    await page.goto('/sessions');
    
    // Click on scheduled session
    await page.click('[data-testid="session-item"]:has-text("scheduled")');
    
    // Start session
    await page.click('[data-testid="start-session-button"]');
    
    // Should show in-session interface
    await expect(page.locator('[data-testid="session-timer"]')).toBeVisible();
    await expect(page.locator('[data-testid="end-session-button"]')).toBeVisible();
    
    // End session
    await page.click('[data-testid="end-session-button"]');
    
    // Should show session completion form
    await expect(page.locator('[data-testid="session-summary-form"]')).toBeVisible();
    
    // Fill summary
    await page.fill('[data-testid="session-summary"]', 'Great session, client made significant progress.');
    
    await page.click('[data-testid="complete-session"]');
    
    // Should show success message
    await expect(page.locator('text=Session completed successfully')).toBeVisible();
    
    // Should show as completed in session list
    await expect(page.locator('text=completed')).toBeVisible();
  });

  test('view client progress and history', async ({ page }) => {
    await page.goto('/coach');
    
    // Click on client in list
    await page.click('[data-testid="client-item"]:first-child');
    
    // Should navigate to client profile
    await expect(page).toHaveURL(/\/coach\/clients\/[^\/]+$/);
    
    // Should show client information
    await expect(page.locator('[data-testid="client-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="client-email"]')).toBeVisible();
    
    // Should show session history
    await expect(page.locator('[data-testid="session-history"]')).toBeVisible();
    
    // Should show notes for this client
    await expect(page.locator('[data-testid="client-notes"]')).toBeVisible();
    
    // Should show progress metrics
    await expect(page.locator('[data-testid="progress-chart"]')).toBeVisible();
  });

  test('coach statistics and analytics', async ({ page }) => {
    await page.goto('/coach');
    
    // Should show monthly overview
    await expect(page.locator('[data-testid="monthly-stats"]')).toBeVisible();
    
    // Click on detailed analytics
    await page.click('[data-testid="view-analytics"]');
    
    // Should show detailed analytics page
    await expect(page.locator('text=Analytics Dashboard')).toBeVisible();
    
    // Should show various charts and metrics
    await expect(page.locator('[data-testid="sessions-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="client-satisfaction"]')).toBeVisible();
  });

  test('export coach data', async ({ page }) => {
    await page.goto('/coach');
    
    // Click export button
    await page.click('[data-testid="export-data"]');
    
    // Should show export options
    await expect(page.locator('[data-testid="export-dialog"]')).toBeVisible();
    
    // Select export options
    await page.check('[data-testid="export-sessions"]');
    await page.check('[data-testid="export-notes"]');
    
    // Select date range
    await page.fill('[data-testid="export-start-date"]', '2024-01-01');
    await page.fill('[data-testid="export-end-date"]', '2024-01-31');
    
    // Start export
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="start-export"]');
    
    // Should trigger file download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/coach-data-export.*\.csv$/);
  });
});