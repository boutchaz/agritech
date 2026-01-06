import { chromium, FullConfig } from '@playwright/test';
import type { Page } from '@playwright/test';

// Generate unique credentials for each test run
const uniqueId = Date.now();
export const TEST_USER = {
  email: `e2e-${uniqueId}@test.com`,
  password: `TestPass${uniqueId}!`,
  organizationName: `E2E Org ${uniqueId}`,
  firstName: 'E2E',
  lastName: 'TestUser',
  farmName: `Test Farm ${uniqueId}`,
  farmLocation: 'Casablanca, Morocco',
  farmSize: '100',
};

async function completeOnboarding(page: Page) {
  console.log('Starting 5-step onboarding flow...');

  // Wait for onboarding page to load fully
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Check if there's a resume prompt and click "Recommencer" (Start Over)
  const startOverButton = page.locator('button:has-text("Recommencer")');
  if (await startOverButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('Found resume prompt, clicking Start Over...');
    await startOverButton.click();
    await page.waitForTimeout(2000);
  }

  // Step 1: Profile - Fill first name and last name
  console.log('Onboarding Step 1/5: Profile...');

  // Wait for the form to be visible (look for the specific placeholder)
  await page.waitForSelector('input[placeholder="Votre prénom"]', { timeout: 15000 });

  // Fill first name using specific placeholder
  const firstNameInput = page.locator('input[placeholder="Votre prénom"]');
  await firstNameInput.clear();
  await firstNameInput.fill(TEST_USER.firstName);
  console.log(`Filled first name: ${TEST_USER.firstName}`);

  // Fill last name using specific placeholder
  const lastNameInput = page.locator('input[placeholder="Votre nom"]');
  await lastNameInput.clear();
  await lastNameInput.fill(TEST_USER.lastName);
  console.log(`Filled last name: ${TEST_USER.lastName}`);

  // Wait a bit for the button to become enabled
  await page.waitForTimeout(500);

  // Click Next button
  const nextButton = page.locator('button:has-text("Suivant")');
  await nextButton.click();
  console.log('Clicked Suivant for Step 1');
  await page.waitForTimeout(3000);

  // Step 2: Organization - Fill organization details
  console.log('Onboarding Step 2/5: Organization...');
  await page.waitForLoadState('networkidle');

  // Wait for organization form
  await page.waitForSelector('input[placeholder="Ex: Ferme El Haouzia"]', { timeout: 10000 });

  // Organization name
  const orgNameInput = page.locator('input[placeholder="Ex: Ferme El Haouzia"]');
  const orgValue = await orgNameInput.inputValue();
  if (!orgValue) {
    await orgNameInput.fill(TEST_USER.organizationName);
    console.log(`Filled organization name: ${TEST_USER.organizationName}`);
  }

  // Email
  const emailInput = page.locator('input[placeholder="contact@ferme.ma"]');
  const emailValue = await emailInput.inputValue();
  if (!emailValue) {
    await emailInput.fill(TEST_USER.email);
    console.log(`Filled email: ${TEST_USER.email}`);
  }

  await page.waitForTimeout(500);
  await nextButton.click();
  console.log('Clicked Suivant for Step 2');
  await page.waitForTimeout(3000);

  // Step 3: Farm - Fill farm details
  console.log('Onboarding Step 3/5: Farm...');
  await page.waitForLoadState('networkidle');

  // Wait for farm form
  await page.waitForSelector('input[placeholder="Ex: Ferme Principale"]', { timeout: 10000 });

  // Farm name
  const farmNameInput = page.locator('input[placeholder="Ex: Ferme Principale"]');
  await farmNameInput.fill(TEST_USER.farmName);
  console.log(`Filled farm name: ${TEST_USER.farmName}`);

  // Farm location
  const locationInput = page.locator('input[placeholder="Ex: Benslimane, Casablanca-Settat"]');
  await locationInput.fill(TEST_USER.farmLocation);
  console.log(`Filled farm location: ${TEST_USER.farmLocation}`);

  // Farm size (number input)
  const sizeInput = page.locator('input[type="number"][placeholder="0"]');
  await sizeInput.fill(TEST_USER.farmSize);
  console.log(`Filled farm size: ${TEST_USER.farmSize}`);

  await page.waitForTimeout(500);
  await nextButton.click();
  console.log('Clicked Suivant for Step 3');
  await page.waitForTimeout(3000);

  // Step 4: Modules - Just click next (default selection is fine)
  console.log('Onboarding Step 4/5: Modules...');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  await nextButton.click();
  console.log('Clicked Suivant for Step 4');
  await page.waitForTimeout(3000);

  // Step 5: Preferences - Click "Terminer" (Finish)
  console.log('Onboarding Step 5/5: Preferences...');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const finishButton = page.locator('button:has-text("Terminer")');
  await finishButton.click();
  console.log('Clicked Terminer');

  console.log('Onboarding complete, waiting for redirect...');
  await page.waitForTimeout(5000);
}

