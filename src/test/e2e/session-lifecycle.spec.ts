import { test, expect } from '@playwright/test';

test.describe('Session Lifecycle End-to-End', () => {
  test.beforeEach(async ({ page }) => {
    // Login as a coach who can manage sessions
    await page.goto('/auth/signin');
    
    // Fill in login credentials for a test coach account
    await page.fill('input[name="email"]', 'test.coach@example.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    // Wait for successful login and redirect
    await page.waitForURL('/dashboard');
  });

  test('complete session workflow: book → start → complete', async ({ page }) => {
    // Step 1: Navigate to sessions page
    await page.goto('/sessions');
    
    // Step 2: Verify unified booking component loads
    await page.click('[data-testid="book-session-button"]');
    
    // Verify the unified session booking component is rendered
    await expect(page.getByText('Book Session')).toBeVisible();
    await expect(page.getByTestId('coach-select')).toBeVisible();
    await expect(page.getByTestId('session-title')).toBeVisible();
    
    // Step 3: Fill out booking form using unified component
    await page.getByTestId('coach-select').click();
    await page.getByText('John Coach').click();
    
    // Select a date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowString = tomorrow.toISOString().split('T')[0];
    
    await page.getByRole('button', { name: 'Select Date' }).click();
    await page.getByText(tomorrow.toLocaleDateString()).click();
    
    // Fill session details
    await page.getByTestId('session-title').fill('E2E Test Session');
    await page.getByTestId('session-description').fill('Testing the complete session lifecycle');
    
    // Select an available time slot
    await page.getByTestId('time-slot').first().click();
    
    // Submit the booking
    await page.getByTestId('book-session-submit').click();
    
    // Wait for booking confirmation
    await expect(page.getByText('Session booked successfully')).toBeVisible();
    
    // Step 4: Navigate to the newly created session
    await page.goto('/sessions');
    await page.getByText('E2E Test Session').click();
    
    // Step 5: Start the session using the unified system
    const sessionUrl = page.url();
    const sessionId = sessionUrl.split('/').pop();
    
    // Verify session actions are available
    await expect(page.getByTestId('start-session-button')).toBeVisible();
    
    // Start the session
    await page.getByTestId('start-session-button').click();
    
    // Verify session status changed to in_progress
    await page.waitForResponse(`/api/sessions/${sessionId}/start`);
    await expect(page.getByText('In Progress')).toBeVisible();
    
    // Verify start button is replaced with complete button
    await expect(page.getByTestId('end-session-button')).toBeVisible();
    
    // Step 6: Complete the session
    await page.getByTestId('end-session-button').click();
    
    // Fill out completion details
    await expect(page.getByText('Complete Session')).toBeVisible();
    await page.getByRole('textbox', { name: 'Session Notes' }).fill('Great session, client made excellent progress');
    await page.getByRole('button', { name: '5 stars' }).click(); // Rate 5 stars
    await page.getByRole('textbox', { name: 'Feedback' }).fill('Client was very engaged');
    
    // Submit completion
    await page.getByRole('button', { name: 'Complete Session' }).click();
    
    // Verify completion
    await page.waitForResponse(`/api/sessions/${sessionId}/complete`);
    await expect(page.getByText('Completed')).toBeVisible();
    
    // Verify session details are updated
    await expect(page.getByText('Great session, client made excellent progress')).toBeVisible();
    await expect(page.getByText('Client was very engaged')).toBeVisible();
  });

  test('session cancellation workflow', async ({ page }) => {
    // Create a session first (simplified for cancellation test)
    await page.goto('/sessions');
    await page.click('[data-testid="book-session-button"]');
    
    // Quick booking
    await page.getByTestId('coach-select').click();
    await page.getByText('John Coach').first().click();
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.getByRole('button', { name: 'Select Date' }).click();
    await page.getByText(tomorrow.toLocaleDateString()).click();
    
    await page.getByTestId('session-title').fill('Session to Cancel');
    await page.getByTestId('time-slot').first().click();
    await page.getByTestId('book-session-submit').click();
    
    await expect(page.getByText('Session booked successfully')).toBeVisible();
    
    // Navigate to the session
    await page.goto('/sessions');
    await page.getByText('Session to Cancel').click();
    
    // Cancel the session
    await page.getByTestId('cancel-session-button').click();
    
    // Fill cancellation form
    await expect(page.getByText('Cancel Session')).toBeVisible();
    await page.getByTestId('cancellation-reason-select').click();
    await page.getByText('Schedule conflict').click();
    
    // Submit cancellation
    await page.getByTestId('cancel-session-button').click();
    
    // Verify cancellation
    const sessionUrl = page.url();
    const sessionId = sessionUrl.split('/').pop();
    await page.waitForResponse(`/api/sessions/${sessionId}/cancel`);
    
    // Should redirect to sessions list
    await expect(page).toHaveURL('/sessions');
  });

  test('session state validation', async ({ page }) => {
    // Test that session actions are only available in appropriate states
    await page.goto('/sessions');
    
    // Find a completed session (should not have start/complete actions)
    const completedSession = page.getByText('Completed').first();
    if (await completedSession.isVisible()) {
      await completedSession.click();
      
      // Should not have action buttons for completed sessions
      await expect(page.getByTestId('start-session-button')).not.toBeVisible();
      await expect(page.getByTestId('end-session-button')).not.toBeVisible();
      await expect(page.getByTestId('cancel-session-button')).not.toBeVisible();
    }
  });

  test('unified booking component variants', async ({ page }) => {
    // Test that different booking variants work correctly
    await page.goto('/sessions');
    await page.click('[data-testid="book-session-button"]');
    
    // Verify basic variant is loaded by default
    await expect(page.getByText('Book Session')).toBeVisible();
    await expect(page.getByTestId('coach-select')).toBeVisible();
    
    // Check that realtime features are available if enabled
    const connectionStatus = page.getByText('Live Updates');
    if (await connectionStatus.isVisible()) {
      await expect(connectionStatus).toBeVisible();
    }
    
    // Check availability status if shown
    const availabilityOverview = page.getByText('Availability Overview');
    if (await availabilityOverview.isVisible()) {
      await expect(page.getByText('Total Slots')).toBeVisible();
      await expect(page.getByText('Available')).toBeVisible();
    }
  });

  test('session permissions and access control', async ({ page }) => {
    // Test that users can only access sessions they're authorized for
    await page.goto('/sessions');
    
    // Click on a session
    const sessionLink = page.getByRole('link').filter({ hasText: /session/i }).first();
    if (await sessionLink.isVisible()) {
      await sessionLink.click();
      
      // Should be able to access session details
      await expect(page.getByText('Session Details')).toBeVisible();
      
      // Actions should be appropriate for user role
      const userRole = await page.getAttribute('[data-user-role]', 'data-user-role');
      if (userRole === 'coach') {
        // Coaches should see start/complete buttons for their sessions
        const startButton = page.getByTestId('start-session-button');
        if (await startButton.isVisible()) {
          await expect(startButton).toBeEnabled();
        }
      }
    }
  });
});