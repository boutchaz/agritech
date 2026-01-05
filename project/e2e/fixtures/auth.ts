import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Authentication test fixture
 * Uses the pre-authenticated state from global setup
 */

interface AuthFixtures {
  authenticatedPage: Page;
}

/**
 * Extended test with authentication
 * The authentication state is already loaded from e2e/.auth/user.json
 * via the storageState config in playwright.config.ts
 */
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Authentication is already loaded via storageState in config
    // Just verify we're logged in by navigating to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Wait for the app to initialize
    try {
      await page.waitForSelector('nav, aside, [role="navigation"], main', {
        timeout: 10000,
      });
    } catch {
      // If navigation not found, wait for network idle
      await page.waitForLoadState('networkidle', { timeout: 5000 });
    }

    await use(page);
  },
});

/**
 * Helper to get organization ID from localStorage
 */
export async function getOrganizationId(page: Page): Promise<string | null> {
  const orgData = await page.evaluate(() => {
    const orgStr = localStorage.getItem('currentOrganization');
    if (orgStr) {
      const org = JSON.parse(orgStr);
      return org.id || null;
    }
    return null;
  });
  return orgData;
}

/**
 * Helper to set organization in localStorage
 */
export async function setOrganization(page: Page, organizationId: string, organizationName: string = 'Test Org') {
  await page.evaluate(
    ({ id, name }) => {
      localStorage.setItem(
        'currentOrganization',
        JSON.stringify({
          id,
          name,
          created_at: new Date().toISOString(),
        })
      );
    },
    { id: organizationId, name: organizationName }
  );
}

export { expect };