async function globalSetup(config: FullConfig) {
  console.log('\n========================================');
  console.log('E2E Global Setup - Creating New Test User');
  console.log('========================================\n');
  console.log(`Unique ID: ${uniqueId}`);
  console.log(`Email: ${TEST_USER.email}`);
  console.log(`Organization: ${TEST_USER.organizationName}`);
  console.log('');

  // Launch browser and register user
  console.log('Step 1: Launching browser for registration...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to register page
    console.log('Step 2: Navigating to register page...');
    await page.goto('http://localhost:5173/register');
    await page.waitForSelector('[data-testid="register-email"]', { timeout: 10000 });

    // Fill registration form
    console.log('Step 3: Filling registration form...');
    await page.fill('[data-testid="register-organization"]', TEST_USER.organizationName);
    await page.fill('[data-testid="register-email"]', TEST_USER.email);
    await page.fill('[data-testid="register-password"]', TEST_USER.password);
    await page.fill('[data-testid="register-confirm-password"]', TEST_USER.password);

    // Submit registration
    console.log('Step 4: Submitting registration...');
    await page.click('[data-testid="register-submit"]');

    // Wait for navigation after registration
    console.log('Step 5: Waiting for post-registration navigation...');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    console.log(`Current URL after registration: ${currentUrl}`);

    // Handle trial selection page
    if (currentUrl.includes('select-trial')) {
      console.log('Step 6: On trial selection page...');

      // Wait for the page to fully load and organization setup to complete
      await page.waitForSelector('[data-testid="start-trial-button"], button:has-text("Start Free 14-Day Trial"), button:has-text("Démarrer")', { timeout: 60000 });
      await page.waitForTimeout(3000);

      // Click the trial button
      console.log('Step 7: Clicking Start Free Trial button...');
      const trialButton = page.locator('[data-testid="start-trial-button"], button:has-text("Start Free 14-Day Trial"), button:has-text("Démarrer")').first();
      await trialButton.click();

      // Wait for redirect to onboarding or dashboard
      console.log('Step 8: Waiting for redirect after trial start...');
      await page.waitForTimeout(5000);
    }

    // Check if we're on the onboarding page
    let newUrl = page.url();
    console.log(`Current URL: ${newUrl}`);

    if (newUrl.includes('/onboarding') && !newUrl.includes('select-trial')) {
      console.log('Step 9: On onboarding page, completing 5-step flow...');
      await completeOnboarding(page);
      newUrl = page.url();
      console.log(`URL after onboarding completion: ${newUrl}`);
    } else if (newUrl.includes('select-trial')) {
      console.log('Still on select-trial page, waiting longer...');
      await page.waitForTimeout(3000);
      newUrl = page.url();
      if (newUrl.includes('/onboarding') && !newUrl.includes('select-trial')) {
        console.log('Now on onboarding page, completing 5-step flow...');
        await completeOnboarding(page);
        newUrl = page.url();
        console.log(`URL after onboarding completion: ${newUrl}`);
      }
    }

    // Check if we ended up on dashboard
    if (newUrl.includes('dashboard')) {
      console.log('Successfully reached dashboard!');
    } else {
      // Try navigating to dashboard
      console.log('Step 10: Navigating to dashboard...');
      await page.goto('http://localhost:5173/dashboard');
      await page.waitForLoadState('networkidle');
    }

    // Handle subscription required screen if shown
    const subscriptionRequired = await page.locator('[data-testid="subscription-required-title"]').isVisible({ timeout: 3000 }).catch(() => false);
    if (subscriptionRequired) {
      console.log('Subscription required screen shown - refreshing page...');
      await page.reload();
      await page.waitForLoadState('networkidle');
    }

    // Wait for dashboard to fully load
    console.log('Step 11: Verifying dashboard loaded...');
    try {
      await page.waitForSelector('nav, aside, [role="navigation"], main', { timeout: 15000 });
      console.log('Dashboard loaded successfully');
    } catch {
      await page.screenshot({ path: 'e2e/dashboard-load-issue.png', fullPage: true });
      console.log('Dashboard may not have loaded fully, continuing...');
    }

    // Save authentication state
    console.log('Step 12: Saving authentication state...');
    await context.storageState({ path: 'e2e/.auth/user.json' });

    console.log('\n========================================');
    console.log('Global Setup Complete!');
    console.log(`Test User: ${TEST_USER.email}`);
    console.log('Auth state saved to: e2e/.auth/user.json');
    console.log('========================================\n');

  } catch (error) {
    console.error('Global setup failed:', error);
    await page.screenshot({ path: 'e2e/global-setup-failure.png', fullPage: true });
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
