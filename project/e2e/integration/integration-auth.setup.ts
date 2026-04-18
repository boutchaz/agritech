import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.join(__dirname, '../.auth/integration-user.json');

setup('authenticate against integration dashboard', async ({ page }) => {
  const email = process.env.INTEGRATION_USER_EMAIL;
  const password = process.env.INTEGRATION_USER_PASSWORD;

  if (!email?.trim() || !password) {
    throw new Error(
      'Missing INTEGRATION_USER_EMAIL or INTEGRATION_USER_PASSWORD. ' +
        'These are required to save Playwright storage state for integration tests.',
    );
  }

  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('input[type="email"]', { timeout: 30_000 });

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Login uses `window.location.href = '/dashboard'` (full document navigation).
  // Do not chain `goto('/dashboard')` immediately after leaving /login — it races the
  // in-flight document load and Playwright fails the second navigation.
  await Promise.all([
    page.waitForURL(
      (url) => {
        const p = url.pathname;
        if (p.includes('/login')) return false;
        return (
          p === '/dashboard' ||
          p.startsWith('/dashboard/') ||
          p.includes('select-trial')
        );
      },
      { timeout: 90_000 },
    ),
    page.click('button[type="submit"]'),
  ]);

  await page.waitForLoadState('domcontentloaded');

  if (page.url().includes('select-trial')) {
    const trialButton = page
      .locator(
        '[data-testid="start-trial-button"], button:has-text("Start Free 14-Day Trial"), button:has-text("Démarrer")',
      )
      .first();
    await trialButton.waitFor({ state: 'visible', timeout: 60_000 });
    await Promise.all([
      page.waitForURL((u) => !u.pathname.includes('select-trial'), { timeout: 60_000 }),
      trialButton.click(),
    ]);
    await page.waitForLoadState('domcontentloaded');
  }

  const pathAfterLogin = new URL(page.url()).pathname;
  if (pathAfterLogin.includes('/onboarding') && !page.url().includes('select-trial')) {
    throw new Error(
      'Integration user landed on onboarding. Use a fully onboarded account for integration tests.',
    );
  }

  if (!pathAfterLogin.startsWith('/dashboard')) {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  }

  await page.waitForLoadState('domcontentloaded');
  await page
    .waitForLoadState('networkidle', { timeout: 45_000 })
    .catch(() => page.waitForLoadState('load'));

  await expect(
    page.locator('nav, aside, [role="navigation"], main').first(),
  ).toBeVisible({ timeout: 30_000 });

  await page.context().storageState({ path: authFile });
});
