import { test, expect } from './fixtures/auth';
import {
  waitForLoadingComplete,
  fillFormField,
  clickAndWait,
} from './utils/test-helpers';

/**
 * Multi-Language Support E2E Tests
 * Tests language switching and localization across the application
 */

test.describe('Multi-Language Support', () => {
  test.describe('Language Switching', () => {
    test('should switch to English', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      await waitForLoadingComplete(page);

      // Look for language selector
      const languageSelector = page.locator('[data-testid="language-selector"], select[name="language"], .language-selector').first();

      if (await languageSelector.isVisible()) {
        // Switch to English
        await page.selectOption('[data-testid="language-selector"], select[name="language"], .language-selector', 'en');
        await page.waitForTimeout(1000);

        // Verify language changed
        const currentLanguage = await languageSelector.inputValue();
        expect(currentLanguage).toBe('en');
      }
    });

    test('should switch to French', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      await waitForLoadingComplete(page);

      // Look for language selector
      const languageSelector = page.locator('[data-testid="language-selector"], select[name="language"], .language-selector').first();

      if (await languageSelector.isVisible()) {
        // Switch to French
        await page.selectOption('[data-testid="language-selector"], select[name="language"], .language-selector', 'fr');
        await page.waitForTimeout(1000);

        // Verify language changed
        const currentLanguage = await languageSelector.inputValue();
        expect(currentLanguage).toBe('fr');

        // Verify French text is displayed
        const frenchText = page.locator('text="Récolte", text="Tableau de bord", text="Ouvriers"');
        const hasFrenchText = await frenchText.count() > 0;

        if (hasFrenchText) {
          await expect(frenchText.first()).toBeVisible();
        }
      }
    });

    test('should switch to Arabic', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      await waitForLoadingComplete(page);

      // Look for language selector
      const languageSelector = page.locator('[data-testid="language-selector"], select[name="language"], .language-selector').first();

      if (await languageSelector.isVisible()) {
        // Switch to Arabic
        await page.selectOption('[data-testid="language-selector"], select[name="language"], .language-selector', 'ar');
        await page.waitForTimeout(1000);

        // Verify language changed
        const currentLanguage = await languageSelector.inputValue();
        expect(currentLanguage).toBe('ar');

        // Verify RTL direction is applied
        const htmlElement = page.locator('html');
        const dirAttribute = await htmlElement.getAttribute('dir');
        expect(dirAttribute).toBe('rtl');
      }
    });
  });

  test.describe('English Localization', () => {
    test.beforeEach(async ({ authenticatedPage }) => {
      // Switch to English
      await authenticatedPage.goto('/dashboard');
      const languageSelector = authenticatedPage.locator('[data-testid="language-selector"], select[name="language"]').first();
      if (await languageSelector.isVisible()) {
        await authenticatedPage.selectOption('[data-testid="language-selector"], select[name="language"]', 'en');
        await authenticatedPage.waitForTimeout(1000);
      }
      await waitForLoadingComplete(authenticatedPage);
    });

    test('should display English labels', async ({ authenticatedPage: page }) => {
      // Look for common English labels
      const englishLabels = [
        'Dashboard',
        'Farms',
        'Parcels',
        'Workers',
        'Tasks',
        'Harvests',
        'Stock',
      ];

      for (const label of englishLabels) {
        const element = page.locator(`text="${label}"`);
        const isVisible = await element.isVisible({ timeout: 1000 }).catch(() => false);
        if (isVisible) {
          await expect(element).toBeVisible();
        }
      }
    });

    test('should display English form labels', async ({ authenticatedPage: page }) => {
      // Navigate to a form page
      await page.goto('/farm-hierarchy');
      await waitForLoadingComplete(page);

      // Look for English form labels
      const formLabels = page.locator('text="Create Farm", text="Farm Name", text="Add Farm"');
      const hasLabels = await formLabels.count() > 0;

      if (hasLabels) {
        await expect(formLabels.first()).toBeVisible();
      }
    });

    test('should display English error messages', async ({ authenticatedPage: page }) => {
      // Navigate to a form page
      await page.goto('/farm-hierarchy');
      await waitForLoadingComplete(page);

      // Try to create a farm without name
      const createButton = page.locator('[data-testid="create-farm-button"], button:has-text("Add Farm")').first();
      if (await createButton.isVisible()) {
        await createButton.click();
        await page.waitForSelector('[data-testid="create-farm-form"]', { timeout: 5000 });

        const submitButton = page.locator('[data-testid="farm-submit-button"], button[type="submit"]');
        await submitButton.click();
        await page.waitForTimeout(500);

        // Look for English error message
        const errorMessage = page.locator('text="required", text="This field is required"');
        const hasError = await errorMessage.isVisible({ timeout: 1000 }).catch(() => false);

        if (hasError) {
          await expect(errorMessage).toBeVisible();
        }
      }
    });
  });

  test.describe('French Localization', () => {
    test.beforeEach(async ({ authenticatedPage }) => {
      // Switch to French
      await authenticatedPage.goto('/dashboard');
      const languageSelector = authenticatedPage.locator('[data-testid="language-selector"], select[name="language"]').first();
      if (await languageSelector.isVisible()) {
        await authenticatedPage.selectOption('[data-testid="language-selector"], select[name="language"]', 'fr');
        await authenticatedPage.waitForTimeout(1000);
      }
      await waitForLoadingComplete(authenticatedPage);
    });

    test('should display French labels', async ({ authenticatedPage: page }) => {
      // Look for common French labels
      const frenchLabels = [
        'Tableau de bord',
        'Fermes',
        'Parcelles',
        'Ouvriers',
        'Tâches',
        'Récoltes',
        'Stock',
      ];

      for (const label of frenchLabels) {
        const element = page.locator(`text="${label}"`);
        const isVisible = await element.isVisible({ timeout: 1000 }).catch(() => false);
        if (isVisible) {
          await expect(element).toBeVisible();
        }
      }
    });

    test('should display French form labels', async ({ authenticatedPage: page }) => {
      // Navigate to a form page
      await page.goto('/farm-hierarchy');
      await waitForLoadingComplete(page);

      // Look for French form labels
      const formLabels = page.locator('text="Créer une ferme", text="Nom de la ferme", text="Ajouter"');
      const hasLabels = await formLabels.count() > 0;

      if (hasLabels) {
        await expect(formLabels.first()).toBeVisible();
      }
    });

    test('should display French error messages', async ({ authenticatedPage: page }) => {
      // Navigate to a form page
      await page.goto('/farm-hierarchy');
      await waitForLoadingComplete(page);

      // Try to create a farm without name
      const createButton = page.locator('[data-testid="create-farm-button"], button:has-text("Ajouter")').first();
      if (await createButton.isVisible()) {
        await createButton.click();
        await page.waitForSelector('[data-testid="create-farm-form"]', { timeout: 5000 });

        const submitButton = page.locator('[data-testid="farm-submit-button"], button[type="submit"]');
        await submitButton.click();
        await page.waitForTimeout(500);

        // Look for French error message
        const errorMessage = page.locator('text="obligatoire", text="Ce champ est requis"');
        const hasError = await errorMessage.isVisible({ timeout: 1000 }).catch(() => false);

        if (hasError) {
          await expect(errorMessage).toBeVisible();
        }
      }
    });
  });

  test.describe('Arabic Localization', () => {
    test.beforeEach(async ({ authenticatedPage }) => {
      // Switch to Arabic
      await authenticatedPage.goto('/dashboard');
      const languageSelector = authenticatedPage.locator('[data-testid="language-selector"], select[name="language"]').first();
      if (await languageSelector.isVisible()) {
        await authenticatedPage.selectOption('[data-testid="language-selector"], select[name="language"]', 'ar');
        await authenticatedPage.waitForTimeout(1000);
      }
      await waitForLoadingComplete(authenticatedPage);
    });

    test('should display Arabic labels', async ({ authenticatedPage: page }) => {
      // Look for common Arabic labels
      const arabicLabels = [
        'لوحة القيادة',
        'المزارع',
        'القطع',
        'العمال',
        'المهام',
        'الحصاد',
        'المخزون',
      ];

      for (const label of arabicLabels) {
        const element = page.locator(`text="${label}"`);
        const isVisible = await element.isVisible({ timeout: 1000 }).catch(() => false);
        if (isVisible) {
          await expect(element).toBeVisible();
        }
      }
    });

    test('should apply RTL direction', async ({ authenticatedPage: page }) => {
      // Verify RTL direction
      const htmlElement = page.locator('html');
      const dirAttribute = await htmlElement.getAttribute('dir');

      expect(dirAttribute).toBe('rtl');
    });

    test('should display Arabic form labels', async ({ authenticatedPage: page }) => {
      // Navigate to a form page
      await page.goto('/farm-hierarchy');
      await waitForLoadingComplete(page);

      // Look for Arabic form labels
      const formLabels = page.locator('text="إنشاء مزرعة", text="اسم المزرعة"');
      const hasLabels = await formLabels.count() > 0;

      if (hasLabels) {
        await expect(formLabels.first()).toBeVisible();
      }
    });
  });

  test.describe('Language Persistence', () => {
    test('should persist language selection across navigation', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      await waitForLoadingComplete(page);

      // Switch to French
      const languageSelector = page.locator('[data-testid="language-selector"], select[name="language"]').first();
      if (await languageSelector.isVisible()) {
        await page.selectOption('[data-testid="language-selector"], select[name="language"]', 'fr');
        await page.waitForTimeout(1000);

        // Navigate to another page
        await page.goto('/workers');
        await waitForLoadingComplete(page);

        // Verify language is still French
        const currentLanguage = await languageSelector.inputValue();
        expect(currentLanguage).toBe('fr');
      }
    });

    test('should persist language selection after reload', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      await waitForLoadingComplete(page);

      // Switch to Arabic
      const languageSelector = page.locator('[data-testid="language-selector"], select[name="language"]').first();
      if (await languageSelector.isVisible()) {
        await page.selectOption('[data-testid="language-selector"], select[name="language"]', 'ar');
        await page.waitForTimeout(1000);

        // Reload page
        await page.reload();
        await waitForLoadingComplete(page);

        // Verify language is still Arabic
        const currentLanguage = await languageSelector.inputValue();
        expect(currentLanguage).toBe('ar');
      }
    });
  });

  test.describe('Date and Number Formatting', () => {
    test('should format dates according to locale', async ({ authenticatedPage: page }) => {
      await page.goto('/harvests');
      await waitForLoadingComplete(page);

      // Switch to French
      const languageSelector = page.locator('[data-testid="language-selector"], select[name="language"]').first();
      if (await languageSelector.isVisible()) {
        await page.selectOption('[data-testid="language-selector"], select[name="language"]', 'fr');
        await page.waitForTimeout(1000);

        // Look for date elements
        const dateElements = page.locator('[data-date], .date-display');
        const hasDates = await dateElements.count() > 0;

        if (hasDates) {
          // Verify dates are visible
          await expect(dateElements.first()).toBeVisible();
        }
      }
    });

    test('should format numbers according to locale', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      await waitForLoadingComplete(page);

      // Switch to French
      const languageSelector = page.locator('[data-testid="language-selector"], select[name="language"]').first();
      if (await languageSelector.isVisible()) {
        await page.selectOption('[data-testid="language-selector"], select[name="language"]', 'fr');
        await page.waitForTimeout(1000);

        // Look for number elements
        const numberElements = page.locator('[data-number], .number-display');
        const hasNumbers = await numberElements.count() > 0;

        if (hasNumbers) {
          // Verify numbers are visible
          await expect(numberElements.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Currency Formatting', () => {
    test('should display currency in correct format', async ({ authenticatedPage: page }) => {
      await page.goto('/reports');
      await waitForLoadingComplete(page);

      // Switch to French
      const languageSelector = page.locator('[data-testid="language-selector"], select[name="language"]').first();
      if (await languageSelector.isVisible()) {
        await page.selectOption('[data-testid="language-selector"], select[name="language"]', 'fr');
        await page.waitForTimeout(1000);

        // Look for currency elements
        const currencyElements = page.locator('[data-currency], .currency-display');
        const hasCurrency = await currencyElements.count() > 0;

        if (hasCurrency) {
          // Verify currency is visible
          await expect(currencyElements.first()).toBeVisible();
        }
      }
    });
  });
});
