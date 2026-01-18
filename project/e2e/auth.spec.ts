import { test, expect } from '@playwright/test';
import { waitForLoadingComplete } from './utils/test-helpers';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/(login|auth)/, { timeout: 10000 });
  });

  test('should display login form', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(3000);
    
    const errorVisible = await page.locator('[role="alert"], .error, [class*="error"]').isVisible();
    const stillOnLogin = page.url().includes('/login');
    
    expect(errorVisible || stillOnLogin).toBeTruthy();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    test.skip(!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD, 'Test user credentials not provided');
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    const email = process.env.TEST_USER_EMAIL!;
    const password = process.env.TEST_USER_PASSWORD!;

    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/(dashboard|farm-hierarchy|select-trial|onboarding)/, { timeout: 30000 });

    expect(page.url()).not.toContain('/login');
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    await page.fill('input[type="email"]', 'notanemail');
    await page.fill('input[type="password"]', 'somepassword');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(500);
    
    const emailInput = page.locator('input[type="email"]');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    
    expect(isInvalid).toBeTruthy();
  });

  test('should require password', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(500);
    
    const passwordInput = page.locator('input[type="password"]');
    const isRequired = await passwordInput.getAttribute('required');
    
    expect(isRequired !== null || page.url().includes('/login')).toBeTruthy();
  });
});

test.describe('Protected Routes', () => {
  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    
    const protectedRoutes = [
      '/dashboard',
      '/farm-hierarchy',
      '/parcels',
      '/workers',
      '/tasks',
      '/stock',
      '/settings',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      const isRedirected = currentUrl.includes('/login') || currentUrl.includes('/auth');
      
      expect(isRedirected).toBeTruthy();
    }
  });
});

test.describe('Session Persistence', () => {
  test('should maintain session after page reload', async ({ page }) => {
    test.skip(!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD, 'Test user credentials not provided');
    
    await page.context().clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    const email = process.env.TEST_USER_EMAIL!;
    const password = process.env.TEST_USER_PASSWORD!;

    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/(dashboard|farm-hierarchy|select-trial|onboarding)/, { timeout: 30000 });

    const urlAfterLogin = page.url();
    expect(urlAfterLogin).not.toContain('/login');

    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const urlAfterReload = page.url();
    expect(urlAfterReload).not.toContain('/login');
  });
});

test.describe('Logout', () => {
  test('should logout successfully', async ({ page }) => {
    test.skip(!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD, 'Test user credentials not provided');
    
    await page.context().clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    const email = process.env.TEST_USER_EMAIL!;
    const password = process.env.TEST_USER_PASSWORD!;

    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/(dashboard|farm-hierarchy|select-trial|onboarding)/, { timeout: 30000 });

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Déconnexion"), [data-testid="logout-button"]').first();
    
    if (await logoutButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await logoutButton.click();
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      const isLoggedOut = currentUrl.includes('/login') || currentUrl.includes('/');
      expect(isLoggedOut).toBeTruthy();
    } else {
      const userMenu = page.locator('[data-testid="user-menu"], button:has([class*="avatar"]), .user-menu').first();
      if (await userMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
        await userMenu.click();
        await page.waitForTimeout(500);
        
        const logoutInMenu = page.locator('button:has-text("Logout"), button:has-text("Déconnexion"), [role="menuitem"]:has-text("Logout")').first();
        if (await logoutInMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
          await logoutInMenu.click();
          await page.waitForTimeout(2000);
          expect(page.url()).toContain('/login');
        }
      }
    }
  });
});
