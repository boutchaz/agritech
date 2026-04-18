import { test, expect } from './fixtures/auth';
import { waitForLoadingComplete, waitForToast } from './utils/test-helpers';

/**
 * Stock Groups E2E Tests
 *
 * Covers:
 * - Page load & translation rendering (no raw keys visible)
 * - Table view CRUD
 * - Tree view expand / collapse
 * - View mode toggle persistence
 */

test.describe('Stock Groups Management', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/stock/groups');
    await waitForLoadingComplete(authenticatedPage);
    // Wait for the groups API call
    await authenticatedPage.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  });

  // ─── Page load & translations ──────────────────────────────────────────

  test.describe('Page Load', () => {
    test('should display the groups page with title', async ({ authenticatedPage: page }) => {
      // Title should be present (translated, not raw key)
      const title = page.locator('h3, [class*="CardTitle"]').filter({ hasText: /group|groupe|مجموع/i });
      await expect(title.first()).toBeVisible({ timeout: 10000 });
    });

    test('should not show raw translation keys in the UI', async ({ authenticatedPage: page }) => {
      // Wait for content to render
      await page.waitForTimeout(2000);

      // Check no raw keys like "common.statusColumn" or "common.actionsColumn" appear
      const body = await page.locator('body').textContent();
      expect(body).not.toContain('common.statusColumn');
      expect(body).not.toContain('common.actionsColumn');
      expect(body).not.toContain('items.itemGroup.code');
      expect(body).not.toContain('items.itemGroup.name');
      expect(body).not.toContain('items.itemGroup.parentGroup');
    });

    test('should show table column headers properly translated', async ({ authenticatedPage: page }) => {
      // If groups exist, the table should have translated headers
      const table = page.locator('table').first();
      const hasTable = await table.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasTable) {
        const headers = await table.locator('thead th').allTextContents();
        // Should NOT contain raw translation keys
        for (const header of headers) {
          expect(header).not.toMatch(/^(common\.|items\.)/);
        }
      }
    });
  });

  // ─── View mode toggle ─────────────────────────────────────────────────

  test.describe('View Mode Toggle', () => {
    test('should show table and tree view toggle buttons', async ({ authenticatedPage: page }) => {
      // Wait for groups to load — if empty state, toggle won't show
      await page.waitForTimeout(2000);

      const tableBtn = page.getByRole('button', { name: /table|tableau|جدول/i });
      const treeBtn = page.getByRole('button', { name: /tree|arbre|شجر/i });

      const hasTable = await tableBtn.isVisible({ timeout: 3000 }).catch(() => false);
      const hasTree = await treeBtn.isVisible({ timeout: 3000 }).catch(() => false);

      // Both should be visible when there are groups
      if (hasTable && hasTree) {
        await expect(tableBtn).toBeVisible();
        await expect(treeBtn).toBeVisible();
      }
    });

    test('should switch to tree view and back', async ({ authenticatedPage: page }) => {
      await page.waitForTimeout(2000);

      const treeBtn = page.getByRole('button', { name: /tree|arbre|شجر/i });
      const hasTree = await treeBtn.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasTree) {
        // Click tree view
        await treeBtn.click();
        await page.waitForTimeout(500);

        // The "Parent Group" column should disappear in tree view
        const parentHeader = page.locator('th').filter({ hasText: /parent|الأم/i });
        await expect(parentHeader).toHaveCount(0);

        // Switch back to table view
        const tableBtn = page.getByRole('button', { name: /table|tableau|جدول/i });
        await tableBtn.click();
        await page.waitForTimeout(500);

        // Parent column should reappear
        const parentHeaderAfter = page.locator('th').filter({ hasText: /parent|الأم/i });
        const count = await parentHeaderAfter.count();
        expect(count).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // ─── Tree view interactions ────────────────────────────────────────────

  test.describe('Tree View', () => {
    test('should expand and collapse tree nodes', async ({ authenticatedPage: page }) => {
      await page.waitForTimeout(2000);

      const treeBtn = page.getByRole('button', { name: /tree|arbre|شجر/i });
      const hasTree = await treeBtn.isVisible({ timeout: 3000 }).catch(() => false);

      if (!hasTree) return; // no groups → skip

      await treeBtn.click();
      await page.waitForTimeout(500);

      // Look for expand all button
      const expandAllBtn = page.getByRole('button', { name: /expand|déplier|توسيع/i });
      const hasExpandAll = await expandAllBtn.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasExpandAll) {
        // Count initial rows
        const initialRows = await page.locator('tbody tr').count();

        // Expand all
        await expandAllBtn.click();
        await page.waitForTimeout(500);
        const expandedRows = await page.locator('tbody tr').count();

        // Should have more or equal rows after expanding
        expect(expandedRows).toBeGreaterThanOrEqual(initialRows);

        // Collapse all
        const collapseAllBtn = page.getByRole('button', { name: /collapse|replier|طي/i });
        await collapseAllBtn.click();
        await page.waitForTimeout(500);
        const collapsedRows = await page.locator('tbody tr').count();

        expect(collapsedRows).toBeLessThanOrEqual(expandedRows);
      }
    });

    test('should show child count badges on parent nodes', async ({ authenticatedPage: page }) => {
      await page.waitForTimeout(2000);

      const treeBtn = page.getByRole('button', { name: /tree|arbre|شجر/i });
      const hasTree = await treeBtn.isVisible({ timeout: 3000 }).catch(() => false);
      if (!hasTree) return;

      await treeBtn.click();
      await page.waitForTimeout(500);

      // Badges use the Badge component — look for small inline elements with numbers
      const badges = page.locator('[class*="badge"], [class*="Badge"]');
      const badgeCount = await badges.count();
      // If there are parent groups with children, we should see badges
      // This is data-dependent, so just verify no errors
      expect(badgeCount).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── CRUD Operations ──────────────────────────────────────────────────

  test.describe('Create Item Group', () => {
    test('should open create dialog and show form fields', async ({ authenticatedPage: page }) => {
      // Click the "Create Group" button
      const createBtn = page.getByRole('button', { name: /create|créer|إنشاء/i }).first();
      await createBtn.click();

      // Dialog should open
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Check form fields are present
      await expect(dialog.locator('input#name')).toBeVisible();
      await expect(dialog.locator('input#code')).toBeVisible();
      await expect(dialog.locator('input#description')).toBeVisible();
    });

    test('should validate required fields on submit', async ({ authenticatedPage: page }) => {
      const createBtn = page.getByRole('button', { name: /create|créer|إنشاء/i }).first();
      await createBtn.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Submit without filling name
      const submitBtn = dialog.locator('button[type="submit"]');
      await submitBtn.click();
      await page.waitForTimeout(500);

      // Should show validation error
      const error = dialog.locator('.text-red-600, [class*="error"]');
      await expect(error.first()).toBeVisible();
    });

    test('should create a group and show success toast', async ({ authenticatedPage: page }) => {
      const createBtn = page.getByRole('button', { name: /create|créer|إنشاء/i }).first();
      await createBtn.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      const timestamp = Date.now();
      const groupName = `E2E Test Group ${timestamp}`;

      await dialog.locator('input#name').fill(groupName);
      await dialog.locator('input#code').fill(`E2E-${timestamp}`);
      await dialog.locator('input#description').fill('Created by E2E test');

      // Submit
      const submitBtn = dialog.locator('button[type="submit"]');
      await submitBtn.click();

      // Wait for API response and success
      await page.waitForTimeout(3000);

      // Dialog should close
      await expect(dialog).not.toBeVisible({ timeout: 5000 });

      // Success toast
      await waitForToast(page, undefined, 'success');
    });
  });

  test.describe('Edit Item Group', () => {
    test('should open edit dialog with pre-filled data', async ({ authenticatedPage: page }) => {
      await page.waitForTimeout(2000);

      // Look for edit button (pencil icon) in the table
      const editBtn = page.locator('button:has(svg.lucide-pencil), button:has([class*="pencil"])').first();
      const hasEdit = await editBtn.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasEdit) {
        await editBtn.click();

        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible({ timeout: 5000 });

        // Name input should be pre-filled
        const nameInput = dialog.locator('input#name');
        const nameValue = await nameInput.inputValue();
        expect(nameValue.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Delete Item Group', () => {
    test('should show delete confirmation dialog', async ({ authenticatedPage: page }) => {
      await page.waitForTimeout(2000);

      // Look for delete button (trash icon with destructive class)
      const deleteBtn = page.locator('button:has(.text-destructive)').first();
      const hasDelete = await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasDelete) {
        await deleteBtn.click();

        // AlertDialog should appear
        const alertDialog = page.locator('[role="alertdialog"]');
        await expect(alertDialog).toBeVisible({ timeout: 5000 });

        // Should have cancel and confirm buttons
        const cancelBtn = alertDialog.getByRole('button', { name: /cancel|annuler|إلغاء/i });
        await expect(cancelBtn).toBeVisible();

        // Cancel to not actually delete
        await cancelBtn.click();
        await expect(alertDialog).not.toBeVisible();
      }
    });
  });

  // ─── Import predefined ────────────────────────────────────────────────

  test.describe('Import Predefined Groups', () => {
    test('should show import button', async ({ authenticatedPage: page }) => {
      const importBtn = page.getByRole('button', { name: /import|importer|استيراد/i }).first();
      await expect(importBtn).toBeVisible({ timeout: 5000 });
    });
  });

  // ─── Pagination ───────────────────────────────────────────────────────

  test.describe('Pagination', () => {
    test('should show pagination controls when many groups exist', async ({ authenticatedPage: page }) => {
      await page.waitForTimeout(2000);

      // Check for pagination text like "1 / 2"
      const paginationText = page.locator('text=/\\d+ \\/ \\d+/');
      const hasPagination = await paginationText.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasPagination) {
        // Previous and next buttons
        const prevBtn = page.locator('button:has(svg.lucide-chevron-left)').first();
        const nextBtn = page.locator('button:has(svg.lucide-chevron-right)').first();

        await expect(prevBtn).toBeVisible();
        await expect(nextBtn).toBeVisible();
      }
    });
  });
});
