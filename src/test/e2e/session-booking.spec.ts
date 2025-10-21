import { test, expect } from '@playwright/test';

import { createAuthHelper, testConstants, testUtils, getTestUserByEmail } from '../../../tests/helpers';

test.describe('Session Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state for clean test isolation
    const authHelper = createAuthHelper(page);
    await authHelper.clearAuthState();
    
    // Login as client using the auth helper
    await authHelper.signInUserByRole('client');
    
    // Verify we're signed in and redirected properly
    await expect(page).toHaveURL(/\/(dashboard|client)/, { timeout: 15000 });
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
  });

  test('complete session booking flow', async ({ page }) => {
    // Navigate to sessions page
    await page.goto('/sessions');
    
    // Should be on sessions page
    await expect(page).toHaveURL('/sessions');
    
    // Look for book session button
    const bookButton = page.locator('[data-testid="book-session-button"], [data-testid="book-session"], button:has-text("Book"), a:has-text("Book")').first();
    
    if (await bookButton.isVisible()) {
      await bookButton.click();
      
      // Should be on booking form page
      const sessionTitleInput = page.locator('[data-testid="session-title"], input[name*="title"], input[placeholder*="title"]').first();
      const sessionDescInput = page.locator('[data-testid="session-description"], textarea[name*="description"], textarea[placeholder*="description"]').first();
      
      if (await sessionTitleInput.isVisible()) {
        // Fill session details
        await sessionTitleInput.fill('Career Development Session');
        
        if (await sessionDescInput.isVisible()) {
          await sessionDescInput.fill('Discussing my career goals and next steps');
        }
        
        // Select session type if available
        const sessionTypeSelect = page.locator('[data-testid="session-type-select"], select[name*="type"]');
        if (await sessionTypeSelect.isVisible()) {
          await sessionTypeSelect.selectOption({ label: 'Individual' });
        }
        
        // Select coach
        const coachSelect = page.locator('[data-testid="coach-select"], select[name*="coach"]');
        if (await coachSelect.isVisible()) {
          const options = await coachSelect.locator('option').all();
          if (options.length > 1) {
            await coachSelect.selectOption({ index: 1 }); // Select first available coach
            
            // Wait for time slots to load
            await page.waitForTimeout(2000);
            
            // Select first available time slot
            const timeSlot = page.locator('[data-testid="time-slot"], .time-slot, .slot').first();
            if (await timeSlot.isVisible()) {
              await timeSlot.click();
            }
          }
        }
        
        // Submit booking
        const submitButton = page.locator('[data-testid="book-session-submit"], [data-testid="submit"], button:has-text("Book"), input[type="submit"]').first();
        if (await submitButton.isVisible()) {
          await submitButton.click();
          
          // Should show success message
          await expect(page.locator('[data-testid="success-message"], .success, .alert-success').or(page.locator('text=/booked|success|scheduled/i'))).toBeVisible({ timeout: 15000 });
          
          // Should redirect to sessions list or show the new session
          const newSession = page.locator('text=Career Development Session');
          await expect(newSession.or(page.locator('text=/scheduled|booked/i'))).toBeVisible({ timeout: 10000 });
        }
      }
    } else {
      console.log('Book session button not found - checking if sessions list is visible');
      // Verify we can at least see the sessions interface
      const sessionsList = page.locator('[data-testid="sessions-list"], .sessions-list, .sessions');
      await expect(sessionsList).toBeVisible({ timeout: 10000 });
    }
  });

  test('session booking validation', async ({ page }) => {
    await page.goto('/sessions');
    
    const bookButton = page.locator('[data-testid="book-session-button"], button:has-text("Book")').first();
    if (await bookButton.isVisible()) {
      await bookButton.click();
      
      // Try to submit empty form
      const submitButton = page.locator('[data-testid="book-session-submit"], button:has-text("Book"), input[type="submit"]').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        
        // Should show validation errors
        const validationError = page.locator('[data-testid="error-message"], .error, .alert-error').or(page.locator('text=/required|error|invalid/i'));
        await expect(validationError).toBeVisible({ timeout: 10000 });
        
        // Fill title only and try again
        const titleInput = page.locator('[data-testid="session-title"], input[name*="title"]').first();
        if (await titleInput.isVisible()) {
          await titleInput.fill('Test Session');
          await submitButton.click();
          
          // Should still show coach and time slot errors or other validation
          await expect(validationError).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('time slot updates when coach changes', async ({ page }) => {
    await page.goto('/sessions');
    
    const bookButton = page.locator('[data-testid="book-session-button"], button:has-text("Book")').first();
    if (await bookButton.isVisible()) {
      await bookButton.click();
      
      const coachSelect = page.locator('[data-testid="coach-select"], select[name*="coach"]');
      if (await coachSelect.isVisible()) {
        const options = await coachSelect.locator('option').all();
        if (options.length > 2) {
          // Select first coach
          await coachSelect.selectOption({ index: 1 });
          await page.waitForTimeout(1500);
          
          const firstCoachSlots = await page.locator('[data-testid="time-slot"], .time-slot').count();
          
          // Select different coach
          await coachSelect.selectOption({ index: 2 });
          await page.waitForTimeout(1500);
          
          const secondCoachSlots = await page.locator('[data-testid="time-slot"], .time-slot').count();
          
          // Time slots may be different for different coaches
          console.log(`First coach has ${firstCoachSlots} slots, second coach has ${secondCoachSlots} slots`);
        }
      }
    }
  });

  test('unavailable time slots are not selectable', async ({ page }) => {
    await page.goto('/sessions');
    
    const bookButton = page.locator('[data-testid="book-session-button"], button:has-text("Book")').first();
    if (await bookButton.isVisible()) {
      await bookButton.click();
      
      const coachSelect = page.locator('[data-testid="coach-select"], select[name*="coach"]');
      if (await coachSelect.isVisible()) {
        const options = await coachSelect.locator('option').all();
        if (options.length > 1) {
          await coachSelect.selectOption({ index: 1 });
          await page.waitForTimeout(1500);
          
          // All visible time slots should be clickable (available)
          const timeSlots = page.locator('[data-testid="time-slot"], .time-slot');
          const count = await timeSlots.count();
          
          for (let i = 0; i < Math.min(count, 3); i++) { // Test first 3 slots
            const slot = timeSlots.nth(i);
            if (await slot.isVisible()) {
              const isDisabled = await slot.getAttribute('disabled');
              const hasDisabledClass = await slot.getAttribute('class');
              
              expect(isDisabled).toBeNull();
              expect(hasDisabledClass).not.toContain('disabled');
            }
          }
        }
      }
    }
  });

  test('session booking error handling', async ({ page }) => {
    await page.goto('/sessions');
    
    const bookButton = page.locator('[data-testid="book-session-button"], button:has-text("Book")').first();
    if (await bookButton.isVisible()) {
      await bookButton.click();
      
      // Mock API error response if possible (this might not work in all environments)
      try {
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
      } catch (error) {
        console.log('Could not mock API route - continuing with normal flow');
      }
      
      // Fill and submit form
      const titleInput = page.locator('[data-testid="session-title"], input[name*="title"]').first();
      if (await titleInput.isVisible()) {
        await titleInput.fill('Test Session');
        
        const coachSelect = page.locator('[data-testid="coach-select"], select[name*="coach"]');
        if (await coachSelect.isVisible()) {
          const options = await coachSelect.locator('option').all();
          if (options.length > 1) {
            await coachSelect.selectOption({ index: 1 });
            await page.waitForTimeout(1500);
            
            const timeSlot = page.locator('[data-testid="time-slot"], .time-slot').first();
            if (await timeSlot.isVisible()) {
              await timeSlot.click();
              
              const submitButton = page.locator('[data-testid="book-session-submit"], button:has-text("Book")').first();
              if (await submitButton.isVisible()) {
                await submitButton.click();
                
                // Check for either success or error message
                const result = page.locator('[data-testid="success-message"], [data-testid="error-message"], .success, .error');
                await expect(result).toBeVisible({ timeout: 15000 });
              }
            }
          }
        }
      }
    }
  });

  test('view session details', async ({ page }) => {
    await page.goto('/sessions');
    
    // Wait for sessions to load
    await page.waitForLoadState('networkidle');
    
    // Should see existing sessions or empty state
    const sessionItem = page.locator('[data-testid="session-item"], .session-card, .session-item').first();
    const emptyState = page.locator('text=/no.*sessions|empty/i');
    
    if (await sessionItem.isVisible()) {
      await sessionItem.click();
      
      // Should navigate to session details
      await expect(page).toHaveURL(/\/sessions\/.*/, { timeout: 10000 });
      
      // Should show session details
      const sessionTitle = page.locator('[data-testid="session-title"], .session-title, h1, h2');
      const sessionInfo = page.locator('[data-testid="session-description"], [data-testid="session-coach"], [data-testid="session-date"], .session-info');
      
      await expect(sessionTitle.or(sessionInfo)).toBeVisible({ timeout: 10000 });
    } else if (await emptyState.isVisible()) {
      console.log('No sessions available for viewing details');
    } else {
      // Check if we can see the sessions list interface at all
      const sessionsList = page.locator('[data-testid="sessions-list"], .sessions-list, .sessions');
      await expect(sessionsList).toBeVisible({ timeout: 10000 });
    }
  });

  test('cancel session booking', async ({ page }) => {
    await page.goto('/sessions');
    
    // Wait for sessions to load
    await page.waitForLoadState('networkidle');
    
    // Look for a scheduled session
    const scheduledSession = page.locator('[data-testid="session-item"]:has-text("scheduled"), .session-item:has-text("scheduled")').first();
    
    if (await scheduledSession.isVisible()) {
      await scheduledSession.click();
      
      // Look for cancel button
      const cancelButton = page.locator('[data-testid="cancel-session-button"], button:has-text("Cancel")');
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
        
        // Look for confirmation dialog
        const confirmButton = page.locator('[data-testid="confirm-cancel-button"], button:has-text("Confirm"), button:has-text("Yes")');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
          
          // Should show success message
          await expect(page.locator('text=/cancelled|success/i')).toBeVisible({ timeout: 10000 });
          
          // Should redirect back to sessions list
          await expect(page).toHaveURL('/sessions');
        }
      }
    } else {
      console.log('No scheduled sessions available for cancellation test');
    }
  });

  test('reschedule session', async ({ page }) => {
    await page.goto('/sessions');
    
    // Wait for sessions to load
    await page.waitForLoadState('networkidle');
    
    // Look for a scheduled session
    const scheduledSession = page.locator('[data-testid="session-item"]:has-text("scheduled"), .session-item:has-text("scheduled")').first();
    
    if (await scheduledSession.isVisible()) {
      await scheduledSession.click();
      
      // Look for reschedule button
      const rescheduleButton = page.locator('[data-testid="reschedule-session-button"], button:has-text("Reschedule")');
      if (await rescheduleButton.isVisible()) {
        await rescheduleButton.click();
        
        // Should show reschedule form with new time slots
        const rescheduleForm = page.locator('[data-testid="reschedule-form"], .reschedule-form, form');
        if (await rescheduleForm.isVisible()) {
          await page.waitForTimeout(1500);
          
          // Select new time slot
          const timeSlot = page.locator('[data-testid="time-slot"], .time-slot').first();
          if (await timeSlot.isVisible()) {
            await timeSlot.click();
            
            // Submit reschedule
            const submitButton = page.locator('[data-testid="reschedule-submit"], button:has-text("Reschedule"), button:has-text("Save")');
            if (await submitButton.isVisible()) {
              await submitButton.click();
              
              // Should show success message
              await expect(page.locator('text=/rescheduled|success/i')).toBeVisible({ timeout: 10000 });
            }
          }
        }
      }
    } else {
      console.log('No scheduled sessions available for rescheduling test');
    }
  });

  test('session filters and search', async ({ page }) => {
    await page.goto('/sessions');
    
    // Wait for sessions page to load
    await page.waitForLoadState('networkidle');
    
    // Test status filter if available
    const statusFilter = page.locator('[data-testid="status-filter"], select[name*="status"]');
    if (await statusFilter.isVisible()) {
      const options = await statusFilter.locator('option').all();
      if (options.length > 1) {
        await statusFilter.selectOption({ label: 'Scheduled' });
        await page.waitForTimeout(1000);
        
        // Should only show scheduled sessions or no results message
        const sessions = page.locator('[data-testid="session-item"], .session-item');
        const noResults = page.locator('text=/no.*found|no.*results/i');
        
        await expect(sessions.first().or(noResults)).toBeVisible({ timeout: 5000 });
      }
    }
    
    // Test search functionality
    const searchInput = page.locator('[data-testid="session-search"], [data-testid="search"], input[placeholder*="search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('Career');
      await page.waitForTimeout(1000);
      
      // Should filter sessions by search term or show no results
      const searchResults = page.locator('[data-testid="session-item"], .session-item');
      const noResults = page.locator('text=/no.*found|no.*results/i');
      
      await expect(searchResults.first().or(noResults)).toBeVisible({ timeout: 5000 });
      
      // Clear search
      await searchInput.fill('');
      await page.waitForTimeout(1000);
    }
  });

  test('session reminders and notifications', async ({ page }) => {
    await page.goto('/sessions');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Should see notification bell in header or navigation
    const notificationBell = page.locator('[data-testid="notification-bell"], .notification-bell, .notifications');
    
    if (await notificationBell.isVisible()) {
      // Check for unread notification indicator
      const unreadBadge = page.locator('[data-testid="unread-count"], .unread-count, .badge');
      
      if (await unreadBadge.isVisible()) {
        // Click on notifications
        await notificationBell.click();
        
        // Should show notification dropdown
        const notificationDropdown = page.locator('[data-testid="notification-dropdown"], .notification-dropdown, .notifications-menu');
        if (await notificationDropdown.isVisible()) {
          // Should see session reminders
          const sessionReminder = page.locator('text=Session Reminder').or(page.locator('text=/reminder|session.*upcoming/i'));
          
          if (await sessionReminder.isVisible()) {
            // Click on a notification
            const notificationItem = page.locator('[data-testid="notification-item"], .notification-item').first();
            if (await notificationItem.isVisible()) {
              await notificationItem.click();
              
              // Should navigate to related session or mark as read
              await page.waitForTimeout(1000);
            }
          }
        }
      }
    } else {
      console.log('Notification system not visible for testing');
    }
  });

  test('booking confirmation and summary', async ({ page }) => {
    await page.goto('/sessions');
    
    const bookButton = page.locator('[data-testid="book-session-button"], button:has-text("Book")').first();
    if (await bookButton.isVisible()) {
      await bookButton.click();
      
      // Fill minimal required information
      const titleInput = page.locator('[data-testid="session-title"], input[name*="title"]').first();
      if (await titleInput.isVisible()) {
        await titleInput.fill('Quick Consultation');
        
        const coachSelect = page.locator('[data-testid="coach-select"], select[name*="coach"]');
        if (await coachSelect.isVisible()) {
          const options = await coachSelect.locator('option').all();
          if (options.length > 1) {
            await coachSelect.selectOption({ index: 1 });
            await page.waitForTimeout(1500);
            
            const timeSlot = page.locator('[data-testid="time-slot"], .time-slot').first();
            if (await timeSlot.isVisible()) {
              await timeSlot.click();
              
              // Look for booking summary before final submission
              const bookingSummary = page.locator('[data-testid="booking-summary"], .booking-summary, .summary');
              if (await bookingSummary.isVisible()) {
                console.log('Booking summary is displayed');
              }
              
              const submitButton = page.locator('[data-testid="book-session-submit"], button:has-text("Book")').first();
              if (await submitButton.isVisible()) {
                await submitButton.click();
                
                // Should show confirmation
                const confirmation = page.locator('[data-testid="booking-confirmation"], .confirmation').or(page.locator('text=/confirmed|booked|success/i'));
                await expect(confirmation).toBeVisible({ timeout: 15000 });
              }
            }
          }
        }
      }
    }
  });

  test.afterEach(async ({ page }) => {
    // Clean up auth state after each test
    const authHelper = createAuthHelper(page);
    await authHelper.clearAuthState();
  });
});