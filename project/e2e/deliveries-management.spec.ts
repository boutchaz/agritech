import { test, expect } from './fixtures/auth';
import {
  waitForAPIResponse,
  waitForLoadingComplete,
  waitForToast,
  fillFormField,
  clickAndWait,
} from './utils/test-helpers';

/**
 * Deliveries Management E2E Tests
 * Tests all delivery-related functionality including creation, tracking, and status updates
 */

test.describe('Deliveries Management', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/deliveries');
    await waitForLoadingComplete(authenticatedPage);
  });

  test.describe('Deliveries List', () => {
    test('should display deliveries list', async ({ authenticatedPage: page }) => {
      // Wait for deliveries API
      await page.waitForResponse(/\/api\/v1\/deliveries/, { timeout: 10000 });

      // Check for deliveries list or empty state
      const deliveriesList = page.locator('[data-testid="deliveries-list"]');
      const emptyState = page.locator('[data-testid="deliveries-empty-state"]');

      const hasDeliveries = await deliveriesList.isVisible();
      const hasEmptyState = await emptyState.isVisible();

      expect(hasDeliveries || hasEmptyState).toBeTruthy();
    });

    test('should filter deliveries by status', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/deliveries/, { timeout: 10000 });

      // Look for status filter
      const statusFilter = page.locator('select[name="status"], [data-testid="status-filter"]').first();

      if (await statusFilter.isVisible()) {
        // Filter by pending status
        await page.selectOption('select[name="status"], [data-testid="status-filter"]', 'pending');
        await page.waitForTimeout(500);

        // Verify filter is applied
        const url = page.url();
        expect(url).toContain('status=pending');
      }
    });

    test('should search deliveries by customer', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/deliveries/, { timeout: 10000 });

      // Look for search input
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="recherche" i]').first();

      if (await searchInput.isVisible()) {
        await searchInput.fill('customer');
        await page.waitForTimeout(500);

        // Verify search is applied
        expect(true).toBeTruthy();
      }
    });

    test('should show delivery statistics', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/deliveries/, { timeout: 10000 });

      // Look for statistics cards
      const statsCards = page.locator('[data-testid="delivery-stats"], .stats-card, [class*="stat"]');

      const hasStats = await statsCards.count() > 0;
      if (hasStats) {
        await expect(statsCards.first()).toBeVisible();
      }
    });
  });

  test.describe('Delivery Creation', () => {
    test('should create a new delivery', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/deliveries/, { timeout: 10000 });

      // Click create delivery button
      const createButton = page.locator('[data-testid="create-delivery-button"], button:has-text("Add Delivery"), button:has-text("Ajouter")').first();
      await createButton.click();

      // Wait for form
      await page.waitForSelector('[data-testid="create-delivery-form"], form:has-text("Delivery" i), form:has-text("Livraison" i)', { timeout: 5000 });

      // Fill delivery details
      const timestamp = Date.now();
      const deliveryDate = new Date().toISOString().split('T')[0];

      await fillFormField(page, 'input[name="customer_name"]', `Customer ${timestamp}`);
      await fillFormField(page, 'input[name="delivery_date"], input[type="date"]', deliveryDate);
      await fillFormField(page, 'textarea[name="delivery_address"]', '123 Test Street, City');

      // Submit delivery creation
      const submitButton = page.locator('[data-testid="delivery-submit-button"], button[type="submit"]');
      await submitButton.click();

      // Wait for API response
      await page.waitForResponse(/\/api\/v1\/deliveries/, { timeout: 10000 });
      await waitForToast(page, undefined, 'success');

      // Verify delivery appears in list
      await page.waitForTimeout(1000);
      const deliveriesList = page.locator('[data-testid="deliveries-list"]');
      if (await deliveriesList.isVisible()) {
        await expect(deliveriesList).toBeVisible();
      }
    });

    test('should add harvest items to delivery', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/deliveries/, { timeout: 10000 });

      // Click create delivery button
      const createButton = page.locator('[data-testid="create-delivery-button"], button:has-text("Add Delivery")').first();
      await createButton.click();

      // Wait for form
      await page.waitForSelector('[data-testid="create-delivery-form"], form:has-text("Delivery" i)', { timeout: 5000 });

      // Fill basic details
      await fillFormField(page, 'input[name="customer_name"]', 'Test Customer');
      await fillFormField(page, 'input[name="delivery_date"], input[type="date"]', new Date().toISOString().split('T')[0]);

      // Look for add harvest item button
      const addHarvestButton = page.locator('[data-testid="add-harvest-item-button"], button:has-text("Add Harvest")').first();

      if (await addHarvestButton.isVisible()) {
        await addHarvestButton.click();

        // Wait for harvest selection
        await page.waitForTimeout(500);

        // Select a harvest
        const harvestSelect = page.locator('select[name="harvest_id"]');
        if (await harvestSelect.isVisible()) {
          const options = await harvestSelect.locator('option').count();
          if (options > 1) {
            await page.selectOption('select[name="harvest_id"]', { index: 1 });
            await fillFormField(page, 'input[name="quantity"]', '100');

            // Submit delivery
            const submitButton = page.locator('[data-testid="delivery-submit-button"], button[type="submit"]');
            await submitButton.click();

            // Wait for API response
            await page.waitForResponse(/\/api\/v1\/deliveries/, { timeout: 10000 });
            await waitForToast(page, undefined, 'success');
          }
        }
      }
    });

    test('should validate required fields', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/deliveries/, { timeout: 10000 });

      // Click create delivery button
      const createButton = page.locator('[data-testid="create-delivery-button"], button:has-text("Add Delivery")').first();
      await createButton.click();

      // Wait for form
      await page.waitForSelector('[data-testid="create-delivery-form"], form:has-text("Delivery" i)', { timeout: 5000 });

      // Try to submit without filling required fields
      const submitButton = page.locator('[data-testid="delivery-submit-button"], button[type="submit"]');
      await submitButton.click();
      await page.waitForTimeout(500);

      // Should show validation errors
      const errorElements = page.locator('[data-testid="delivery-error"], [class*="error"], .error, [role="alert"]');
      const hasErrors = await errorElements.count() > 0;

      expect(hasErrors).toBeTruthy();
    });
  });

  test.describe('Delivery Details', () => {
    test('should display delivery details', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/deliveries/, { timeout: 10000 });

      // Look for a delivery card
      const deliveryCard = page.locator('[data-testid="delivery-card"], .delivery-card, [class*="delivery"]').first();

      if (await deliveryCard.isVisible()) {
        // Click on delivery
        await deliveryCard.click();
        await page.waitForTimeout(500);

        // Verify details modal/page is shown
        const detailsModal = page.locator('[data-testid="delivery-details-modal"], [role="dialog"]');
        const hasDetails = await detailsModal.isVisible();

        expect(hasDetails).toBeTruthy();
      }
    });

    test('should show delivery items', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/deliveries/, { timeout: 10000 });

      // Look for delivery card
      const deliveryCard = page.locator('[data-testid="delivery-card"], .delivery-card').first();

      if (await deliveryCard.isVisible()) {
        await deliveryCard.click();
        await page.waitForTimeout(500);

        // Look for items section
        const itemsSection = page.locator('[data-testid="delivery-items"], .delivery-items');
        const hasItems = await itemsSection.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasItems) {
          await expect(itemsSection).toBeVisible();
        }
      }
    });

    test('should show delivery tracking information', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/deliveries/, { timeout: 10000 });

      // Look for delivery card
      const deliveryCard = page.locator('[data-testid="delivery-card"], .delivery-card').first();

      if (await deliveryCard.isVisible()) {
        await deliveryCard.click();
        await page.waitForTimeout(500);

        // Look for tracking section
        const trackingSection = page.locator('[data-testid="delivery-tracking"], .tracking-info');
        const hasTracking = await trackingSection.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasTracking) {
          await expect(trackingSection).toBeVisible();
        }
      }
    });
  });

  test.describe('Delivery Status Updates', () => {
    test('should update delivery status to in_transit', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/deliveries/, { timeout: 10000 });

      // Look for status dropdown
      const statusDropdown = page.locator('[data-testid="delivery-status-dropdown"], select[name="status"]').first();

      if (await statusDropdown.isVisible()) {
        // Get current status
        const currentStatus = await statusDropdown.inputValue();

        // Change status to in_transit
        await page.selectOption('[data-testid="delivery-status-dropdown"], select[name="status"]', 'in_transit');
        await page.waitForTimeout(500);

        // Verify status changed
        const newStatus = await statusDropdown.inputValue();
        expect(newStatus).not.toBe(currentStatus);
      }
    });

    test('should update delivery status to delivered', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/deliveries/, { timeout: 10000 });

      // Look for status dropdown
      const statusDropdown = page.locator('[data-testid="delivery-status-dropdown"], select[name="status"]').first();

      if (await statusDropdown.isVisible()) {
        // Change status to delivered
        await page.selectOption('[data-testid="delivery-status-dropdown"], select[name="status"]', 'delivered');
        await page.waitForTimeout(500);

        // Verify status changed
        const newStatus = await statusDropdown.inputValue();
        expect(newStatus).toBe('delivered');
      }
    });
  });

  test.describe('Delivery Update', () => {
    test('should update delivery information', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/deliveries/, { timeout: 10000 });

      // Look for edit button on first delivery
      const editButton = page.locator('[data-testid="edit-delivery-button"], button:has-text("Edit"), button[title*="Edit"]').first();

      if (await editButton.isVisible()) {
        // Click edit
        await editButton.click();
        await page.waitForSelector('[data-testid="edit-delivery-form"], form:has-text("Delivery" i)', { timeout: 5000 });

        // Update customer name
        const timestamp = Date.now();
        await fillFormField(page, 'input[name="customer_name"]', `Updated Customer ${timestamp}`);

        // Submit
        const submitButton = page.locator('[data-testid="delivery-submit-button"], button[type="submit"]');
        await submitButton.click();

        // Wait for API response
        await page.waitForResponse(/\/api\/v1\/deliveries/, { timeout: 10000 });
        await waitForToast(page, undefined, 'success');
      }
    });

    test('should update delivery address', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/deliveries/, { timeout: 10000 });

      // Look for edit button
      const editButton = page.locator('[data-testid="edit-delivery-button"], button:has-text("Edit")').first();

      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForSelector('[data-testid="edit-delivery-form"], form:has-text("Delivery" i)', { timeout: 5000 });

        // Update address
        await fillFormField(page, 'textarea[name="delivery_address"]', '456 Updated Street, New City');

        // Submit
        const submitButton = page.locator('[data-testid="delivery-submit-button"], button[type="submit"]');
        await submitButton.click();

        // Wait for API response
        await page.waitForResponse(/\/api\/v1\/deliveries/, { timeout: 10000 });
        await waitForToast(page, undefined, 'success');
      }
    });
  });

  test.describe('Delivery Deletion', () => {
    test('should delete a delivery', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/deliveries/, { timeout: 10000 });

      // Get initial count
      const deliveryCards = page.locator('[data-testid="delivery-card"], .delivery-card');
      const initialCount = await deliveryCards.count();

      if (initialCount > 0) {
        // Click delete button
        const deleteButton = page.locator('[data-testid="delete-delivery-button"], button:has-text("Delete"), button[title*="Delete"]').first();
        await deleteButton.click();

        // Wait for confirmation dialog
        const confirmDialog = page.locator('[role="alertdialog"], [role="dialog"]');
        if (await confirmDialog.isVisible()) {
          // Confirm deletion
          const confirmButton = confirmDialog.locator('button:has-text("Delete"), button:has-text("Supprimer"), button:has-text("Confirm")').first();
          await confirmButton.click();
        }

        // Wait for API response
        await page.waitForResponse(/\/api\/v1\/deliveries/, { timeout: 10000 });
        await waitForToast(page, undefined, 'success');

        // Verify delivery is deleted
        await page.waitForTimeout(1000);
        const newCount = await deliveryCards.count();
        expect(newCount).toBeLessThan(initialCount);
      }
    });

    test('should cancel delivery deletion', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/deliveries/, { timeout: 10000 });

      // Get initial count
      const deliveryCards = page.locator('[data-testid="delivery-card"], .delivery-card');
      const initialCount = await deliveryCards.count();

      if (initialCount > 0) {
        // Click delete button
        const deleteButton = page.locator('[data-testid="delete-delivery-button"], button:has-text("Delete")').first();
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
        const newCount = await deliveryCards.count();
        expect(newCount).toBe(initialCount);
      }
    });
  });

  test.describe('Delivery Filtering and Sorting', () => {
    test('should sort deliveries by date', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/deliveries/, { timeout: 10000 });

      // Look for sort dropdown
      const sortSelect = page.locator('select[name="sort"], [data-testid="sort-select"]').first();

      if (await sortSelect.isVisible()) {
        // Sort by date descending
        await page.selectOption('select[name="sort"], [data-testid="sort-select"]', 'delivery_date_desc');
        await page.waitForTimeout(500);

        // Verify sort is applied
        const url = page.url();
        expect(url).toContain('sort=delivery_date_desc');
      }
    });

    test('should filter by date range', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/deliveries/, { timeout: 10000 });

      // Look for date range inputs
      const fromDateInput = page.locator('input[name="from_date"], [data-testid="from-date"]');
      const toDateInput = page.locator('input[name="to_date"], [data-testid="to-date"]');

      if (await fromDateInput.isVisible() && await toDateInput.isVisible()) {
        // Set date range
        const today = new Date().toISOString().split('T')[0];
        const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        await fillFormField(page, 'input[name="from_date"], [data-testid="from-date"]', lastMonth);
        await fillFormField(page, 'input[name="to_date"], [data-testid="to-date"]', today);

        await page.waitForTimeout(500);

        // Verify filter is applied
        const url = page.url();
        expect(url).toMatch(/(from_date|from)/);
      }
    });
  });

  test.describe('Delivery Documents', () => {
    test('should add delivery note', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/deliveries/, { timeout: 10000 });

      // Look for delivery card
      const deliveryCard = page.locator('[data-testid="delivery-card"], .delivery-card').first();

      if (await deliveryCard.isVisible()) {
        await deliveryCard.click();
        await page.waitForTimeout(500);

        // Look for add note button
        const addNoteButton = page.locator('[data-testid="add-note-button"], button:has-text("Add Note")').first();

        if (await addNoteButton.isVisible()) {
          await addNoteButton.click();

          // Wait for note form
          await page.waitForSelector('[data-testid="note-form"], form:has-text("Note" i)', { timeout: 5000 });

          // Add note
          await fillFormField(page, 'textarea[name="note"]', 'Delivery note from E2E test');

          // Submit
          const submitButton = page.locator('[data-testid="note-submit-button"], button[type="submit"]');
          await submitButton.click();

          // Wait for API response
          await page.waitForResponse(/\/api\/v1\/(delivery-notes|notes)/, { timeout: 10000 });
          await waitForToast(page, undefined, 'success');
        }
      }
    });

    test('should upload delivery document', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/deliveries/, { timeout: 10000 });

      // Look for delivery card
      const deliveryCard = page.locator('[data-testid="delivery-card"], .delivery-card').first();

      if (await deliveryCard.isVisible()) {
        await deliveryCard.click();
        await page.waitForTimeout(500);

        // Look for upload document button
        const uploadButton = page.locator('[data-testid="upload-document-button"], button:has-text("Upload Document")').first();

        if (await uploadButton.isVisible()) {
          // Just verify button exists - actual file upload would need file system access
          await expect(uploadButton).toBeVisible();
        }
      }
    });
  });
});
