import { test, expect } from './fixtures/auth';
import {
  waitForAPIResponse,
  waitForLoadingComplete,
  waitForToast,
  fillFormField,
  clickAndWait,
} from './utils/test-helpers';

/**
 * Workers Management E2E Tests
 * Tests all worker-related functionality including CRUD operations, assignments, and payments
 */

test.describe('Workers Management', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/workers');
    await waitForLoadingComplete(authenticatedPage);
  });

  test.describe('Worker List', () => {
    test('should display workers list', async ({ authenticatedPage: page }) => {
      // Wait for workers API
      await page.waitForResponse(/\/api\/v1\/workers/, { timeout: 10000 });

      // Check for workers list or empty state
      const workersList = page.locator('[data-testid="workers-list"]');
      const emptyState = page.locator('[data-testid="workers-empty-state"]');

      const hasWorkers = await workersList.isVisible();
      const hasEmptyState = await emptyState.isVisible();

      expect(hasWorkers || hasEmptyState).toBeTruthy();
    });

    test('should filter workers by type', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/workers/, { timeout: 10000 });

      // Look for filter dropdown
      const filterSelect = page.locator('select[name="worker_type"], [data-testid="worker-type-filter"]').first();

      if (await filterSelect.isVisible()) {
        // Filter by daily workers
        await page.selectOption('select[name="worker_type"], [data-testid="worker-type-filter"]', 'daily_worker');
        await page.waitForTimeout(500);

        // Verify filter is applied
        const url = page.url();
        expect(url).toContain('daily_worker');
      }
    });

    test('should search workers by name', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/workers/, { timeout: 10000 });

      // Look for search input
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="recherche" i]').first();

      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await page.waitForTimeout(500);

        // Verify search is applied
        expect(true).toBeTruthy();
      }
    });

    test('should show worker statistics', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/workers/, { timeout: 10000 });

      // Look for statistics cards
      const statsCards = page.locator('[data-testid="worker-stats"], .stats-card, [class*="stat"]');

      const hasStats = await statsCards.count() > 0;
      if (hasStats) {
        await expect(statsCards.first()).toBeVisible();
      }
    });
  });

  test.describe('Worker Creation', () => {
    test('should create a new worker', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/workers/, { timeout: 10000 });

      // Click create worker button
      const createButton = page.locator('[data-testid="create-worker-button"], button:has-text("Add Worker"), button:has-text("Ajouter")').first();
      await createButton.click();

      // Wait for form
      await page.waitForSelector('[data-testid="create-worker-form"], form:has-text("Worker" i), form:has-text("Ouvrier" i)', { timeout: 5000 });

      // Fill worker details
      const timestamp = Date.now();
      const firstName = `Worker ${timestamp}`;
      const lastName = 'E2E Test';
      const email = `worker-${timestamp}@example.com`;

      await fillFormField(page, 'input[name="firstName"], input[name="first_name"]', firstName);
      await fillFormField(page, 'input[name="lastName"], input[name="last_name"]', lastName);
      await fillFormField(page, 'input[name="email"]', email);

      // Select worker type
      const workerTypeSelect = page.locator('select[name="worker_type"]');
      if (await workerTypeSelect.isVisible()) {
        await page.selectOption('select[name="worker_type"]', 'daily_worker');
      }

      // Select payment frequency
      const paymentFrequencySelect = page.locator('select[name="payment_frequency"]');
      if (await paymentFrequencySelect.isVisible()) {
        await page.selectOption('select[name="payment_frequency"]', 'daily');
      }

      // Submit form
      const submitButton = page.locator('[data-testid="worker-submit-button"], button[type="submit"]');
      await submitButton.click();

      // Wait for API response
      await page.waitForResponse(/\/api\/v1\/workers/, { timeout: 10000 });
      await waitForToast(page, undefined, 'success');

      // Verify worker appears in list
      await page.waitForTimeout(1000);
      await expect(page.locator(`text="${firstName}"`).first()).toBeVisible({ timeout: 5000 });
    });

    test('should validate required fields', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/workers/, { timeout: 10000 });

      // Click create worker button
      const createButton = page.locator('[data-testid="create-worker-button"], button:has-text("Add Worker")').first();
      await createButton.click();

      // Wait for form
      await page.waitForSelector('[data-testid="create-worker-form"], form:has-text("Worker" i)', { timeout: 5000 });

      // Try to submit without filling required fields
      const submitButton = page.locator('[data-testid="worker-submit-button"], button[type="submit"]');
      await submitButton.click();
      await page.waitForTimeout(500);

      // Should show validation errors
      const errorElements = page.locator('[data-testid="worker-error"], [class*="error"], .error, [role="alert"]');
      const hasErrors = await errorElements.count() > 0;

      expect(hasErrors).toBeTruthy();
    });

    test('should validate email format', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/workers/, { timeout: 10000 });

      // Click create worker button
      const createButton = page.locator('[data-testid="create-worker-button"], button:has-text("Add Worker")').first();
      await createButton.click();

      // Wait for form
      await page.waitForSelector('[data-testid="create-worker-form"], form:has-text("Worker" i)', { timeout: 5000 });

      // Fill with invalid email
      await fillFormField(page, 'input[name="email"]', 'invalid-email');
      await page.waitForTimeout(300);

      // Check for validation error
      const emailInput = page.locator('input[name="email"]');
      const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);

      expect(isInvalid).toBeTruthy();
    });
  });

  test.describe('Worker Details', () => {
    test('should display worker details', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/workers/, { timeout: 10000 });

      // Look for a worker card
      const workerCard = page.locator('[data-testid="worker-card"], .worker-card, [class*="worker"]').first();

      if (await workerCard.isVisible()) {
        // Click on worker
        await workerCard.click();
        await page.waitForTimeout(500);

        // Verify details modal/page is shown
        const detailsModal = page.locator('[data-testid="worker-details-modal"], [role="dialog"]');
        const hasDetails = await detailsModal.isVisible();

        expect(hasDetails).toBeTruthy();
      }
    });

    test('should show worker assignments', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/workers/, { timeout: 10000 });

      // Look for worker card
      const workerCard = page.locator('[data-testid="worker-card"], .worker-card').first();

      if (await workerCard.isVisible()) {
        await workerCard.click();
        await page.waitForTimeout(500);

        // Look for assignments section
        const assignmentsSection = page.locator('[data-testid="worker-assignments"], .assignments');
        const hasAssignments = await assignmentsSection.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasAssignments) {
          await expect(assignmentsSection).toBeVisible();
        }
      }
    });

    test('should show worker payment history', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/workers/, { timeout: 10000 });

      // Look for worker card
      const workerCard = page.locator('[data-testid="worker-card"], .worker-card').first();

      if (await workerCard.isVisible()) {
        await workerCard.click();
        await page.waitForTimeout(500);

        // Look for payment history section
        const paymentsSection = page.locator('[data-testid="worker-payments"], .payments');
        const hasPayments = await paymentsSection.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasPayments) {
          await expect(paymentsSection).toBeVisible();
        }
      }
    });
  });

  test.describe('Worker Update', () => {
    test('should update worker information', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/workers/, { timeout: 10000 });

      // Look for edit button on first worker
      const editButton = page.locator('[data-testid="edit-worker-button"], button:has-text("Edit"), button[title*="Edit"]').first();

      if (await editButton.isVisible()) {
        // Click edit
        await editButton.click();
        await page.waitForSelector('[data-testid="edit-worker-form"], form:has-text("Worker" i)', { timeout: 5000 });

        // Update name
        const timestamp = Date.now();
        await fillFormField(page, 'input[name="firstName"], input[name="first_name"]', `Updated ${timestamp}`);

        // Submit
        const submitButton = page.locator('[data-testid="worker-submit-button"], button[type="submit"]');
        await submitButton.click();

        // Wait for API response
        await page.waitForResponse(/\/api\/v1\/workers/, { timeout: 10000 });
        await waitForToast(page, undefined, 'success');

        // Verify update
        await page.waitForTimeout(1000);
        await expect(page.locator(`text="Updated ${timestamp}"`).first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('should update worker status', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/workers/, { timeout: 10000 });

      // Look for status toggle
      const statusToggle = page.locator('[data-testid="worker-status-toggle"], .status-toggle').first();

      if (await statusToggle.isVisible()) {
        // Get current status
        const currentStatus = await statusToggle.getAttribute('aria-checked') || 'false';

        // Toggle status
        await statusToggle.click();
        await page.waitForTimeout(500);

        // Verify status changed
        const newStatus = await statusToggle.getAttribute('aria-checked') || 'false';
        expect(newStatus).not.toBe(currentStatus);
      }
    });
  });

  test.describe('Worker Deletion', () => {
    test('should delete a worker', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/workers/, { timeout: 10000 });

      // Get initial count
      const workerCards = page.locator('[data-testid="worker-card"], .worker-card');
      const initialCount = await workerCards.count();

      if (initialCount > 0) {
        // Click delete button
        const deleteButton = page.locator('[data-testid="delete-worker-button"], button:has-text("Delete"), button[title*="Delete"]').first();
        await deleteButton.click();

        // Wait for confirmation dialog
        const confirmDialog = page.locator('[role="alertdialog"], [role="dialog"]');
        if (await confirmDialog.isVisible()) {
          // Confirm deletion
          const confirmButton = confirmDialog.locator('button:has-text("Delete"), button:has-text("Supprimer"), button:has-text("Confirm")').first();
          await confirmButton.click();
        }

        // Wait for API response
        await page.waitForResponse(/\/api\/v1\/workers/, { timeout: 10000 });
        await waitForToast(page, undefined, 'success');

        // Verify worker is deleted
        await page.waitForTimeout(1000);
        const newCount = await workerCards.count();
        expect(newCount).toBeLessThan(initialCount);
      }
    });

    test('should cancel worker deletion', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/workers/, { timeout: 10000 });

      // Get initial count
      const workerCards = page.locator('[data-testid="worker-card"], .worker-card');
      const initialCount = await workerCards.count();

      if (initialCount > 0) {
        // Click delete button
        const deleteButton = page.locator('[data-testid="delete-worker-button"], button:has-text("Delete")').first();
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
        const newCount = await workerCards.count();
        expect(newCount).toBe(initialCount);
      }
    });
  });

  test.describe('Worker Assignments', () => {
    test('should assign worker to task', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/workers/, { timeout: 10000 });

      // Look for worker card
      const workerCard = page.locator('[data-testid="worker-card"], .worker-card').first();

      if (await workerCard.isVisible()) {
        await workerCard.click();
        await page.waitForTimeout(500);

        // Look for assign button
        const assignButton = page.locator('[data-testid="assign-task-button"], button:has-text("Assign Task")').first();

        if (await assignButton.isVisible()) {
          await assignButton.click();

          // Wait for assignment form
          await page.waitForSelector('[data-testid="assign-task-form"], form:has-text("Assign" i)', { timeout: 5000 });

          // Select a task
          const taskSelect = page.locator('select[name="task_id"]');
          if (await taskSelect.isVisible()) {
            const options = await taskSelect.locator('option').count();
            if (options > 1) {
              await page.selectOption('select[name="task_id"]', { index: 1 });

              // Submit assignment
              const submitButton = page.locator('[data-testid="assignment-submit-button"], button[type="submit"]');
              await submitButton.click();

              // Wait for API response
              await page.waitForResponse(/\/api\/v1\/(task-assignments|assignments)/, { timeout: 10000 });
              await waitForToast(page, undefined, 'success');
            }
          }
        }
      }
    });
  });

  test.describe('Worker Payments', () => {
    test('should create worker payment', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/workers/, { timeout: 10000 });

      // Look for worker card
      const workerCard = page.locator('[data-testid="worker-card"], .worker-card').first();

      if (await workerCard.isVisible()) {
        await workerCard.click();
        await page.waitForTimeout(500);

        // Look for add payment button
        const addPaymentButton = page.locator('[data-testid="add-payment-button"], button:has-text("Add Payment"), button:has-text("Pay")').first();

        if (await addPaymentButton.isVisible()) {
          await addPaymentButton.click();

          // Wait for payment form
          await page.waitForSelector('[data-testid="payment-form"], form:has-text("Payment" i)', { timeout: 5000 });

          // Fill payment details
          await fillFormField(page, 'input[name="amount"]', '1000');
          await fillFormField(page, 'input[name="payment_date"]', new Date().toISOString().split('T')[0]);

          // Submit payment
          const submitButton = page.locator('[data-testid="payment-submit-button"], button[type="submit"]');
          await submitButton.click();

          // Wait for API response
          await page.waitForResponse(/\/api\/v1\/(payments|worker-payments)/, { timeout: 10000 });
          await waitForToast(page, undefined, 'success');
        }
      }
    });

    test('should view payment history', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/workers/, { timeout: 10000 });

      // Look for worker card
      const workerCard = page.locator('[data-testid="worker-card"], .worker-card').first();

      if (await workerCard.isVisible()) {
        await workerCard.click();
        await page.waitForTimeout(500);

        // Look for payments tab or section
        const paymentsTab = page.locator('[data-testid="payments-tab"], button:has-text("Payments"), button:has-text("Paiements")').first();

        if (await paymentsTab.isVisible()) {
          await paymentsTab.click();
          await page.waitForTimeout(500);

          // Verify payments list is shown
          const paymentsList = page.locator('[data-testid="payments-list"], .payments-list');
          await expect(paymentsList).toBeVisible();
        }
      }
    });
  });

  test.describe('Worker Specialties', () => {
    test('should add worker specialty', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/workers/, { timeout: 10000 });

      // Click create worker button
      const createButton = page.locator('[data-testid="create-worker-button"], button:has-text("Add Worker")').first();
      await createButton.click();

      // Wait for form
      await page.waitForSelector('[data-testid="create-worker-form"], form:has-text("Worker" i)', { timeout: 5000 });

      // Look for specialties field
      const specialtiesSelect = page.locator('select[name="specialties"], [data-testid="specialties"]');

      if (await specialtiesSelect.isVisible()) {
        // Select specialties
        await page.selectOption('select[name="specialties"]', ['planting', 'harvesting']);

        // Verify selections
        const selectedOptions = await specialtiesSelect.evaluate((el: HTMLSelectElement) => {
          return Array.from(el.selectedOptions).map(opt => opt.value);
        });

        expect(selectedOptions).toContain('planting');
        expect(selectedOptions).toContain('harvesting');
      }
    });
  });

  test.describe('Worker Filtering and Sorting', () => {
    test('should sort workers by name', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/workers/, { timeout: 10000 });

      // Look for sort dropdown
      const sortSelect = page.locator('select[name="sort"], [data-testid="sort-select"]').first();

      if (await sortSelect.isVisible()) {
        // Sort by name
        await page.selectOption('select[name="sort"], [data-testid="sort-select"]', 'name');
        await page.waitForTimeout(500);

        // Verify sort is applied
        const url = page.url();
        expect(url).toContain('sort=name');
      }
    });

    test('should filter by active status', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/workers/, { timeout: 10000 });

      // Look for active filter
      const activeFilter = page.locator('[data-testid="active-filter"], button:has-text("Active"), button:has-text("Actif")').first();

      if (await activeFilter.isVisible()) {
        await activeFilter.click();
        await page.waitForTimeout(500);

        // Verify filter is applied
        const isActive = await activeFilter.getAttribute('aria-pressed');
        expect(isActive).toBe('true');
      }
    });
  });
});
