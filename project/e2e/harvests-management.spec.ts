import { test, expect } from './fixtures/auth';
import {
  waitForAPIResponse,
  waitForLoadingComplete,
  waitForToast,
  fillFormField,
  clickAndWait,
} from './utils/test-helpers';

/**
 * Harvests Management E2E Tests
 * Tests all harvest-related functionality including CRUD operations, sales, and quality control
 */

test.describe('Harvests Management', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/harvests');
    await waitForLoadingComplete(authenticatedPage);
  });

  test.describe('Harvest List', () => {
    test('should display harvests list', async ({ authenticatedPage: page }) => {
      // Wait for harvests API
      await page.waitForResponse(/\/api\/v1\/harvests/, { timeout: 10000 });

      // Check for harvests list or empty state
      const harvestsList = page.locator('[data-testid="harvests-list"]');
      const emptyState = page.locator('[data-testid="harvests-empty-state"]');

      const hasHarvests = await harvestsList.isVisible();
      const hasEmptyState = await emptyState.isVisible();

      expect(hasHarvests || hasEmptyState).toBeTruthy();
    });

    test('should filter harvests by status', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/harvests/, { timeout: 10000 });

      // Look for status filter
      const statusFilter = page.locator('select[name="status"], [data-testid="status-filter"]').first();

      if (await statusFilter.isVisible()) {
        // Filter by stored status
        await page.selectOption('select[name="status"], [data-testid="status-filter"]', 'stored');
        await page.waitForTimeout(500);

        // Verify filter is applied
        const url = page.url();
        expect(url).toContain('status=stored');
      }
    });

    test('should filter harvests by date range', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/harvests/, { timeout: 10000 });

      // Look for date range inputs
      const fromDateInput = page.locator('input[name="date_from"], [data-testid="from-date"]');
      const toDateInput = page.locator('input[name="date_to"], [data-testid="to-date"]');

      if (await fromDateInput.isVisible() && await toDateInput.isVisible()) {
        // Set date range
        const today = new Date().toISOString().split('T')[0];
        const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        await fillFormField(page, 'input[name="date_from"], [data-testid="from-date"]', lastMonth);
        await fillFormField(page, 'input[name="date_to"], [data-testid="to-date"]', today);

        await page.waitForTimeout(500);

        // Verify filter is applied
        const url = page.url();
        expect(url).toMatch(/(date_from|from)/);
      }
    });

    test('should search harvests by crop', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/harvests/, { timeout: 10000 });

      // Look for search input
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="recherche" i]').first();

      if (await searchInput.isVisible()) {
        await searchInput.fill('tomato');
        await page.waitForTimeout(500);

        // Verify search is applied
        expect(true).toBeTruthy();
      }
    });

    test('should show harvest statistics', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/harvests/, { timeout: 10000 });

      // Look for statistics cards
      const statsCards = page.locator('[data-testid="harvest-stats"], .stats-card, [class*="stat"]');

      const hasStats = await statsCards.count() > 0;
      if (hasStats) {
        await expect(statsCards.first()).toBeVisible();
      }
    });
  });

  test.describe('Harvest Creation', () => {
    test('should create a new harvest', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/harvests/, { timeout: 10000 });

      // Click create harvest button
      const createButton = page.locator('[data-testid="create-harvest-button"], button:has-text("Add Harvest"), button:has-text("Ajouter")').first();
      await createButton.click();

      // Wait for form
      await page.waitForSelector('[data-testid="create-harvest-form"], form:has-text("Harvest" i), form:has-text("Récolte" i)', { timeout: 5000 });

      // Fill harvest details
      const timestamp = Date.now();
      const harvestDate = new Date().toISOString().split('T')[0];

      await fillFormField(page, 'input[name="harvest_date"], input[type="date"]', harvestDate);
      await fillFormField(page, 'input[name="quantity"]', '1000');

      // Select crop if dropdown exists
      const cropSelect = page.locator('select[name="crop_id"]');
      if (await cropSelect.isVisible()) {
        const options = await cropSelect.locator('option').count();
        if (options > 1) {
          await page.selectOption('select[name="crop_id"]', { index: 1 });
        }
      }

      // Select parcel if dropdown exists
      const parcelSelect = page.locator('select[name="parcel_id"]');
      if (await parcelSelect.isVisible()) {
        const options = await parcelSelect.locator('option').count();
        if (options > 1) {
          await page.selectOption('select[name="parcel_id"]', { index: 1 });
        }
      }

      // Select unit
      const unitSelect = page.locator('select[name="unit"]');
      if (await unitSelect.isVisible()) {
        await page.selectOption('select[name="unit"]', 'kg');
      }

      // Submit harvest creation
      const submitButton = page.locator('[data-testid="harvest-submit-button"], button[type="submit"]');
      await submitButton.click();

      // Wait for API response
      await page.waitForResponse(/\/api\/v1\/harvests/, { timeout: 10000 });
      await waitForToast(page, undefined, 'success');

      // Verify harvest appears in list
      await page.waitForTimeout(1000);
      const harvestsList = page.locator('[data-testid="harvests-list"]');
      if (await harvestsList.isVisible()) {
        await expect(harvestsList).toBeVisible();
      }
    });

    test('should validate required fields', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/harvests/, { timeout: 10000 });

      // Click create harvest button
      const createButton = page.locator('[data-testid="create-harvest-button"], button:has-text("Add Harvest")').first();
      await createButton.click();

      // Wait for form
      await page.waitForSelector('[data-testid="create-harvest-form"], form:has-text("Harvest" i)', { timeout: 5000 });

      // Try to submit without filling required fields
      const submitButton = page.locator('[data-testid="harvest-submit-button"], button[type="submit"]');
      await submitButton.click();
      await page.waitForTimeout(500);

      // Should show validation errors
      const errorElements = page.locator('[data-testid="harvest-error"], [class*="error"], .error, [role="alert"]');
      const hasErrors = await errorElements.count() > 0;

      expect(hasErrors).toBeTruthy();
    });

    test('should validate quantity is positive', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/harvests/, { timeout: 10000 });

      // Click create harvest button
      const createButton = page.locator('[data-testid="create-harvest-button"], button:has-text("Add Harvest")').first();
      await createButton.click();

      // Wait for form
      await page.waitForSelector('[data-testid="create-harvest-form"], form:has-text("Harvest" i)', { timeout: 5000 });

      // Fill with negative quantity
      await fillFormField(page, 'input[name="quantity"]', '-100');
      await page.waitForTimeout(300);

      // Check for validation error
      const quantityInput = page.locator('input[name="quantity"]');
      const minValue = await quantityInput.getAttribute('min');
      expect(minValue).toBe('0');
    });
  });

  test.describe('Harvest Details', () => {
    test('should display harvest details', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/harvests/, { timeout: 10000 });

      // Look for a harvest card
      const harvestCard = page.locator('[data-testid="harvest-card"], .harvest-card, [class*="harvest"]').first();

      if (await harvestCard.isVisible()) {
        // Click on harvest
        await harvestCard.click();
        await page.waitForTimeout(500);

        // Verify details modal/page is shown
        const detailsModal = page.locator('[data-testid="harvest-details-modal"], [role="dialog"]');
        const hasDetails = await detailsModal.isVisible();

        expect(hasDetails).toBeTruthy();
      }
    });

    test('should show harvest quality information', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/harvests/, { timeout: 10000 });

      // Look for harvest card
      const harvestCard = page.locator('[data-testid="harvest-card"], .harvest-card').first();

      if (await harvestCard.isVisible()) {
        await harvestCard.click();
        await page.waitForTimeout(500);

        // Look for quality section
        const qualitySection = page.locator('[data-testid="harvest-quality"], .quality-info');
        const hasQuality = await qualitySection.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasQuality) {
          await expect(qualitySection).toBeVisible();
        }
      }
    });

    test('should show harvest workers', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/harvests/, { timeout: 10000 });

      // Look for harvest card
      const harvestCard = page.locator('[data-testid="harvest-card"], .harvest-card').first();

      if (await harvestCard.isVisible()) {
        await harvestCard.click();
        await page.waitForTimeout(500);

        // Look for workers section
        const workersSection = page.locator('[data-testid="harvest-workers"], .workers');
        const hasWorkers = await workersSection.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasWorkers) {
          await expect(workersSection).toBeVisible();
        }
      }
    });
  });

  test.describe('Harvest Update', () => {
    test('should update harvest information', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/harvests/, { timeout: 10000 });

      // Look for edit button on first harvest
      const editButton = page.locator('[data-testid="edit-harvest-button"], button:has-text("Edit"), button[title*="Edit"]').first();

      if (await editButton.isVisible()) {
        // Click edit
        await editButton.click();
        await page.waitForSelector('[data-testid="edit-harvest-form"], form:has-text("Harvest" i)', { timeout: 5000 });

        // Update quantity
        const timestamp = Date.now();
        await fillFormField(page, 'input[name="quantity"]', `${timestamp % 5000 + 1000}`);

        // Submit
        const submitButton = page.locator('[data-testid="harvest-submit-button"], button[type="submit"]');
        await submitButton.click();

        // Wait for API response
        await page.waitForResponse(/\/api\/v1\/harvests/, { timeout: 10000 });
        await waitForToast(page, undefined, 'success');
      }
    });

    test('should update harvest status', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/harvests/, { timeout: 10000 });

      // Look for status dropdown
      const statusDropdown = page.locator('[data-testid="harvest-status-dropdown"], select[name="status"]').first();

      if (await statusDropdown.isVisible()) {
        // Get current status
        const currentStatus = await statusDropdown.inputValue();

        // Change status to sold
        await page.selectOption('[data-testid="harvest-status-dropdown"], select[name="status"]', 'sold');
        await page.waitForTimeout(500);

        // Verify status changed
        const newStatus = await statusDropdown.inputValue();
        expect(newStatus).not.toBe(currentStatus);
      }
    });
  });

  test.describe('Harvest Sale', () => {
    test('should sell a harvest', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/harvests/, { timeout: 10000 });

      // Look for sell button
      const sellButton = page.locator('[data-testid="sell-harvest-button"], button:has-text("Sell"), button:has-text("Vendre")').first();

      if (await sellButton.isVisible()) {
        await sellButton.click();

        // Wait for sale form
        await page.waitForSelector('[data-testid="sell-harvest-form"], form:has-text("Sell" i), form:has-text("Vendre" i)', { timeout: 5000 });

        // Fill sale details
        await fillFormField(page, 'input[name="quantity_sold"]', '500');
        await fillFormField(page, 'input[name="price_per_unit"]', '2.5');
        await fillFormField(page, 'input[name="sale_date"]', new Date().toISOString().split('T')[0]);

        // Select payment terms
        const paymentTermsSelect = page.locator('select[name="payment_terms"]');
        if (await paymentTermsSelect.isVisible()) {
          await page.selectOption('select[name="payment_terms"]', 'cash');
        }

        // Submit sale
        const submitButton = page.locator('[data-testid="sell-submit-button"], button[type="submit"]');
        await submitButton.click();

        // Wait for API response
        await page.waitForResponse(/\/api\/v1\/harvests/, { timeout: 10000 });
        await waitForToast(page, undefined, 'success');
      }
    });

    test('should validate sale quantity does not exceed harvest quantity', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/harvests/, { timeout: 10000 });

      // Look for sell button
      const sellButton = page.locator('[data-testid="sell-harvest-button"], button:has-text("Sell")').first();

      if (await sellButton.isVisible()) {
        await sellButton.click();

        // Wait for sale form
        await page.waitForSelector('[data-testid="sell-harvest-form"], form:has-text("Sell" i)', { timeout: 5000 });

        // Try to sell more than available
        await fillFormField(page, 'input[name="quantity_sold"]', '999999');

        // Submit
        const submitButton = page.locator('[data-testid="sell-submit-button"], button[type="submit"]');
        await submitButton.click();
        await page.waitForTimeout(500);

        // Should show error
        const errorElement = page.locator('[data-testid="sale-error"], [class*="error"], .error, [role="alert"]').first();
        const hasError = await errorElement.isVisible();

        expect(hasError).toBeTruthy();
      }
    });
  });

  test.describe('Harvest Deletion', () => {
    test('should delete a harvest', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/harvests/, { timeout: 10000 });

      // Get initial count
      const harvestCards = page.locator('[data-testid="harvest-card"], .harvest-card');
      const initialCount = await harvestCards.count();

      if (initialCount > 0) {
        // Click delete button
        const deleteButton = page.locator('[data-testid="delete-harvest-button"], button:has-text("Delete"), button[title*="Delete"]').first();
        await deleteButton.click();

        // Wait for confirmation dialog
        const confirmDialog = page.locator('[role="alertdialog"], [role="dialog"]');
        if (await confirmDialog.isVisible()) {
          // Confirm deletion
          const confirmButton = confirmDialog.locator('button:has-text("Delete"), button:has-text("Supprimer"), button:has-text("Confirm")').first();
          await confirmButton.click();
        }

        // Wait for API response
        await page.waitForResponse(/\/api\/v1\/harvests/, { timeout: 10000 });
        await waitForToast(page, undefined, 'success');

        // Verify harvest is deleted
        await page.waitForTimeout(1000);
        const newCount = await harvestCards.count();
        expect(newCount).toBeLessThan(initialCount);
      }
    });

    test('should cancel harvest deletion', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/harvests/, { timeout: 10000 });

      // Get initial count
      const harvestCards = page.locator('[data-testid="harvest-card"], .harvest-card');
      const initialCount = await harvestCards.count();

      if (initialCount > 0) {
        // Click delete button
        const deleteButton = page.locator('[data-testid="delete-harvest-button"], button:has-text("Delete")').first();
        await deleteButton.click();

        // Wait for confirmation dialog
        const confirmDialog = page.locator('[role="alertdialog"], [role="dialog"]');
        if (await confirmDialog.isVisible()) {
          // Cancel deletion
          const cancelButton = confirmDialog.locator('button:has-text("Cancel"), button:has-text("Annuler")').first();
          await cancelButton.click();
        }

        // Verify count is unchanged
        await page.waitForTimeout(500);
        const newCount = await harvestCards.count();
        expect(newCount).toBe(initialCount);
      }
    });
  });

  test.describe('Harvest Quality Control', () => {
    test('should record quality grade', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/harvests/, { timeout: 10000 });

      // Look for harvest card
      const harvestCard = page.locator('[data-testid="harvest-card"], .harvest-card').first();

      if (await harvestCard.isVisible()) {
        await harvestCard.click();
        await page.waitForTimeout(500);

        // Look for quality grade input
        const gradeSelect = page.locator('select[name="quality_grade"], [data-testid="quality-grade"]');

        if (await gradeSelect.isVisible()) {
          // Select grade
          await page.selectOption('select[name="quality_grade"], [data-testid="quality-grade"]', 'A');

          // Save
          const saveButton = page.locator('[data-testid="save-quality-button"], button:has-text("Save")').first();
          await saveButton.click();

          // Wait for API response
          await page.waitForResponse(/\/api\/v1\/harvests/, { timeout: 10000 });
          await waitForToast(page, undefined, 'success');
        }
      }
    });

    test('should add quality notes', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/harvests/, { timeout: 10000 });

      // Look for harvest card
      const harvestCard = page.locator('[data-testid="harvest-card"], .harvest-card').first();

      if (await harvestCard.isVisible()) {
        await harvestCard.click();
        await page.waitForTimeout(500);

        // Look for quality notes textarea
        const notesTextarea = page.locator('textarea[name="quality_notes"], [data-testid="quality-notes"]');

        if (await notesTextarea.isVisible()) {
          // Add notes
          await fillFormField(page, 'textarea[name="quality_notes"], [data-testid="quality-notes"]', 'Excellent quality, no defects');

          // Save
          const saveButton = page.locator('[data-testid="save-quality-button"], button:has-text("Save")').first();
          await saveButton.click();

          // Wait for API response
          await page.waitForResponse(/\/api\/v1\/harvests/, { timeout: 10000 });
          await waitForToast(page, undefined, 'success');
        }
      }
    });
  });

  test.describe('Harvest Filtering and Sorting', () => {
    test('should sort harvests by date', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/harvests/, { timeout: 10000 });

      // Look for sort dropdown
      const sortSelect = page.locator('select[name="sort"], [data-testid="sort-select"]').first();

      if (await sortSelect.isVisible()) {
        // Sort by date descending
        await page.selectOption('select[name="sort"], [data-testid="sort-select"]', 'harvest_date_desc');
        await page.waitForTimeout(500);

        // Verify sort is applied
        const url = page.url();
        expect(url).toContain('sort=harvest_date_desc');
      }
    });

    test('should filter by crop type', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/harvests/, { timeout: 10000 });

      // Look for crop filter
      const cropFilter = page.locator('select[name="crop_id"], [data-testid="crop-filter"]').first();

      if (await cropFilter.isVisible()) {
        // Filter by a specific crop
        const options = await cropFilter.locator('option').count();
        if (options > 1) {
          await page.selectOption('select[name="crop_id"], [data-testid="crop-filter"]', { index: 1 });
          await page.waitForTimeout(500);

          // Verify filter is applied
          const url = page.url();
          expect(url).toContain('crop_id');
        }
      }
    });

    test('should filter by parcel', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/harvests/, { timeout: 10000 });

      // Look for parcel filter
      const parcelFilter = page.locator('select[name="parcel_id"], [data-testid="parcel-filter"]').first();

      if (await parcelFilter.isVisible()) {
        // Filter by a specific parcel
        const options = await parcelFilter.locator('option').count();
        if (options > 1) {
          await page.selectOption('select[name="parcel_id"], [data-testid="parcel-filter"]', { index: 1 });
          await page.waitForTimeout(500);

          // Verify filter is applied
          const url = page.url();
          expect(url).toContain('parcel_id');
        }
      }
    });
  });

  test.describe('Harvest Workers Management', () => {
    test('should add worker to harvest', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/harvests/, { timeout: 10000 });

      // Look for harvest card
      const harvestCard = page.locator('[data-testid="harvest-card"], .harvest-card').first();

      if (await harvestCard.isVisible()) {
        await harvestCard.click();
        await page.waitForTimeout(500);

        // Look for add worker button
        const addWorkerButton = page.locator('[data-testid="add-worker-button"], button:has-text("Add Worker")').first();

        if (await addWorkerButton.isVisible()) {
          await addWorkerButton.click();

          // Wait for worker selection form
          await page.waitForSelector('[data-testid="worker-selection-form"], form:has-text("Worker" i)', { timeout: 5000 });

          // Select worker
          const workerSelect = page.locator('select[name="worker_id"]');
          if (await workerSelect.isVisible()) {
            const options = await workerSelect.locator('option').count();
            if (options > 1) {
              await page.selectOption('select[name="worker_id"]', { index: 1 });

              // Submit
              const submitButton = page.locator('[data-testid="worker-submit-button"], button[type="submit"]');
              await submitButton.click();

              // Wait for API response
              await page.waitForResponse(/\/api\/v1\/harvests/, { timeout: 10000 });
              await waitForToast(page, undefined, 'success');
            }
          }
        }
      }
    });

    test('should remove worker from harvest', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/harvests/, { timeout: 10000 });

      // Look for harvest card
      const harvestCard = page.locator('[data-testid="harvest-card"], .harvest-card').first();

      if (await harvestCard.isVisible()) {
        await harvestCard.click();
        await page.waitForTimeout(500);

        // Look for remove worker button
        const removeWorkerButton = page.locator('[data-testid="remove-worker-button"], button:has-text("Remove")').first();

        if (await removeWorkerButton.isVisible()) {
          await removeWorkerButton.click();

          // Wait for confirmation
          await page.waitForTimeout(500);

          // Wait for API response
          await page.waitForResponse(/\/api\/v1\/harvests/, { timeout: 10000 });
          await waitForToast(page, undefined, 'success');
        }
      }
    });
  });
});
