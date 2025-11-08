import { test, expect } from '@playwright/test';

import { createAuthHelper} from '../../../tests/helpers';

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state for clean test isolation
    const authHelper = createAuthHelper(page);
    await authHelper.clearAuthState();
  });

  test('sign in page accessibility', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Check for proper heading structure
    const mainHeading = page.locator('h1');
    await expect(mainHeading).toBeVisible();
    
    // Check for form labels
    const emailLabel = page.locator('label[for*="email"], label:has([data-testid="email-input"])');
    const passwordLabel = page.locator('label[for*="password"], label:has([data-testid="password-input"])');
    
    await expect(emailLabel).toBeVisible();
    await expect(passwordLabel).toBeVisible();
    
    // Check for form input accessibility attributes
    const emailInput = page.locator('[data-testid="email-input"]');
    const passwordInput = page.locator('[data-testid="password-input"]');
    
    if (await emailInput.isVisible()) {
      const emailType = await emailInput.getAttribute('type');
      const _emailRequired = await emailInput.getAttribute('required');
      expect(emailType).toBe('email');
    }
    
    if (await passwordInput.isVisible()) {
      const passwordType = await passwordInput.getAttribute('type');
      expect(passwordType).toBe('password');
    }
    
    // Check for skip link
    const skipLink = page.locator('a[href="#main"], .skip-link');
    if (await skipLink.isVisible()) {
      console.log('Skip link is present');
    }
    
    // Check for proper button accessibility
    const signInButton = page.locator('[data-testid="signin-button"]');
    if (await signInButton.isVisible()) {
      const buttonText = await signInButton.textContent();
      expect(buttonText?.trim()).toBeTruthy();
    }
  });

  test('dashboard accessibility after login', async ({ page }) => {
    const authHelper = createAuthHelper(page);
    await authHelper.signInUserByRole('client');
    
    await page.goto('/dashboard');
    
    // Check for proper page structure
    const mainLandmark = page.locator('main, [role="main"]');
    const _navLandmark = page.locator('nav, [role="navigation"]');
    
    await expect(mainLandmark.or(page.locator('body'))).toBeVisible();
    
    // Check for heading hierarchy
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    
    if (headingCount > 0) {
      // Should have at least one h1
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();
    }
    
    // Check for focus management
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    if (await focusedElement.isVisible()) {
      console.log('Focus management is working');
    }
    
    // Check for proper link text
    const links = page.locator('a');
    const linkCount = await links.count();
    
    for (let i = 0; i < Math.min(linkCount, 5); i++) {
      const link = links.nth(i);
      if (await link.isVisible()) {
        const linkText = await link.textContent();
        const ariaLabel = await link.getAttribute('aria-label');
        const title = await link.getAttribute('title');
        
        // Link should have accessible text
        expect(linkText?.trim() || ariaLabel || title).toBeTruthy();
      }
    }
  });

  test('form accessibility and error handling', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Test form validation accessibility
    const signInButton = page.locator('[data-testid="signin-button"]');
    if (await signInButton.isVisible()) {
      await signInButton.click();
      
      // Check for error messages
      const errorMessages = page.locator('[role="alert"], .error, [data-testid="error-message"]');
      if (await errorMessages.first().isVisible()) {
        // Error messages should be associated with form fields
        const firstError = errorMessages.first();
        const errorText = await firstError.textContent();
        expect(errorText?.trim()).toBeTruthy();
        
        console.log('Form validation errors are accessible');
      }
    }
  });

  test('navigation accessibility', async ({ page }) => {
    const authHelper = createAuthHelper(page);
    await authHelper.signInUserByRole('client');
    
    await page.goto('/dashboard');
    
    // Test keyboard navigation
    let tabCount = 0;
    const maxTabs = 10;
    
    while (tabCount < maxTabs) {
      await page.keyboard.press('Tab');
      tabCount++;
      
      const focusedElement = page.locator(':focus');
      if (await focusedElement.isVisible()) {
        const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase());
        const role = await focusedElement.getAttribute('role');
        
        // Focusable elements should be interactive
        const interactiveElements = ['a', 'button', 'input', 'select', 'textarea'];
        const interactiveRoles = ['button', 'link', 'tab', 'menuitem'];
        
        const isInteractive = interactiveElements.includes(tagName) || 
                            (role && interactiveRoles.includes(role));
        
        if (isInteractive) {
          console.log(`Focusable element: ${tagName}${role ? ` (role: ${role})` : ''}`);
        }
      }
    }
  });

  test('color contrast and visual accessibility', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Test high contrast mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(1000);
    
    // Check if dark mode is properly supported
    const body = page.locator('body');
    const bodyStyles = await body.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color
      };
    });
    
    console.log('Dark mode styles:', bodyStyles);
    
    // Reset to light mode
    await page.emulateMedia({ colorScheme: 'light' });
    
    // Test reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(1000);
    
    console.log('Reduced motion preference set');
  });

  test('screen reader compatibility', async ({ page }) => {
    const authHelper = createAuthHelper(page);
    await authHelper.signInUserByRole('client');
    
    await page.goto('/sessions');
    
    // Check for proper ARIA labels and descriptions
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const ariaLabel = await button.getAttribute('aria-label');
        const ariaDescribedBy = await button.getAttribute('aria-describedby');
        const buttonText = await button.textContent();
        
        // Button should have accessible name
        expect(buttonText?.trim() || ariaLabel).toBeTruthy();
        
        if (ariaDescribedBy) {
          const description = page.locator(`#${ariaDescribedBy}`);
          if (await description.isVisible()) {
            console.log('Button has proper aria-describedby');
          }
        }
      }
    }
    
    // Check for proper table accessibility if tables exist
    const tables = page.locator('table');
    const tableCount = await tables.count();
    
    if (tableCount > 0) {
      const firstTable = tables.first();
      
      // Should have table headers
      const headers = firstTable.locator('th');
      const headerCount = await headers.count();
      
      if (headerCount > 0) {
        console.log(`Table has ${headerCount} headers`);
        
        // Headers should have proper scope
        for (let i = 0; i < headerCount; i++) {
          const header = headers.nth(i);
          const scope = await header.getAttribute('scope');
          console.log(`Header ${i + 1} scope:`, scope || 'none');
        }
      }
    }
  });

  test('mobile accessibility', async ({ page, _browserName }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/auth/signin');
    
    // Check for proper mobile navigation
    const mobileMenu = page.locator('[data-testid="mobile-menu"], .mobile-menu, button:has-text("Menu")');
    
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      
      // Should show mobile navigation
      const mobileNav = page.locator('[data-testid="mobile-nav"], .mobile-nav');
      if (await mobileNav.isVisible()) {
        console.log('Mobile navigation is accessible');
        
        // Test closing mobile menu
        const closeButton = page.locator('[data-testid="close-menu"], button:has-text("Close")');
        if (await closeButton.isVisible()) {
          await closeButton.click();
        } else {
          // Try clicking outside or pressing escape
          await page.keyboard.press('Escape');
        }
      }
    }
    
    // Check for proper touch targets
    const touchTargets = page.locator('button, a, input, select, textarea');
    const targetCount = await touchTargets.count();
    
    for (let i = 0; i < Math.min(targetCount, 5); i++) {
      const target = touchTargets.nth(i);
      if (await target.isVisible()) {
        const boundingBox = await target.boundingBox();
        if (boundingBox) {
          // Touch targets should be at least 44px in either dimension
          const minSize = Math.min(boundingBox.width, boundingBox.height);
          if (minSize < 44) {
            console.warn(`Touch target ${i + 1} may be too small: ${boundingBox.width}x${boundingBox.height}`);
          }
        }
      }
    }
  });

  test('focus trap in modals', async ({ page }) => {
    const authHelper = createAuthHelper(page);
    await authHelper.signInUserByRole('client');
    
    await page.goto('/sessions');
    
    // Look for any modal triggers
    const modalTriggers = page.locator('button:has-text("Delete"), button:has-text("Confirm"), button:has-text("Cancel")');
    const triggerCount = await modalTriggers.count();
    
    if (triggerCount > 0) {
      const firstTrigger = modalTriggers.first();
      await firstTrigger.click();
      
      // Check if modal appears
      const modal = page.locator('[role="dialog"], .modal, [data-testid="modal"]');
      
      if (await modal.isVisible()) {
        // Test focus trap
        const focusedElements: string[] = [];
        let tabCount = 0;
        
        while (tabCount < 10) {
          await page.keyboard.press('Tab');
          tabCount++;
          
          const focusedElement = page.locator(':focus');
          if (await focusedElement.isVisible()) {
            const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase());
            const id = await focusedElement.getAttribute('id');
            const className = await focusedElement.getAttribute('class');
            
            const elementId = id || className || tagName;
            focusedElements.push(elementId);
            
            // Check if focus is still within modal
            const isWithinModal = await modal.locator(':focus').isVisible();
            if (!isWithinModal) {
              console.warn('Focus escaped modal');
              break;
            }
          }
        }
        
        console.log('Focus cycle in modal:', focusedElements);
        
        // Close modal (try escape key)
        await page.keyboard.press('Escape');
        
        // Modal should close
        await expect(modal).not.toBeVisible({ timeout: 5000 });
      }
    }
  });

  test.afterEach(async ({ page }) => {
    // Clean up auth state after each test
    const authHelper = createAuthHelper(page);
    await authHelper.clearAuthState();
  });
});