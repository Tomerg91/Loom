import { test, expect } from '@playwright/test';

test.describe('Session Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as client
    await page.goto('/auth/signin');
    await page.fill('[data-testid="email-input"]', 'client@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="signin-button"]');
    
    await expect(page).toHaveURL('/dashboard');
  });

  test('complete session booking flow', async ({ page }) => {
    // Navigate to sessions page
    await page.click('text=Sessions');
    await expect(page).toHaveURL('/sessions');
    
    // Click book new session
    await page.click('[data-testid="book-session-button"]');
    
    // Fill session details
    await page.fill('[data-testid="session-title"]', 'Career Development Session');
    await page.fill('[data-testid="session-description"]', 'Discussing my career goals and next steps');
    
    // Select session type
    await page.click('[data-testid="session-type-select"]');
    await page.click('text=Individual');
    
    // Select coach
    await page.click('[data-testid="coach-select"]');
    await page.click('text=John Coach');
    
    // Wait for time slots to load
    await page.waitForSelector('[data-testid="time-slot"]');
    
    // Select first available time slot
    await page.click('[data-testid="time-slot"]:first-child');
    
    // Submit booking
    await page.click('[data-testid="book-session-submit"]');
    
    // Should show success message
    await expect(page.locator('text=Session booked successfully')).toBeVisible();
    
    // Should redirect to sessions list
    await expect(page).toHaveURL('/sessions');
    
    // Should see the new session in the list
    await expect(page.locator('text=Career Development Session')).toBeVisible();
    await expect(page.locator('text=scheduled')).toBeVisible();
  });

  test('session booking validation', async ({ page }) => {
    await page.goto('/sessions');
    await page.click('[data-testid="book-session-button"]');
    
    // Try to submit empty form
    await page.click('[data-testid="book-session-submit"]');
    
    // Should show validation errors
    await expect(page.locator('text=Title is required')).toBeVisible();
    await expect(page.locator('text=Coach selection is required')).toBeVisible();
    await expect(page.locator('text=Time slot selection is required')).toBeVisible();
    
    // Fill title only
    await page.fill('[data-testid="session-title"]', 'Test Session');
    await page.click('[data-testid="book-session-submit"]');
    
    // Should still show coach and time slot errors
    await expect(page.locator('text=Coach selection is required')).toBeVisible();
    await expect(page.locator('text=Time slot selection is required')).toBeVisible();
  });

  test('time slot updates when coach changes', async ({ page }) => {
    await page.goto('/sessions');
    await page.click('[data-testid="book-session-button"]');
    
    // Select first coach
    await page.click('[data-testid="coach-select"]');
    await page.click('text=John Coach');
    
    // Wait for time slots to load
    await page.waitForSelector('[data-testid="time-slot"]');
    const firstCoachSlots = await page.locator('[data-testid="time-slot"]').count();
    
    // Select different coach
    await page.click('[data-testid="coach-select"]');
    await page.click('text=Jane Mentor');
    
    // Wait for time slots to update
    await page.waitForTimeout(1000);
    const secondCoachSlots = await page.locator('[data-testid="time-slot"]').count();
    
    // Time slots should be different (assuming different coaches have different availability)
    expect(firstCoachSlots).not.toBe(secondCoachSlots);
  });

  test('unavailable time slots are not selectable', async ({ page }) => {
    await page.goto('/sessions');
    await page.click('[data-testid="book-session-button"]');
    
    // Select coach
    await page.click('[data-testid="coach-select"]');
    await page.click('text=John Coach');
    
    await page.waitForSelector('[data-testid="time-slot"]');
    
    // All visible time slots should be clickable (available)
    const timeSlots = page.locator('[data-testid="time-slot"]');
    const count = await timeSlots.count();
    
    for (let i = 0; i < count; i++) {
      const slot = timeSlots.nth(i);
      await expect(slot).not.toHaveAttribute('disabled');
      await expect(slot).not.toHaveClass(/disabled/);
    }
  });

  test('session booking error handling', async ({ page }) => {
    await page.goto('/sessions');
    await page.click('[data-testid="book-session-button"]');
    
    // Mock API error response
    await page.route('**/api/sessions/book', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Time slot is no longer available'
        })
      });
    });
    
    // Fill and submit form
    await page.fill('[data-testid="session-title"]', 'Test Session');
    await page.click('[data-testid="coach-select"]');
    await page.click('text=John Coach');
    await page.waitForSelector('[data-testid="time-slot"]');
    await page.click('[data-testid="time-slot"]:first-child');
    await page.click('[data-testid="book-session-submit"]');
    
    // Should show error message
    await expect(page.locator('text=Time slot is no longer available')).toBeVisible();
    
    // Should stay on booking form
    await expect(page.locator('[data-testid="session-title"]')).toBeVisible();
  });

  test('view session details', async ({ page }) => {
    await page.goto('/sessions');
    
    // Should see existing sessions
    await expect(page.locator('[data-testid="session-item"]').first()).toBeVisible();
    
    // Click on first session
    await page.click('[data-testid="session-item"]:first-child');
    
    // Should navigate to session details
    await expect(page).toHaveURL(/\/sessions\/[^\/]+$/);
    
    // Should show session details
    await expect(page.locator('[data-testid="session-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-description"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-coach"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-date"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-status"]')).toBeVisible();
  });

  test('cancel session booking', async ({ page }) => {
    await page.goto('/sessions');
    
    // Click on a scheduled session
    await page.click('[data-testid="session-item"]:has-text("scheduled")');
    
    // Click cancel button
    await page.click('[data-testid="cancel-session-button"]');
    
    // Confirm cancellation in dialog
    await page.click('[data-testid="confirm-cancel-button"]');
    
    // Should show success message
    await expect(page.locator('text=Session cancelled successfully')).toBeVisible();
    
    // Should redirect back to sessions list
    await expect(page).toHaveURL('/sessions');
    
    // Session should show as cancelled
    await expect(page.locator('text=cancelled')).toBeVisible();
  });

  test('reschedule session', async ({ page }) => {
    await page.goto('/sessions');
    
    // Click on a scheduled session
    await page.click('[data-testid="session-item"]:has-text("scheduled")');
    
    // Click reschedule button
    await page.click('[data-testid="reschedule-session-button"]');
    
    // Should show reschedule form with new time slots
    await expect(page.locator('[data-testid="reschedule-form"]')).toBeVisible();
    await page.waitForSelector('[data-testid="time-slot"]');
    
    // Select new time slot
    await page.click('[data-testid="time-slot"]:first-child');
    
    // Submit reschedule
    await page.click('[data-testid="reschedule-submit"]');
    
    // Should show success message
    await expect(page.locator('text=Session rescheduled successfully')).toBeVisible();
    
    // Should update session details
    await expect(page.locator('[data-testid="session-date"]')).toBeVisible();
  });

  test('session filters and search', async ({ page }) => {
    await page.goto('/sessions');
    
    // Test status filter
    await page.click('[data-testid="status-filter"]');
    await page.click('text=Scheduled');
    
    // Should only show scheduled sessions
    const scheduledSessions = page.locator('[data-testid="session-item"]:has-text("scheduled")');
    await expect(scheduledSessions.first()).toBeVisible();
    
    // Should not show completed sessions
    const completedSessions = page.locator('[data-testid="session-item"]:has-text("completed")');
    await expect(completedSessions).toHaveCount(0);
    
    // Test search
    await page.fill('[data-testid="session-search"]', 'Career');
    
    // Should filter sessions by search term
    await expect(page.locator('[data-testid="session-item"]:has-text("Career")')).toBeVisible();
    
    // Clear search
    await page.fill('[data-testid="session-search"]', '');
    
    // Should show all sessions again
    await expect(page.locator('[data-testid="session-item"]').first()).toBeVisible();
  });

  test('session reminders and notifications', async ({ page }) => {
    await page.goto('/sessions');
    
    // Should see notification bell in header
    await expect(page.locator('[data-testid="notification-bell"]')).toBeVisible();
    
    // Check for unread notification indicator
    const unreadBadge = page.locator('[data-testid="unread-count"]');
    if (await unreadBadge.isVisible()) {
      // Click on notifications
      await page.click('[data-testid="notification-bell"]');
      
      // Should show notification dropdown
      await expect(page.locator('[data-testid="notification-dropdown"]')).toBeVisible();
      
      // Should see session reminders
      await expect(page.locator('text=Session Reminder')).toBeVisible();
      
      // Click on a notification
      await page.click('[data-testid="notification-item"]:first-child');
      
      // Should mark as read and navigate to related session
      await expect(page).toHaveURL(/\/sessions/);
    }
  });
});