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
  console.log('Starting onboarding flow...');

  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const startOverButton = page.locator('button:has-text("Recommencer"), button:has-text("Start Over")');
  if (await startOverButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('Found resume prompt, clicking Start Over...');
    await startOverButton.click();
    await page.waitForTimeout(2000);
  }

  console.log('Waiting for greeting screen to auto-dismiss (2.5s)...');
  await page.waitForTimeout(3500);

  // ========================================
  // STEP 1: Profile (name → phone → language → timezone)
  // ========================================

  // Sub-step 0: Name input
  console.log('Step 1.0: Profile - Name input...');
  const nameHeading = page.getByTestId('onboarding-step-name-title');
  if (await nameHeading.isVisible({ timeout: 10000 }).catch(() => false)) {
    await page.waitForTimeout(500);

    const firstNameInput = page.locator('[data-testid="onboarding-input-pr-nom"]');
    const lastNameInput = page.locator('[data-testid="onboarding-input-nom"]');

    await firstNameInput.waitFor({ state: 'visible', timeout: 5000 });
    await firstNameInput.fill(TEST_USER.firstName);
    console.log(`  Filled first name: ${TEST_USER.firstName}`);

    await lastNameInput.fill(TEST_USER.lastName);
    console.log(`  Filled last name: ${TEST_USER.lastName}`);

    const continueNameBtn = page.locator('[data-testid="onboarding-continue-name"]');
    await expect(continueNameBtn).toBeEnabled({ timeout: 5000 });
    await continueNameBtn.click();
    console.log('  Clicked Continue');
    await page.waitForTimeout(1500);
    console.log(`  Current URL after name: ${page.url()}`);
  }

  // Sub-step 1: Phone (international, default MA)
  console.log('Step 1.1: Profile - Phone...');
  const phoneField = page.locator('#onboarding-profile-phone');
  if (await phoneField.isVisible({ timeout: 8000 }).catch(() => false)) {
    await phoneField.fill('+212612345678');
    console.log('  Filled phone +212612345678');
    const continuePhoneBtn = page.locator('[data-testid="onboarding-continue-phone"]');
    await expect(continuePhoneBtn).toBeEnabled({ timeout: 5000 });
    await continuePhoneBtn.click();
    console.log('  Clicked Continue (phone)');
    await page.waitForTimeout(1000);
  }

  // Sub-step 2: Language selection
  console.log('Step 1.2: Profile - Language selection...');
  
  const langHeading = page.getByTestId('onboarding-step-language-title');
  const langVisible = await langHeading.isVisible({ timeout: 8000 }).catch(() => false);
  
  if (langVisible) {
    await page.waitForTimeout(500);

    const frenchCard = page.getByTestId('onboarding-lang-fr');
    if (await frenchCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await frenchCard.click();
      console.log('  Selected Français');
    }

    const continueLangBtn = page.locator('[data-testid="onboarding-continue-language"]');
    if (await continueLangBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await continueLangBtn.click();
      console.log('  Clicked Continue');
    }
    await page.waitForTimeout(1000);
  }

  // Sub-step 3: Timezone selection
  console.log('Step 1.3: Profile - Timezone selection...');
  const tzHeading = page.getByTestId('onboarding-step-timezone-title');
  if (await tzHeading.isVisible({ timeout: 5000 }).catch(() => false)) {
    await page.waitForTimeout(500);

    const casablancaCard = page.getByTestId('onboarding-tz-Africa-Casablanca');
    if (await casablancaCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await casablancaCard.click();
      console.log('  Selected Casablanca timezone');
    }

    const nextStepBtn = page.locator('[data-testid="onboarding-next-step-profile"]');
    await expect(nextStepBtn).toBeVisible({ timeout: 5000 });
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/onboarding') && resp.status() < 400, { timeout: 30000 }).catch(() => null),
      nextStepBtn.click()
    ]);
    console.log('  Clicked Étape suivante');
  }

  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // ========================================
  // STEP 2: Organization (may auto-advance)
  // ========================================
  console.log('Step 2: Organization...');
  
  await page.waitForTimeout(2000);
  const currentUrlAfterProfile = page.url();
  console.log(`  Current URL: ${currentUrlAfterProfile}`);
  
  if (currentUrlAfterProfile.includes('/onboarding/farm') || currentUrlAfterProfile.includes('/onboarding/modules')) {
    console.log('  Organization step auto-advanced (org exists from signup)');
  } else if (currentUrlAfterProfile.includes('/onboarding/organization')) {
    console.log('  On organization step - filling form...');
    
    const orgAccountTypeHeading = page.getByTestId('onboarding-org-account-type-title');
    if (await orgAccountTypeHeading.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('  Sub-step 0: Account type selection');
      const farmTypeCard = page.getByTestId('onboarding-org-account-farm');
      await farmTypeCard.click();
      console.log('  Selected "Exploitation Agricole"');
      
      const continueBtn = page.locator('button:has-text("Continuer")').first();
      await continueBtn.click();
      await page.waitForTimeout(1500);
    }

    const orgNameInput = page.locator('[data-testid="onboarding-input-nom-de-l-organisation"]');
    if (await orgNameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('  Sub-step 1: Organization name');
      await orgNameInput.fill(TEST_USER.organizationName);
      console.log(`  Filled organization name: ${TEST_USER.organizationName}`);
      
      await page.waitForTimeout(2000);
      
      const continueBtn = page.locator('button:has-text("Continuer")').first();
      await expect(continueBtn).toBeEnabled({ timeout: 15000 });
      await continueBtn.click();
      await page.waitForTimeout(1500);
    }

    const emailInput = page.locator('[data-testid="onboarding-input-email-professionnel"]');
    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('  Sub-step 2: Contact & location');
      const currentValue = await emailInput.inputValue();
      if (!currentValue) {
        await emailInput.fill(TEST_USER.email);
        console.log('  Filled email');
      }
      
      const nextStepBtn = page.locator('button:has-text("Étape suivante")').first();
      await expect(nextStepBtn).toBeEnabled({ timeout: 10000 });
      await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/onboarding') && resp.status() < 400, { timeout: 30000 }).catch(() => null),
        nextStepBtn.click()
      ]);
      console.log('  Clicked Étape suivante');
    }
  } else {
    console.log('  Organization step skipped - not on organization URL');
  }

  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // ========================================
  // STEP 3: Farm (4 sub-steps)
  // ========================================
  console.log('Step 3: Farm...');

  const farmNameHeading = page.locator('h2:has-text("Créons votre première ferme")');
  if (await farmNameHeading.isVisible({ timeout: 8000 }).catch(() => false)) {
    // Sub-step 0: Farm name & location
    const farmNameInput = page.locator('[data-testid="onboarding-input-nom-de-la-ferme"]');
    const locationSearch = page.locator('[data-testid="farm-location-search"]');

    await farmNameInput.waitFor({ state: 'visible', timeout: 5000 });
    await farmNameInput.fill(TEST_USER.farmName);
    console.log(`  Filled farm name: ${TEST_USER.farmName}`);

    await locationSearch.waitFor({ state: 'visible', timeout: 5000 });
    await locationSearch.fill(TEST_USER.farmLocation);
    console.log(`  Searched location: ${TEST_USER.farmLocation}`);
    const firstResult = page.locator('[data-testid="farm-location-result-0"]');
    await firstResult.waitFor({ state: 'visible', timeout: 25000 });
    await firstResult.click();
    console.log('  Selected first geocoding result');

    let continueBtn = page.locator('button:has-text("Continuer")').first();
    await expect(continueBtn).toBeEnabled({ timeout: 5000 });
    await continueBtn.click();
    await page.waitForTimeout(1000);

    // Sub-step 1: Farm size
    const sizeHeading = page.locator('h2:has-text("superficie")');
    if (await sizeHeading.isVisible({ timeout: 5000 }).catch(() => false)) {
      const sizeInput = page.locator('input[type="number"]');
      await sizeInput.fill(TEST_USER.farmSize);
      console.log(`  Filled farm size: ${TEST_USER.farmSize}`);

      continueBtn = page.locator('button:has-text("Continuer")').first();
      await continueBtn.click();
      await page.waitForTimeout(1000);
    }

    // Sub-step 2: Soil type (optional) - just skip
    const soilHeading = page.locator('h2:has-text("type de sol")');
    if (await soilHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
      const skipBtn = page.locator('button:has-text("Passer")');
      if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await skipBtn.click();
        console.log('  Skipped soil type');
      } else {
        continueBtn = page.locator('button:has-text("Continuer")').first();
        await continueBtn.click();
      }
      await page.waitForTimeout(1000);
    }

    // Sub-step 3: Climate zone (optional) - click Étape suivante
    const climateHeading = page.locator('h2:has-text("Zone climatique")');
    if (await climateHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
      const nextStepBtn = page.locator('button:has-text("Étape suivante")').first();
      await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/onboarding') && resp.status() < 400, { timeout: 30000 }).catch(() => null),
        nextStepBtn.click()
      ]);
      console.log('  Clicked Étape suivante for Farm');
    }
  } else {
    console.log('  Farm step not visible - may have been skipped');
  }

  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // ========================================
  // STEP 4: Modules
  // ========================================
  console.log('Step 4: Modules...');

  const onModulesPage = page.url().includes('/onboarding/modules');
  const modulesHeading = page.locator('h2:has-text("super-pouvoirs")');
  const modulesVisible = await modulesHeading.isVisible({ timeout: 8000 }).catch(() => false);

  if (onModulesPage || modulesVisible) {
    console.log('  Modules step visible, selecting modules...');
    await page.waitForTimeout(1000);

    // Click "Tout sélectionner" to select all modules
    const selectAllBtn = page.locator('button:has-text("Tout sélectionner")');
    if (await selectAllBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await selectAllBtn.click();
      console.log('  Clicked "Tout sélectionner"');
      await page.waitForTimeout(500);
    }

    // Click "Dernière étape" → final settings (chart, currency, dates) → launch workspace
    const lastStepBtn = page.locator('button:has-text("Dernière étape")');
    if (await lastStepBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('  Clicking "Dernière étape" button...');
      await Promise.all([
        page.waitForURL((url) => url.toString().includes('/onboarding/complete'), { timeout: 30000 }).catch(() => null),
        lastStepBtn.click(),
      ]);
      console.log('  Clicked Dernière étape');

      const launchBtn = page.locator(
        'button:has-text("Ouvrir mon espace"), button:has-text("Open my workspace")',
      );
      if (await launchBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
        await Promise.all([
          page.waitForURL((url) => !url.toString().includes('/onboarding'), { timeout: 60000 }).catch(() => null),
          launchBtn.click(),
        ]);
        console.log('  Clicked launch workspace (onboarding complete)');
      } else {
        console.log('  Launch workspace button not found on complete step');
      }
    } else {
      console.log('  "Dernière étape" button not found');
    }
  } else {
    console.log('  Modules step not visible - may have been skipped');
  }

  await page.waitForTimeout(3000);
  console.log('Onboarding flow completed!');
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
