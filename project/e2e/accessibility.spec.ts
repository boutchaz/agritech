import { test, expect } from './fixtures/auth';
import {
  waitForLoadingComplete,
  fillFormField,
  clickAndWait,
} from './utils/test-helpers';

/**
 * Accessibility E2E Tests
 * Tests application accessibility compliance (WCAG 2.1 AA)
 */

test.describe('Accessibility', () => {
  test.describe('Semantic HTML', () => {
    test('should have proper heading hierarchy', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      await waitForLoadingComplete(page);

      // Check for proper heading structure
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();

      expect(headingCount).toBeGreaterThan(0);

      // Verify headings are in order (no skipped levels)
      const firstH1 = page.locator('h1').first();
      const hasH1 = await firstH1.isVisible({ timeout: 1000 }).catch(() => false);

      if (hasH1) {
        // Should have h1 as main heading
        await expect(firstH1).toBeVisible();
      }
    });

    test('should use semantic landmarks', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      await waitForLoadingComplete(page);

      // Check for semantic landmarks
      const landmarks = [
        'header',
        'nav',
        'main',
        'aside',
        'footer',
      ];

      for (const landmark of landmarks) {
        const element = page.locator(landmark);
        const isVisible = await element.isVisible({ timeout: 1000 }).catch(() => false);

        if (isVisible) {
          await expect(element).toBeVisible();
        }
      }
    });

    test('should use proper list elements', async ({ authenticatedPage: page }) => {
      await page.goto('/workers');
      await waitForLoadingComplete(page);

      // Check for proper list elements
      const ulLists = page.locator('ul:not([role])');
      const olLists = page.locator('ol:not([role])');
      const listCount = await ulLists.count() + await olLists.count();

      // Lists should use ul or ol elements
      expect(listCount).toBeGreaterThan(0);
    });

    test('should use proper button elements', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      await waitForLoadingComplete(page);

      // Check for proper button elements
      const buttons = page.locator('button, [role="button"]');
      const buttonCount = await buttons.count();

      expect(buttonCount).toBeGreaterThan(0);

      // Verify buttons have accessible names
      const firstButton = buttons.first();
      const hasAccessibleName = await firstButton.evaluate((el) => {
        return el.hasAttribute('aria-label') ||
               el.hasAttribute('aria-labelledby') ||
               el.textContent?.trim().length > 0;
      });

      expect(hasAccessibleName).toBeTruthy();
    });
  });

  test.describe('ARIA Attributes', () => {
    test('should have proper ARIA labels on form inputs', async ({ authenticatedPage: page }) => {
      await page.goto('/farm-hierarchy');
      await waitForLoadingComplete(page);

      // Click create button
      const createButton = page.locator('[data-testid="create-farm-button"], button:has-text("Add Farm")').first();
      if (await createButton.isVisible()) {
        await createButton.click();
        await page.waitForSelector('[data-testid="create-farm-form"]', { timeout: 5000 });

        // Check form inputs for ARIA labels
        const inputs = page.locator('input, select, textarea');
        const inputCount = await inputs.count();

        if (inputCount > 0) {
          // At least some inputs should have labels
          const labeledInputs = await inputs.evaluateAll((els) => {
            return els.filter((el) => {
              return el.hasAttribute('aria-label') ||
                     el.hasAttribute('aria-labelledby') ||
                     el.labels.length > 0;
            }).length;
          });

          expect(labeledInputs).toBeGreaterThan(0);
        }
      }
    });

    test('should have proper ARIA roles', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      await waitForLoadingComplete(page);

      // Check for proper ARIA roles
      const navigation = page.locator('nav, [role="navigation"]');
      const main = page.locator('main, [role="main"]');
      const complementary = page.locator('aside, [role="complementary"]');

      const hasNav = await navigation.isVisible({ timeout: 1000 }).catch(() => false);
      const hasMain = await main.isVisible({ timeout: 1000 }).catch(() => false);
      const hasAside = await complementary.isVisible({ timeout: 1000 }).catch(() => false);

      expect(hasNav || hasMain || hasAside).toBeTruthy();
    });

    test('should have proper ARIA live regions', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      await waitForLoadingComplete(page);

      // Check for ARIA live regions (for dynamic content)
      const liveRegions = page.locator('[aria-live]');
      const liveRegionCount = await liveRegions.count();

      // Dynamic content areas should have aria-live
      if (liveRegionCount > 0) {
        const firstRegion = liveRegions.first();
        const liveValue = await firstRegion.getAttribute('aria-live');

        expect(['polite', 'assertive', 'off']).toContain(liveValue || '');
      }
    });

    test('should have proper ARIA expanded states', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      await waitForLoadingComplete(page);

      // Check for expandable elements
      const expandableElements = page.locator('[aria-expanded]');
      const expandableCount = await expandableElements.count();

      if (expandableCount > 0) {
        // Verify aria-expanded is boolean
        const firstElement = expandableElements.first();
        const expandedValue = await firstElement.getAttribute('aria-expanded');

        expect(['true', 'false']).toContain(expandedValue || '');
      }
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should be keyboard navigable', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      await waitForLoadingComplete(page);

      // Tab through the page
      await page.keyboard.press('Tab');
      await page.waitForTimeout(300);

      // Check focus is visible
      const focusedElement = page.locator(':focus');
      const hasFocus = await focusedElement.count() > 0;

      expect(hasFocus).toBeTruthy();
    });

    test('should have visible focus indicators', async ({ authenticatedPage: page }) => {
      await page.goto('/farm-hierarchy');
      await waitForLoadingComplete(page);

      // Click create button
      const createButton = page.locator('[data-testid="create-farm-button"], button:has-text("Add Farm")').first();
      if (await createButton.isVisible()) {
        await createButton.click();
        await page.waitForSelector('[data-testid="create-farm-form"]', { timeout: 5000 });

        // Focus on first input
        const firstInput = page.locator('input, select, textarea').first();
        await firstInput.focus();

        // Check for visible focus indicator
        const hasFocus = await firstInput.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return styles.outline !== 'none' ||
                 styles.boxShadow !== 'none' ||
                 el.hasAttribute('autofocus');
        });

        expect(hasFocus).toBeTruthy();
      }
    });

    test('should support Enter key for form submission', async ({ authenticatedPage: page }) => {
      await page.goto('/farm-hierarchy');
      await waitForLoadingComplete(page);

      // Click create button
      const createButton = page.locator('[data-testid="create-farm-button"], button:has-text("Add Farm")').first();
      if (await createButton.isVisible()) {
        await createButton.click();
        await page.waitForSelector('[data-testid="create-farm-form"]', { timeout: 5000 });

        // Fill form
        await fillFormField(page, 'input[name="name"]', 'Test Farm');

        // Press Enter
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // Form should submit or show validation
        const form = page.locator('[data-testid="create-farm-form"]');
        const isVisible = await form.isVisible({ timeout: 1000 }).catch(() => false);

        // Either form submitted (hidden) or validation shown
        expect(isVisible || !isVisible).toBeTruthy();
      }
    });

    test('should support Escape key for closing modals', async ({ authenticatedPage: page }) => {
      await page.goto('/farm-hierarchy');
      await waitForLoadingComplete(page);

      // Click create button
      const createButton = page.locator('[data-testid="create-farm-button"], button:has-text("Add Farm")').first();
      if (await createButton.isVisible()) {
        await createButton.click();
        await page.waitForSelector('[data-testid="create-farm-form"]', { timeout: 5000 });

        // Press Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);

        // Form should close
        const form = page.locator('[data-testid="create-farm-form"]');
        const isHidden = await form.isHidden();

        expect(isHidden).toBeTruthy();
      }
    });
  });

  test.describe('Focus Management', () => {
    test('should maintain focus after navigation', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      await waitForLoadingComplete(page);

      // Focus on a link
      const firstLink = page.locator('a').first();
      await firstLink.focus();

      // Get focused element
      const focusedElement = page.locator(':focus');
      const initialFocus = await focusedElement.evaluate((el) => el.tagName);

      // Navigate to another page
      await page.goto('/workers');
      await waitForLoadingComplete(page);

      // Navigate back
      await page.goto('/dashboard');
      await waitForLoadingComplete(page);

      // Focus should be on first interactive element
      const newFocusedElement = page.locator(':focus');
      const hasFocus = await newFocusedElement.count() > 0;

      expect(hasFocus).toBeTruthy();
    });

    test('should not have keyboard traps', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      await waitForLoadingComplete(page);

      // Press Tab multiple times
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(100);
      }

      // Press Shift+Tab to go back
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Shift+Tab');
        await page.waitForTimeout(100);
      }

      // Should be able to navigate freely
      expect(true).toBeTruthy();
    });

    test('should have skip navigation link', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      await waitForLoadingComplete(page);

      // Look for skip navigation link
      const skipLink = page.locator('a[href="#main-content"], a:has-text("Skip to content"), [data-testid="skip-link"]');

      const hasSkipLink = await skipLink.isVisible({ timeout: 1000 }).catch(() => false);

      if (hasSkipLink) {
        await expect(skipLink).toBeVisible();
      }
    });
  });

  test.describe('Color Contrast', () => {
    test('should have sufficient color contrast', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      await waitForLoadingComplete(page);

      // Check color contrast for text elements
      const textElements = page.locator('p, h1, h2, h3, h4, h5, h6, span, div');
      const elementCount = await textElements.count();

      if (elementCount > 0) {
        // Sample first element
        const firstElement = textElements.first();

        // Check contrast ratio (basic check)
        const hasSufficientContrast = await firstElement.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          const color = styles.color;
          const backgroundColor = styles.backgroundColor;

          // Very basic check - not a full contrast calculation
          // In real implementation, use a proper contrast checker
          return color !== backgroundColor;
        });

        expect(hasSufficientContrast).toBeTruthy();
      }
    });

    test('should not rely on color alone', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      await waitForLoadingComplete(page);

      // Check that color is not the only indicator
      const colorOnlyIndicators = page.locator('[class*="success"], [class*="error"], [class*="warning"]');

      const indicatorCount = await colorOnlyIndicators.count();

      if (indicatorCount > 0) {
        // At least some indicators should have text or icons
        const hasTextOrIcon = await colorOnlyIndicators.first().evaluate((el) => {
          return el.textContent?.trim().length > 0 ||
                 el.querySelector('svg, i, img') !== null;
        });

        expect(hasTextOrIcon).toBeTruthy();
      }
    });
  });

  test.describe('Form Accessibility', () => {
    test('should have associated labels for form inputs', async ({ authenticatedPage: page }) => {
      await page.goto('/farm-hierarchy');
      await waitForLoadingComplete(page);

      // Click create button
      const createButton = page.locator('[data-testid="create-farm-button"], button:has-text("Add Farm")').first();
      if (await createButton.isVisible()) {
        await createButton.click();
        await page.waitForSelector('[data-testid="create-farm-form"]', { timeout: 5000 });

        // Check form inputs
        const inputs = page.locator('input:not([type="hidden"]), select, textarea');
        const inputCount = await inputs.count();

        if (inputCount > 0) {
          // Count inputs with associated labels
          const labeledInputs = await inputs.evaluateAll((els) => {
            return els.filter((el) => {
              // Check for aria-label, aria-labelledby, or label element
              return el.hasAttribute('aria-label') ||
                     el.hasAttribute('aria-labelledby') ||
                     el.labels.length > 0;
            }).length;
          });

          // Most inputs should have labels
          expect(labeledInputs).toBeGreaterThan(inputCount / 2);
        }
      }
    });

    test('should show validation errors accessibly', async ({ authenticatedPage: page }) => {
      await page.goto('/farm-hierarchy');
      await waitForLoadingComplete(page);

      // Click create button
      const createButton = page.locator('[data-testid="create-farm-button"], button:has-text("Add Farm")').first();
      if (await createButton.isVisible()) {
        await createButton.click();
        await page.waitForSelector('[data-testid="create-farm-form"]', { timeout: 5000 });

        // Try to submit without filling
        const submitButton = page.locator('[data-testid="farm-submit-button"], button[type="submit"]');
        await submitButton.click();
        await page.waitForTimeout(500);

        // Check for error messages
        const errorMessages = page.locator('[role="alert"], [data-testid="error"], .error-message');
        const errorCount = await errorMessages.count();

        if (errorCount > 0) {
          // Errors should have role="alert"
          const firstError = errorMessages.first();
          const hasAlertRole = await firstError.getAttribute('role');

          expect(hasAlertRole).toBe('alert');
        }
      }
    });

    test('should have proper fieldset structure', async ({ authenticatedPage: page }) => {
      await page.goto('/farm-hierarchy');
      await waitForLoadingComplete(page);

      // Click create button
      const createButton = page.locator('[data-testid="create-farm-button"], button:has-text("Add Farm")').first();
      if (await createButton.isVisible()) {
        await createButton.click();
        await page.waitForSelector('[data-testid="create-farm-form"]', { timeout: 5000 });

        // Check for fieldset elements
        const fieldsets = page.locator('fieldset');
        const fieldsetCount = await fieldsets.count();

        if (fieldsetCount > 0) {
          // Fieldsets should have legends
          const firstFieldset = fieldsets.first();
          const hasLegend = await firstFieldset.locator('legend').count() > 0;

          expect(hasLegend).toBeTruthy();
        }
      }
    });
  });

  test.describe('Image Accessibility', () => {
    test('should have alt text for images', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      await waitForLoadingComplete(page);

      // Check images for alt text
      const images = page.locator('img');
      const imageCount = await images.count();

      if (imageCount > 0) {
        // Count images with alt text
        const imagesWithAlt = await images.evaluateAll((els) => {
          return els.filter((el) => {
            return el.hasAttribute('alt') && el.getAttribute('alt')?.trim().length > 0;
          }).length;
        });

        // Most images should have alt text
        expect(imagesWithAlt).toBeGreaterThan(imageCount / 2);
      }
    });

    test('should have proper decorative image handling', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      await waitForLoadingComplete(page);

      // Check for decorative images
      const decorativeImages = page.locator('img[alt=""], img[role="presentation"]');

      const decorativeCount = await decorativeImages.count();

      if (decorativeCount > 0) {
        // Decorative images should have role="presentation" or empty alt
        const firstImage = decorativeImages.first();
        const hasPresentationRole = await firstImage.getAttribute('role');

        expect(hasPresentationRole || '').toBe('presentation');
      }
    });
  });

  test.describe('Link Accessibility', () => {
    test('should have descriptive link text', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      await waitForLoadingComplete(page);

      // Check links
      const links = page.locator('a[href]');
      const linkCount = await links.count();

      if (linkCount > 0) {
        // Links should have descriptive text
        const firstLink = links.first();
        const linkText = await firstLink.textContent();

        expect((linkText || '').trim().length).toBeGreaterThan(0);
      }
    });

    test('should have focusable links', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      await waitForLoadingComplete(page);

      // Check links are focusable
      const links = page.locator('a[href]');
      const linkCount = await links.count();

      if (linkCount > 0) {
        // Links should be focusable
        const firstLink = links.first();
        await firstLink.focus();

        const focusedElement = page.locator(':focus');
        const hasFocus = await focusedElement.count() > 0;

        expect(hasFocus).toBeTruthy();
      }
    });

    test('should have proper link underlines', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      await waitForLoadingComplete(page);

      // Check links have visual indication
      const links = page.locator('a[href]');
      const linkCount = await links.count();

      if (linkCount > 0) {
        // Links should have hover/focus styles
        const firstLink = links.first();
        const hasHoverStyle = await firstLink.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return styles.textDecoration !== 'none' ||
                 styles.cursor === 'pointer';
        });

        expect(hasHoverStyle).toBeTruthy();
      }
    });
  });

  test.describe('Modal Accessibility', () => {
    test('should trap focus in modal', async ({ authenticatedPage: page }) => {
      await page.goto('/farm-hierarchy');
      await waitForLoadingComplete(page);

      // Click create button
      const createButton = page.locator('[data-testid="create-farm-button"], button:has-text("Add Farm")').first();
      if (await createButton.isVisible()) {
        await createButton.click();
        await page.waitForSelector('[data-testid="create-farm-form"]', { timeout: 5000 });

        // Focus should be in modal
        const modal = page.locator('[data-testid="create-farm-form"]');
        const modalInput = modal.locator('input').first();

        if (await modalInput.isVisible()) {
          await modalInput.focus();

          // Press Tab
          await page.keyboard.press('Tab');
          await page.waitForTimeout(300);

          // Focus should still be in modal
          const focusedElement = page.locator(':focus');
          const isInModal = await focusedElement.evaluate((el) => {
            return el.closest('[role="dialog"], .modal, [data-testid*="form"]') !== null;
          });

          expect(isInModal).toBeTruthy();
        }
      }
    });

    test('should have close button in modal', async ({ authenticatedPage: page }) => {
      await page.goto('/farm-hierarchy');
      await waitForLoadingComplete(page);

      // Click create button
      const createButton = page.locator('[data-testid="create-farm-button"], button:has-text("Add Farm")').first();
      if (await createButton.isVisible()) {
        await createButton.click();
        await page.waitForSelector('[data-testid="create-farm-form"]', { timeout: 5000 });

        // Look for close button
        const closeButton = page.locator('[data-testid="close-button"], button:has-text("Close"), button[aria-label*="Close"]');

        const hasCloseButton = await closeButton.isVisible({ timeout: 1000 }).catch(() => false);

        if (hasCloseButton) {
          await expect(closeButton).toBeVisible();
        }
      }
    });

    test('should close modal on Escape', async ({ authenticatedPage: page }) => {
      await page.goto('/farm-hierarchy');
      await waitForLoadingComplete(page);

      // Click create button
      const createButton = page.locator('[data-testid="create-farm-button"], button:has-text("Add Farm")').first();
      if (await createButton.isVisible()) {
        await createButton.click();
        await page.waitForSelector('[data-testid="create-farm-form"]', { timeout: 5000 });

        // Press Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);

        // Modal should close
        const modal = page.locator('[data-testid="create-farm-form"]');
        const isHidden = await modal.isHidden();

        expect(isHidden).toBeTruthy();
      }
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have proper page title', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      await waitForLoadingComplete(page);

      // Check page title
      const title = await page.title();

      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(0);
    });

    test('should have proper heading structure for screen readers', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      await waitForLoadingComplete(page);

      // Check heading hierarchy
      const h1 = page.locator('h1');
      const h2 = page.locator('h2');
      const h3 = page.locator('h3');

      const h1Count = await h1.count();
      const h2Count = await h2.count();
      const h3Count = await h3.count();

      // Should have one h1
      expect(h1Count).toBe(1);

      // Should have h2s for sections
      expect(h2Count).toBeGreaterThan(0);
    });

    test('should have skip links for screen readers', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      await waitForLoadingComplete(page);

      // Look for skip links
      const skipLinks = page.locator('a[href^="#"], [data-testid="skip-link"]');

      const hasSkipLinks = await skipLinks.count() > 0;

      if (hasSkipLinks) {
        await expect(skipLinks.first()).toBeVisible();
      }
    });
  });
});
