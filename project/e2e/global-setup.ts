import { chromium, FullConfig, expect } from '@playwright/test';
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
  const hasResumePrompt = await startOverButton.isVisible({ timeout: 5000 }).catch(() => false);
  if (hasResumePrompt) {
    console.log('Found resume prompt, clicking Start Over...');
    await startOverButton.click();
    await page.waitForTimeout(3000);
  }

  // Helper to get current step from step indicator
  const getCurrentStep = async (): Promise<number> => {
    // The current step has the text directly in the circle (not a checkmark)
    for (let step = 1; step <= 5; step++) {
      const stepIndicator = page.locator(`div.rounded-full:has-text("${step}")`).first();
      const isCurrentStep = await stepIndicator.isVisible().catch(() => false);
      if (isCurrentStep) {
        // Check if it's the active step (has emerald background and the number is visible, not a check icon)
        const hasCheck = await stepIndicator.locator('svg').isVisible().catch(() => false);
        if (!hasCheck) {
          return step;
        }
      }
    }
    return 1;
  };

  // Helper to wait for a specific step to be active
  const waitForStep = async (stepNumber: number, timeout = 15000): Promise<boolean> => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const current = await getCurrentStep();
      console.log(`  Current step detected: ${current}, waiting for: ${stepNumber}`);
      if (current === stepNumber) {
        return true;
      }
      await page.waitForTimeout(1000);
    }
    return false;
  };

  // Step 1: Profile - Fill first name and last name
  console.log('Onboarding Step 1/5: Profile...');

  // Wait for loading to complete
  const loadingIndicator = page.locator('.animate-spin, [class*="animate-spin"]');
  try {
    await loadingIndicator.waitFor({ state: 'hidden', timeout: 15000 });
  } catch {
    // Loading may have already finished
  }

  // Wait for the form to be visible - use exact placeholder match
  await page.waitForSelector('input[placeholder="Votre prénom"]', { timeout: 15000 });
  await page.waitForTimeout(1000);

  // Fill first name - use EXACT placeholder to avoid matching wrong input
  const firstNameInput = page.locator('input[placeholder="Votre prénom"]');
  await firstNameInput.click();
  await firstNameInput.fill(TEST_USER.firstName);
  await page.waitForTimeout(300);
  console.log(`  Filled first name: ${TEST_USER.firstName}`);

  // Fill last name - use EXACT placeholder
  const lastNameInput = page.locator('input[placeholder="Votre nom"]');
  await lastNameInput.click();
  await lastNameInput.fill(TEST_USER.lastName);
  await page.waitForTimeout(300);
  console.log(`  Filled last name: ${TEST_USER.lastName}`);

  // Verify values were actually filled correctly
  const firstNameValue = await firstNameInput.inputValue();
  const lastNameValue = await lastNameInput.inputValue();
  console.log(`  First name value: "${firstNameValue}", Last name value: "${lastNameValue}"`);
  
  if (firstNameValue !== TEST_USER.firstName || lastNameValue !== TEST_USER.lastName) {
    console.log('  Values mismatch, trying alternative approach...');
    const textInputs = page.locator('.grid.grid-cols-2 input[type="text"], .grid.grid-cols-2 input:not([type])');
    const inputCount = await textInputs.count();
    console.log(`  Found ${inputCount} text inputs in grid`);
    
    if (inputCount >= 2) {
      await textInputs.nth(0).fill(TEST_USER.firstName);
      await page.waitForTimeout(200);
      await textInputs.nth(1).fill(TEST_USER.lastName);
      await page.waitForTimeout(200);
    }
  }

  await page.waitForTimeout(500);

  const nextButton = page.locator('button:has-text("Suivant"), button:has-text("Next")').first();
  
  // Retry filling if button is still disabled
  let attempts = 0;
  while (await nextButton.isDisabled() && attempts < 3) {
    attempts++;
    console.log(`  Button still disabled, retrying fill (attempt ${attempts})...`);
    await page.locator('input[placeholder="Votre prénom"]').fill(TEST_USER.firstName);
    await page.locator('input[placeholder="Votre prénom"]').dispatchEvent('input');
    await page.locator('input[placeholder="Votre nom"]').fill(TEST_USER.lastName);
    await page.locator('input[placeholder="Votre nom"]').dispatchEvent('input');
    await page.waitForTimeout(1000);
  }

  await expect(nextButton).toBeEnabled({ timeout: 10000 });
  
  // Click and wait for API call to complete
  await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/onboarding') && resp.status() < 400, { timeout: 30000 }).catch(() => null),
    nextButton.click()
  ]);
  console.log('  Clicked Next for Step 1');

  // Wait for step transition
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Step 2: Organization - Fill organization details
  console.log('Onboarding Step 2/5: Organization...');
  
  // Wait for step 2 UI to appear - check for the Organization heading or the specific input
  const orgHeading = page.locator('h2:has-text("Votre Organisation"), h2:has-text("Your Organization")');
  const orgInput = page.locator('input[placeholder="Ex: Ferme El Haouzia"]');
  
  const step2Visible = await Promise.race([
    orgHeading.waitFor({ timeout: 15000 }).then(() => true).catch(() => false),
    orgInput.waitFor({ timeout: 15000 }).then(() => true).catch(() => false)
  ]);
  
  if (step2Visible) {
    console.log('  Organization form is visible');
    
    // Fill organization name
    const orgNameInput = page.locator('input[placeholder="Ex: Ferme El Haouzia"]');
    await orgNameInput.waitFor({ timeout: 5000 });
    await orgNameInput.click();
    await orgNameInput.fill(TEST_USER.organizationName);
    console.log(`  Filled organization name: ${TEST_USER.organizationName}`);

    // Slug should auto-generate, but let's verify
    await page.waitForTimeout(500);

    // Fill organization email
    const emailInput = page.locator('input[placeholder="contact@ferme.ma"]');
    if (await emailInput.isVisible().catch(() => false)) {
      await emailInput.click();
      await emailInput.fill(TEST_USER.email);
      console.log(`  Filled email: ${TEST_USER.email}`);
    }

    await page.waitForTimeout(500);

    const nextBtn = page.locator('button:has-text("Suivant"), button:has-text("Next")').first();
    await expect(nextBtn).toBeEnabled({ timeout: 10000 });
    
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/onboarding') && resp.status() < 400, { timeout: 30000 }).catch(() => null),
      nextBtn.click()
    ]);
    console.log('  Clicked Next for Step 2');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  } else {
    console.log('  Organization form not visible - checking current UI state...');
    // Take a screenshot for debugging
    await page.screenshot({ path: 'e2e/onboarding-step2-missing.png', fullPage: true });
    
    // Check what's currently visible
    const pageContent = await page.content();
    if (pageContent.includes('Choisissez vos Modules') || pageContent.includes('Choose your Modules')) {
      console.log('  Already on Modules step (Step 4) - organization/farm may have been auto-created');
    } else if (pageContent.includes('Votre Première Ferme') || pageContent.includes('Your First Farm')) {
      console.log('  On Farm step (Step 3) - organization may have been auto-created');
    }
  }

  // Step 3: Farm - Fill farm details
  console.log('Onboarding Step 3/5: Farm...');

  const farmHeading = page.locator('h2:has-text("Votre Première Ferme"), h2:has-text("Your First Farm")');
  const farmInput = page.locator('input[placeholder="Ex: Ferme Principale"]');
  
  const step3Visible = await Promise.race([
    farmHeading.waitFor({ timeout: 10000 }).then(() => true).catch(() => false),
    farmInput.waitFor({ timeout: 10000 }).then(() => true).catch(() => false)
  ]);

  if (step3Visible) {
    console.log('  Farm form is visible');
    
    // Fill farm name
    const farmNameInput = page.locator('input[placeholder="Ex: Ferme Principale"]');
    await farmNameInput.waitFor({ timeout: 5000 });
    await farmNameInput.click();
    await farmNameInput.fill(TEST_USER.farmName);
    console.log(`  Filled farm name: ${TEST_USER.farmName}`);

    // Fill location
    const locationInput = page.locator('input[placeholder="Ex: Benslimane, Casablanca-Settat"]');
    if (await locationInput.isVisible().catch(() => false)) {
      await locationInput.click();
      await locationInput.fill(TEST_USER.farmLocation);
      console.log(`  Filled farm location: ${TEST_USER.farmLocation}`);
    }

    // Fill size
    const sizeInput = page.locator('input[type="number"][placeholder="0"]');
    if (await sizeInput.isVisible().catch(() => false)) {
      await sizeInput.click();
      await sizeInput.fill(TEST_USER.farmSize);
      console.log(`  Filled farm size: ${TEST_USER.farmSize}`);
    }

    await page.waitForTimeout(500);
    
    const nextBtn = page.locator('button:has-text("Suivant"), button:has-text("Next")').first();
    await expect(nextBtn).toBeEnabled({ timeout: 10000 });
    
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/onboarding') && resp.status() < 400, { timeout: 30000 }).catch(() => null),
      nextBtn.click()
    ]);
    console.log('  Clicked Next for Step 3');
    await page.waitForTimeout(2000);
  } else {
    console.log('  Farm form not visible - may have been skipped or auto-created');
  }

  // Step 4: Modules - Just click next (default selection is fine)
  console.log('Onboarding Step 4/5: Modules...');
  await page.waitForLoadState('networkidle');
  
  const modulesHeading = page.locator('h2:has-text("Choisissez vos Modules"), h2:has-text("Choose your Modules")');
  const step4Visible = await modulesHeading.isVisible({ timeout: 10000 }).catch(() => false);
  
  if (step4Visible) {
    console.log('  Modules step is visible');
    await page.waitForTimeout(500);
    
    const step4NextBtn = page.locator('button:has-text("Suivant"), button:has-text("Next")').first();
    if (await step4NextBtn.isVisible().catch(() => false)) {
      await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/onboarding') && resp.status() < 400, { timeout: 30000 }).catch(() => null),
        step4NextBtn.click()
      ]);
      console.log('  Clicked Next for Step 4');
      await page.waitForTimeout(2000);
    }
  } else {
    console.log('  Modules step not visible - may have been skipped');
  }

  // Step 5: Preferences - Click "Terminer" (Finish)
  console.log('Onboarding Step 5/5: Preferences...');
  await page.waitForLoadState('networkidle');

  const prefsHeading = page.locator('h2:has-text("Préférences"), h2:has-text("Preferences")');
  const step5Visible = await prefsHeading.isVisible({ timeout: 10000 }).catch(() => false);
  
  if (step5Visible) {
    console.log('  Preferences step is visible');
    await page.waitForTimeout(500);
    
    const finishButton = page.locator('button:has-text("Terminer"), button:has-text("Finish"), button:has-text("Complete")').first();
    if (await finishButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/onboarding') && resp.status() < 400, { timeout: 30000 }).catch(() => null),
        finishButton.click()
      ]);
      console.log('  Clicked Finish');
    }
  } else {
    // Try clicking finish anyway if visible
    const finishButton = page.locator('button:has-text("Terminer"), button:has-text("Finish")').first();
    if (await finishButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await finishButton.click();
      console.log('  Clicked Finish (found without preferences heading)');
    }
  }

  console.log('Onboarding complete, waiting for redirect...');
  await page.waitForTimeout(5000);
}

async function globalSetup(_config: FullConfig) {
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
