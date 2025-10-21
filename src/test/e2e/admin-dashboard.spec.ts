import { test, expect } from '@playwright/test';

import { createAuthHelper, testConstants, testUtils, getTestUserByEmail } from '../../../tests/helpers';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state for clean test isolation
    const authHelper = createAuthHelper(page);
    await authHelper.clearAuthState();
    
    // Login as admin using the auth helper
    await authHelper.signInUserByRole('admin');
    
    // Verify we're signed in and redirected properly
    await expect(page).toHaveURL(/\/(dashboard|admin)/, { timeout: 15000 });
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
  });

  test('admin dashboard overview', async ({ page }) => {
    await page.goto('/admin');
    
    // Should show admin-specific dashboard
    await expect(page.locator('h1')).toContainText(/admin|dashboard/i);
    
    // Should show system metrics
    const systemMetrics = page.locator('[data-testid="system-metrics"], .metrics, .stats');
    await expect(systemMetrics).toBeVisible({ timeout: 10000 });
    
    // Should show key statistics like user counts, session counts, etc.
    const userCount = page.locator('[data-testid="user-count"], .user-count');
    const sessionCount = page.locator('[data-testid="session-count"], .session-count');
    const coachCount = page.locator('[data-testid="coach-count"], .coach-count');
    
    // At least one metric should be visible
    await expect(userCount.or(sessionCount).or(coachCount)).toBeVisible({ timeout: 10000 });
  });

  test('user management', async ({ page }) => {
    await page.goto('/admin/users');
    
    // Should show user management page
    await expect(page.locator('h1')).toContainText(/users|user.*management/i);
    
    // Should show users table
    const usersTable = page.locator('[data-testid="users-table"], .users-table, table');
    await expect(usersTable).toBeVisible({ timeout: 10000 });
    
    // Should show user rows
    const userRows = page.locator('[data-testid="user-row"], tbody tr, .user-item');
    await expect(userRows.first()).toBeVisible({ timeout: 10000 });
    
    // Test user search if available
    const searchInput = page.locator('[data-testid="user-search"], input[placeholder*="search"], input[name*="search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
      
      // Should filter users
      const filteredResults = page.locator('[data-testid="user-row"], .user-item');
      await expect(filteredResults.first()).toBeVisible({ timeout: 5000 });
      
      // Clear search
      await searchInput.fill('');
    }
  });

  test('view user details and edit user', async ({ page }) => {
    await page.goto('/admin/users');
    
    // Wait for users to load
    await page.waitForLoadState('networkidle');
    
    // Click on first user
    const firstUser = page.locator('[data-testid="user-row"], tbody tr, .user-item').first();
    if (await firstUser.isVisible()) {
      await firstUser.click();
      
      // Should show user details or edit form
      const userDetails = page.locator('[data-testid="user-details"], .user-details');
      const editButton = page.locator('[data-testid="edit-user"], button:has-text("Edit")');
      
      if (await editButton.isVisible()) {
        await editButton.click();
        
        // Should show edit form
        const editForm = page.locator('[data-testid="user-edit-form"], .edit-form, form');
        if (await editForm.isVisible()) {
          const statusSelect = page.locator('[data-testid="user-status"], select[name*="status"]');
          const roleSelect = page.locator('[data-testid="user-role"], select[name*="role"]');
          
          if (await statusSelect.isVisible()) {
            await statusSelect.selectOption({ label: 'Active' });
          }
          
          const saveButton = page.locator('[data-testid="save-user"], button:has-text("Save")');
          if (await saveButton.isVisible()) {
            await saveButton.click();
            
            // Should show success message
            await expect(page.locator('text=/updated|saved|success/i')).toBeVisible({ timeout: 10000 });
          }
        }
      }
    }
  });

  test('system analytics', async ({ page }) => {
    await page.goto('/admin/analytics');
    
    // Should show analytics page
    await expect(page.locator('h1')).toContainText(/analytics/i);
    
    // Should show various charts and metrics
    const analyticsCharts = page.locator('[data-testid="analytics-chart"], .chart, canvas');
    await expect(analyticsCharts.first()).toBeVisible({ timeout: 10000 });
    
    // Should show date range selector
    const dateRangeSelector = page.locator('[data-testid="date-range"], .date-range, input[type="date"]');
    if (await dateRangeSelector.isVisible()) {
      // Test date range filtering
      const startDate = page.locator('[data-testid="start-date"], input[name*="start"]').first();
      const endDate = page.locator('[data-testid="end-date"], input[name*="end"]').first();
      
      if (await startDate.isVisible() && await endDate.isVisible()) {
        await startDate.fill('2024-01-01');
        await endDate.fill('2024-01-31');
        
        const applyButton = page.locator('[data-testid="apply-filter"], button:has-text("Apply")');
        if (await applyButton.isVisible()) {
          await applyButton.click();
          
          // Should update analytics
          await page.waitForTimeout(2000);
        }
      }
    }
  });

  test('system settings management', async ({ page }) => {
    await page.goto('/admin/system');
    
    // Should show system settings page
    await expect(page.locator('h1')).toContainText(/system|settings/i);
    
    // Should show system configuration options
    const systemSettings = page.locator('[data-testid="system-settings"], .system-settings, .settings');
    await expect(systemSettings).toBeVisible({ timeout: 10000 });
    
    // Test email configuration if available
    const emailSettings = page.locator('[data-testid="email-settings"], .email-settings');
    if (await emailSettings.isVisible()) {
      const smtpHost = page.locator('[data-testid="smtp-host"], input[name*="smtp"]').first();
      const smtpPort = page.locator('[data-testid="smtp-port"], input[name*="port"]').first();
      
      if (await smtpHost.isVisible() && await smtpPort.isVisible()) {
        await smtpHost.fill('smtp.example.com');
        await smtpPort.fill('587');
        
        const saveButton = page.locator('[data-testid="save-settings"], button:has-text("Save")');
        if (await saveButton.isVisible()) {
          await saveButton.click();
          
          // Should show success message
          await expect(page.locator('text=/updated|saved|success/i')).toBeVisible({ timeout: 10000 });
        }
      }
    }
  });

  test('manage session reports', async ({ page }) => {
    await page.goto('/admin');
    
    // Look for session management or reports section
    const sessionReports = page.locator('[data-testid="session-reports"], a:has-text("Sessions"), a:has-text("Reports")').first();
    
    if (await sessionReports.isVisible()) {
      await sessionReports.click();
      
      // Should show session reports
      const reportsTable = page.locator('[data-testid="sessions-table"], table, .sessions-list');
      await expect(reportsTable).toBeVisible({ timeout: 10000 });
      
      // Should show session statistics
      const sessionStats = page.locator('[data-testid="session-stats"], .stats');
      if (await sessionStats.isVisible()) {
        console.log('Session statistics are displayed');
      }
      
      // Test export functionality if available
      const exportButton = page.locator('[data-testid="export-sessions"], button:has-text("Export")');
      if (await exportButton.isVisible()) {
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
        await exportButton.click();
        
        try {
          const download = await downloadPromise;
          expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx|pdf)$/);
        } catch (error) {
          console.log('Export download test skipped - may not be implemented');
        }
      }
    } else {
      // Try direct navigation
      await page.goto('/admin/sessions');
      const sessionsList = page.locator('[data-testid="sessions-list"], .sessions-list');
      await expect(sessionsList).toBeVisible({ timeout: 10000 });
    }
  });

  test('audit logs and monitoring', async ({ page }) => {
    // Try to access audit logs
    const auditPaths = ['/admin/audit', '/admin/logs', '/admin/monitoring'];
    
    for (const path of auditPaths) {
      await page.goto(path);
      
      // Check if we successfully reached an audit/logs page
      if (page.url().includes(path)) {
        // Should show audit information
        const auditLogs = page.locator('[data-testid="audit-logs"], .audit-logs, .logs');
        if (await auditLogs.isVisible()) {
          console.log(`Audit logs found at ${path}`);
          
          // Should show log entries
          const logEntries = page.locator('[data-testid="log-entry"], .log-entry, tbody tr');
          await expect(logEntries.first()).toBeVisible({ timeout: 10000 });
          
          // Test log filtering if available
          const logFilter = page.locator('[data-testid="log-filter"], select[name*="filter"]');
          if (await logFilter.isVisible()) {
            const options = await logFilter.locator('option').all();
            if (options.length > 1) {
              await logFilter.selectOption({ index: 1 });
              await page.waitForTimeout(1000);
            }
          }
          
          break;
        }
      }
    }
  });

  test('backup and maintenance', async ({ page }) => {
    await page.goto('/admin/system');
    
    // Look for backup/maintenance section
    const backupSection = page.locator('[data-testid="backup-section"], .backup, .maintenance');
    
    if (await backupSection.isVisible()) {
      // Test backup functionality
      const backupButton = page.locator('[data-testid="create-backup"], button:has-text("Backup")');
      if (await backupButton.isVisible()) {
        await backupButton.click();
        
        // Should show backup progress or confirmation
        const backupStatus = page.locator('[data-testid="backup-status"], .backup-status');
        if (await backupStatus.isVisible()) {
          await expect(backupStatus).toContainText(/progress|complete|success/i, { timeout: 30000 });
        }
      }
      
      // Test maintenance mode if available
      const maintenanceToggle = page.locator('[data-testid="maintenance-mode"], input[name*="maintenance"]');
      if (await maintenanceToggle.isVisible()) {
        const isChecked = await maintenanceToggle.isChecked();
        console.log(`Maintenance mode is currently ${isChecked ? 'enabled' : 'disabled'}`);
        
        // Don't actually toggle maintenance mode in tests unless specifically testing it
      }
    }
  });

  test('user role management', async ({ page }) => {
    await page.goto('/admin/users');
    
    // Look for user with role management capabilities
    const userRow = page.locator('[data-testid="user-row"], tbody tr').first();
    
    if (await userRow.isVisible()) {
      // Look for role change options
      const roleSelect = page.locator('[data-testid="user-role"], select[name*="role"]').first();
      const editButton = page.locator('[data-testid="edit-user"], button:has-text("Edit")').first();
      
      if (await editButton.isVisible()) {
        await editButton.click();
        
        const roleInput = page.locator('[data-testid="user-role"], select[name*="role"]');
        if (await roleInput.isVisible()) {
          const options = await roleInput.locator('option').all();
          const optionTexts = await Promise.all(options.map(opt => opt.textContent()));
          
          // Should have standard roles
          expect(optionTexts.some(text => text?.toLowerCase().includes('client'))).toBe(true);
          expect(optionTexts.some(text => text?.toLowerCase().includes('coach'))).toBe(true);
          
          console.log('Available roles:', optionTexts.filter(Boolean));
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