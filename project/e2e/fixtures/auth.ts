import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Authentication test fixture
 * Handles login and authentication state for tests
 */

interface AuthFixtures {
  authenticatedPage: Page;
}

/**
 * Extended test with authentication
 */
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Login before each test
    await login(page);
    await use(page);
  },
});

/**
 * Login to the application
 * Uses test credentials from environment variables or defaults
 */
async function login(page: Page) {
  try {
    // Navigate to login page
    console.log('🔐 Navigating to login page...');
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    // Wait for login form to be visible
    console.log('⏳ Waiting for login form...');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    // Fill in credentials
    const email = process.env.TEST_USER_EMAIL || 'zakaria.boutchamir@gmail.com';
    const password = process.env.TEST_USER_PASSWORD || 'boutchaz';

    console.log(`📧 Logging in as: ${email}`);
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);

    // Click submit and wait for response
    console.log('🚀 Submitting login form...');
    await Promise.all([
      page.waitForResponse(response =>
        response.url().includes('auth') && response.status() === 200,
        { timeout: 10000 }
      ).catch(() => null), // Don't fail if auth endpoint is different
      page.click('button[type="submit"]'),
    ]);

    // Wait for navigation to complete
    console.log('⏳ Waiting for redirect...');
    await page.waitForURL(/\/(dashboard|farm-hierarchy|parcels)/, { timeout: 15000 });

    // Wait for the page to be fully loaded
    console.log('⏳ Waiting for page to load...');
    await page.waitForLoadState('domcontentloaded');

    // Wait for sidebar or main navigation to appear
    // This indicates the app has fully initialized
    try {
      await page.waitForSelector('nav, aside, [role="navigation"], main', {
        timeout: 10000,
      });
      console.log('✅ Navigation/main content found');
    } catch (error) {
      console.log('⚠️  Navigation not found, waiting for network idle...');
      await page.waitForLoadState('networkidle', { timeout: 5000 });
    }

    // Give subscription check time to complete
    await page.waitForTimeout(1500);

    console.log('✅ Login successful');
  } catch (error) {
    console.error('❌ Login failed:', error);
    // Take screenshot for debugging
    await page.screenshot({ path: 'login-failure.png', fullPage: true });
    throw new Error(`Login failed: ${error.message}`);
  }
}

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
