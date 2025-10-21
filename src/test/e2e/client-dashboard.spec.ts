import { test, expect } from '@playwright/test';

import { createAuthHelper, testConstants, testUtils, getTestUserByEmail } from '../../../tests/helpers';

test.describe('Client Dashboard', () => {
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

  test('client dashboard overview', async ({ page }) => {
    await page.goto('/client');
    
    // Should show client-specific dashboard
    await expect(page.locator('h1')).toContainText(/client|dashboard/i);
    
    // Should show upcoming sessions
    const upcomingSessions = page.locator('[data-testid="upcoming-sessions"], [data-testid="sessions"], .sessions');
    await expect(upcomingSessions).toBeVisible({ timeout: 10000 });
    
    // Should show progress indicators or goals
    const progressSection = page.locator('[data-testid="progress"], [data-testid="goals"], .progress, .goals');
    if (await progressSection.isVisible()) {
      console.log('Progress section is displayed');
    }
  });

  test('book new session from dashboard', async ({ page }) => {
    await page.goto('/client');
    
    // Look for book session action
    const bookButton = page.locator('[data-testid="book-session"], button:has-text("Book"), a:has-text("Book")').first();
    
    if (await bookButton.isVisible()) {
      await bookButton.click();
      
      // Should navigate to booking page
      await expect(page).toHaveURL(/\/(sessions|book)/, { timeout: 10000 });
      
      // Should show booking form
      const bookingForm = page.locator('[data-testid="booking-form"], .booking-form, form');
      await expect(bookingForm).toBeVisible({ timeout: 10000 });
    } else {
      // Try navigating to sessions page directly
      await page.goto('/sessions');
      await expect(page).toHaveURL('/sessions');
    }
  });

  test('view session history', async ({ page }) => {
    await page.goto('/client');
    
    // Look for session history section
    const sessionHistory = page.locator('[data-testid="session-history"], .session-history, .history');
    
    if (await sessionHistory.isVisible()) {
      // Should show past sessions
      const pastSessions = page.locator('[data-testid="session-item"], .session-item');
      await expect(pastSessions.first()).toBeVisible({ timeout: 10000 });
    } else {
      // Try navigating to sessions page to see history
      await page.goto('/sessions');
      const sessionsList = page.locator('[data-testid="sessions-list"], .sessions-list');
      await expect(sessionsList).toBeVisible({ timeout: 10000 });
    }
  });

  test('access coaches page', async ({ page }) => {
    await page.goto('/client/coaches');
    
    // Should show available coaches
    await expect(page.locator('h1')).toContainText(/coaches/i);
    
    // Should show list of coaches
    const coachesList = page.locator('[data-testid="coaches-list"], .coaches-list, .coaches');
    await expect(coachesList).toBeVisible({ timeout: 10000 });
    
    // Should show coach cards
    const coachCard = page.locator('[data-testid="coach-card"], .coach-card, .coach-item').first();
    if (await coachCard.isVisible()) {
      // Should show coach information
      const coachName = page.locator('[data-testid="coach-name"], .coach-name, h2, h3').first();
      await expect(coachName).toBeVisible({ timeout: 5000 });
    }
  });

  test('manage reflections', async ({ page }) => {
    await page.goto('/client/reflections');
    
    // Should show reflections management page
    await expect(page.locator('h1')).toContainText(/reflections/i);
    
    // Should show reflections list or empty state
    const reflectionsList = page.locator('[data-testid="reflections-list"], .reflections-list, .reflections');
    await expect(reflectionsList).toBeVisible({ timeout: 10000 });
    
    // Try to create new reflection
    const createButton = page.locator('[data-testid="create-reflection"], button:has-text("Create"), button:has-text("Add")').first();
    
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Should show reflection form
      const reflectionForm = page.locator('[data-testid="reflection-form"], .reflection-form, form');
      if (await reflectionForm.isVisible()) {
        const contentInput = page.locator('[data-testid="reflection-content"], textarea[name*="content"], textarea').first();
        const moodInput = page.locator('[data-testid="mood-rating"], input[type="range"], select[name*="mood"]').first();
        
        if (await contentInput.isVisible()) {
          await contentInput.fill('Had a great session today. Learned a lot about communication techniques.');
          
          if (await moodInput.isVisible()) {
            if (await moodInput.getAttribute('type') === 'range') {
              await moodInput.fill('8');
            } else {
              await moodInput.selectOption({ label: '8' });
            }
          }
          
          const saveButton = page.locator('[data-testid="save-reflection"], button:has-text("Save")').first();
          if (await saveButton.isVisible()) {
            await saveButton.click();
            
            // Should show success message
            await expect(page.locator('text=/saved|success|created/i')).toBeVisible({ timeout: 10000 });
          }
        }
      }
    }
  });

  test('view progress tracking', async ({ page }) => {
    await page.goto('/client/progress');
    
    // Should show progress tracking page
    await expect(page.locator('h1')).toContainText(/progress/i);
    
    // Should show progress metrics or charts
    const progressMetrics = page.locator('[data-testid="progress-metrics"], .progress-metrics, .metrics');
    const progressChart = page.locator('[data-testid="progress-chart"], .progress-chart, .chart, canvas');
    
    await expect(progressMetrics.or(progressChart)).toBeVisible({ timeout: 10000 });
    
    // Should show goals or milestones
    const goalsSection = page.locator('[data-testid="goals"], .goals, .milestones');
    if (await goalsSection.isVisible()) {
      console.log('Goals section is displayed');
    }
  });

  test('update profile information', async ({ page }) => {
    await page.goto('/settings');
    
    // Should show settings page
    await expect(page.locator('h1')).toContainText(/settings|profile/i);
    
    // Look for profile form
    const profileForm = page.locator('[data-testid="profile-form"], .profile-form, form');
    
    if (await profileForm.isVisible()) {
      const firstNameInput = page.locator('[data-testid="first-name"], input[name*="first"], input[name*="firstName"]').first();
      const lastNameInput = page.locator('[data-testid="last-name"], input[name*="last"], input[name*="lastName"]').first();
      
      if (await firstNameInput.isVisible() && await lastNameInput.isVisible()) {
        // Update profile information
        const currentFirstName = await firstNameInput.inputValue();
        await firstNameInput.fill(currentFirstName + ' Updated');
        
        const saveButton = page.locator('[data-testid="save-profile"], button:has-text("Save"), input[type="submit"]').first();
        if (await saveButton.isVisible()) {
          await saveButton.click();
          
          // Should show success message
          await expect(page.locator('text=/updated|saved|success/i')).toBeVisible({ timeout: 10000 });
        }
      }
    }
  });

  test('notification settings', async ({ page }) => {
    await page.goto('/settings/notifications');
    
    // Should show notification settings
    await expect(page.locator('h1')).toContainText(/notifications/i);
    
    // Should show notification preferences
    const notificationSettings = page.locator('[data-testid="notification-settings"], .notification-settings, .settings');
    await expect(notificationSettings).toBeVisible({ timeout: 10000 });
    
    // Should have toggles for different notification types
    const emailNotifications = page.locator('[data-testid="email-notifications"], input[name*="email"]');
    const sessionReminders = page.locator('[data-testid="session-reminders"], input[name*="reminder"]');
    
    if (await emailNotifications.isVisible()) {
      const isChecked = await emailNotifications.isChecked();
      await emailNotifications.setChecked(!isChecked);
      
      const saveButton = page.locator('[data-testid="save-settings"], button:has-text("Save")').first();
      if (await saveButton.isVisible()) {
        await saveButton.click();
        
        // Should show success message
        await expect(page.locator('text=/updated|saved|success/i')).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('language settings', async ({ page }) => {
    await page.goto('/settings/language');
    
    // Should show language settings
    await expect(page.locator('h1')).toContainText(/language/i);
    
    // Should show language selector
    const languageSelect = page.locator('[data-testid="language-select"], select[name*="language"]');
    
    if (await languageSelect.isVisible()) {
      const options = await languageSelect.locator('option').all();
      if (options.length > 1) {
        await languageSelect.selectOption({ index: 1 });
        
        const saveButton = page.locator('[data-testid="save-language"], button:has-text("Save")').first();
        if (await saveButton.isVisible()) {
          await saveButton.click();
          
          // Should show success message
          await expect(page.locator('text=/updated|saved|success/i')).toBeVisible({ timeout: 10000 });
        }
      }
    }
  });

  test('view session feedback', async ({ page }) => {
    await page.goto('/sessions');
    
    // Wait for sessions to load
    await page.waitForLoadState('networkidle');
    
    // Look for completed sessions
    const completedSession = page.locator('[data-testid="session-item"]:has-text("completed"), .session-item:has-text("completed")').first();
    
    if (await completedSession.isVisible()) {
      await completedSession.click();
      
      // Should show session details
      await expect(page).toHaveURL(/\/sessions\/.*/, { timeout: 10000 });
      
      // Look for feedback section
      const feedbackSection = page.locator('[data-testid="session-feedback"], .feedback, .session-notes');
      if (await feedbackSection.isVisible()) {
        console.log('Session feedback is displayed');
      }
      
      // Look for rating or feedback form
      const feedbackForm = page.locator('[data-testid="feedback-form"], .feedback-form');
      if (await feedbackForm.isVisible()) {
        const ratingInput = page.locator('[data-testid="session-rating"], input[type="range"], select[name*="rating"]').first();
        const feedbackText = page.locator('[data-testid="feedback-text"], textarea[name*="feedback"]').first();
        
        if (await ratingInput.isVisible() && await feedbackText.isVisible()) {
          if (await ratingInput.getAttribute('type') === 'range') {
            await ratingInput.fill('9');
          } else {
            await ratingInput.selectOption({ label: '9' });
          }
          
          await feedbackText.fill('Excellent session. Very helpful insights and practical advice.');
          
          const submitButton = page.locator('[data-testid="submit-feedback"], button:has-text("Submit")').first();
          if (await submitButton.isVisible()) {
            await submitButton.click();
            
            // Should show success message
            await expect(page.locator('text=/submitted|success|thank/i')).toBeVisible({ timeout: 10000 });
          }
        }
      }
    } else {
      console.log('No completed sessions available for feedback test');
    }
  });

  test.afterEach(async ({ page }) => {
    // Clean up auth state after each test
    const authHelper = createAuthHelper(page);
    await authHelper.clearAuthState();
  });
});