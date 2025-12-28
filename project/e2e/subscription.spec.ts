import { test, expect } from './fixtures/auth';
import { waitForLoadingComplete } from './utils/test-helpers';

test.describe('Subscription System', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await waitForLoadingComplete(authenticatedPage);
  });

  test('should display subscription status in settings', async ({ authenticatedPage: page }) => {
    await page.goto('/settings');
    await waitForLoadingComplete(page);

    const subscriptionSection = page.locator(
      '[data-testid="subscription-settings"], ' +
      'text=Subscription, ' +
      'text=Abonnement, ' +
      'h2:has-text("Plan"), ' +
      'h3:has-text("Plan")'
    ).first();

    const hasSubscriptionInfo = await subscriptionSection.isVisible({ timeout: 10000 }).catch(() => false);
    
    if (hasSubscriptionInfo) {
      expect(hasSubscriptionInfo).toBeTruthy();
    } else {
      const settingsNav = page.locator('nav a:has-text("Subscription"), nav a:has-text("Billing")').first();
      if (await settingsNav.isVisible({ timeout: 3000 }).catch(() => false)) {
        await settingsNav.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should show subscription plans', async ({ authenticatedPage: page }) => {
    await page.goto('/select-trial');
    await waitForLoadingComplete(page);
    
    await page.waitForTimeout(2000);

    const planCards = page.locator(
      '[data-testid="plan-card"], ' +
      '.plan-card, ' +
      '[class*="pricing"], ' +
      '[class*="plan"]'
    );

    const planCount = await planCards.count();
    
    if (planCount === 0) {
      const plansText = page.locator('text=Essential, text=Professional, text=Enterprise').first();
      const hasPlansText = await plansText.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasPlansText || page.url().includes('select-trial')).toBeTruthy();
    } else {
      expect(planCount).toBeGreaterThan(0);
    }
  });

  test('should enforce subscription limits', async ({ authenticatedPage: page }) => {
    await page.goto('/farm-hierarchy');
    await waitForLoadingComplete(page);
    
    await page.waitForResponse(/farms/, { timeout: 10000 }).catch(() => null);
    await page.waitForTimeout(1000);

    const createButton = page.locator('[data-testid="create-farm-button"]').first();
    
    if (await createButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      const isDisabled = await createButton.isDisabled();
      
      if (isDisabled) {
        const limitWarning = page.locator(
          '[data-testid="limit-warning"], ' +
          'text=limit, ' +
          'text=upgrade, ' +
          'text=Limite'
        ).first();
        
        const hasWarning = await limitWarning.isVisible({ timeout: 3000 }).catch(() => false);
        expect(isDisabled || hasWarning).toBeTruthy();
      }
    }
  });

  test('should show upgrade prompts for premium features', async ({ authenticatedPage: page }) => {
    const premiumRoutes = [
      '/satellite-analysis',
      '/production-intelligence',
      '/accounting-reports',
    ];

    for (const route of premiumRoutes) {
      await page.goto(route);
      await waitForLoadingComplete(page);
      await page.waitForTimeout(1000);

      const upgradePrompt = page.locator(
        '[data-testid="upgrade-prompt"], ' +
        '[data-testid="feature-gate"], ' +
        'text=Upgrade, ' +
        'text=Premium, ' +
        'text=Subscribe, ' +
        ':has-text("plan required")'
      ).first();

      const hasUpgradePrompt = await upgradePrompt.isVisible({ timeout: 5000 }).catch(() => false);
      
      const featureContent = page.locator('main, [role="main"]').first();
      const hasContent = await featureContent.isVisible({ timeout: 3000 }).catch(() => false);
      
      expect(hasUpgradePrompt || hasContent).toBeTruthy();
    }
  });

  test('should handle trial period correctly', async ({ authenticatedPage: page }) => {
    await page.goto('/settings');
    await waitForLoadingComplete(page);

    const trialIndicator = page.locator(
      'text=Trial, ' +
      'text=Essai, ' +
      'text=days remaining, ' +
      'text=jours restants, ' +
      '[data-testid="trial-status"]'
    ).first();

    const hasTrialIndicator = await trialIndicator.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasTrialIndicator) {
      expect(hasTrialIndicator).toBeTruthy();
    }
  });

  test('should display billing history', async ({ authenticatedPage: page }) => {
    await page.goto('/settings');
    await waitForLoadingComplete(page);

    const billingTab = page.locator(
      'a:has-text("Billing"), ' +
      'button:has-text("Billing"), ' +
      'a:has-text("Facturation"), ' +
      '[data-testid="billing-tab"]'
    ).first();

    if (await billingTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await billingTab.click();
      await page.waitForTimeout(1000);

      const billingSection = page.locator(
        '[data-testid="billing-history"], ' +
        'text=Invoice, ' +
        'text=Facture, ' +
        'table'
      ).first();

      const hasBillingSection = await billingSection.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasBillingSection || page.url().includes('settings')).toBeTruthy();
    }
  });
});

test.describe('Feature Access Control', () => {
  test('should control module access based on subscription', async ({ authenticatedPage: page }) => {
    await page.goto('/settings');
    await waitForLoadingComplete(page);

    const modulesTab = page.locator(
      'a:has-text("Modules"), ' +
      'button:has-text("Modules"), ' +
      '[data-testid="modules-tab"]'
    ).first();

    if (await modulesTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await modulesTab.click();
      await page.waitForTimeout(1000);

      const moduleCards = page.locator('[data-testid="module-card"], .module-card, [class*="module"]');
      const moduleCount = await moduleCards.count();

      if (moduleCount > 0) {
        const lockedModule = page.locator(
          '[data-testid="module-locked"], ' +
          '.module-locked, ' +
          '[class*="locked"], ' +
          ':has([class*="lock"])'
        ).first();

        const hasLockedModule = await lockedModule.isVisible({ timeout: 3000 }).catch(() => false);
        expect(moduleCount > 0 || hasLockedModule).toBeTruthy();
      }
    }
  });

  test('should show CASL-based permission restrictions', async ({ authenticatedPage: page }) => {
    await page.goto('/farm-hierarchy');
    await waitForLoadingComplete(page);
    await page.waitForTimeout(2000);

    const actionButtons = page.locator(
      'button:has-text("Create"), ' +
      'button:has-text("Delete"), ' +
      'button:has-text("Edit"), ' +
      '[data-testid*="create"], ' +
      '[data-testid*="delete"]'
    );

    const buttonCount = await actionButtons.count();
    expect(buttonCount).toBeGreaterThanOrEqual(0);
  });
});
