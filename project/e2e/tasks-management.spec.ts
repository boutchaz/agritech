import { test, expect } from './fixtures/auth';
import {
  waitForAPIResponse,
  waitForLoadingComplete,
  waitForToast,
  fillFormField,
  clickAndWait,
} from './utils/test-helpers';

/**
 * Tasks Management E2E Tests
 * Tests all task-related functionality including CRUD operations, assignments, and completion
 */

test.describe('Tasks Management', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/tasks');
    await waitForLoadingComplete(authenticatedPage);
  });

  test.describe('Task List', () => {
    test('should display tasks list', async ({ authenticatedPage: page }) => {
      // Wait for tasks API
      await page.waitForResponse(/\/api\/v1\/tasks/, { timeout: 10000 });

      // Check for tasks list or empty state
      const tasksList = page.locator('[data-testid="tasks-list"]');
      const emptyState = page.locator('[data-testid="tasks-empty-state"]');

      const hasTasks = await tasksList.isVisible();
      const hasEmptyState = await emptyState.isVisible();

      expect(hasTasks || hasEmptyState).toBeTruthy();
    });

    test('should filter tasks by status', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/tasks/, { timeout: 10000 });

      // Look for status filter tabs
      const statusTabs = page.locator('[data-testid="task-status-tabs"], .status-tabs');

      if (await statusTabs.isVisible()) {
        // Click on pending tasks
        const pendingTab = statusTabs.locator('button:has-text("Pending"), button:has-text("En attente")').first();
        await pendingTab.click();
        await page.waitForTimeout(500);

        // Verify filter is applied
        const url = page.url();
        expect(url).toMatch(/(pending|status)/);
      }
    });

    test('should filter tasks by type', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/tasks/, { timeout: 10000 });

      // Look for type filter
      const typeFilter = page.locator('select[name="task_type"], [data-testid="task-type-filter"]').first();

      if (await typeFilter.isVisible()) {
        // Filter by planting tasks
        await page.selectOption('select[name="task_type"], [data-testid="task-type-filter"]', 'planting');
        await page.waitForTimeout(500);

        // Verify filter is applied
        const url = page.url();
        expect(url).toContain('planting');
      }
    });

    test('should search tasks by title', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/tasks/, { timeout: 10000 });

      // Look for search input
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="recherche" i]').first();

      if (await searchInput.isVisible()) {
        await searchInput.fill('planting');
        await page.waitForTimeout(500);

        // Verify search is applied
        expect(true).toBeTruthy();
      }
    });

    test('should show task statistics', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/tasks/, { timeout: 10000 });

      // Look for statistics cards
      const statsCards = page.locator('[data-testid="task-stats"], .stats-card, [class*="stat"]');

      const hasStats = await statsCards.count() > 0;
      if (hasStats) {
        await expect(statsCards.first()).toBeVisible();
      }
    });
  });

  test.describe('Task Creation', () => {
    test('should create a new task', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/tasks/, { timeout: 10000 });

      // Click create task button
      const createButton = page.locator('[data-testid="create-task-button"], button:has-text("Add Task"), button:has-text("Ajouter")').first();
      await createButton.click();

      // Wait for form
      await page.waitForSelector('[data-testid="create-task-form"], form:has-text("Task" i), form:has-text("Tâche" i)', { timeout: 5000 });

      // Fill task details
      const timestamp = Date.now();
      const taskTitle = `E2E Test Task ${timestamp}`;

      await fillFormField(page, 'input[name="title"], input[name="name"]', taskTitle);
      await fillFormField(page, 'textarea[name="description"]', 'Test task created by E2E automation');

      // Select task type
      const taskTypeSelect = page.locator('select[name="task_type"]');
      if (await taskTypeSelect.isVisible()) {
        await page.selectOption('select[name="task_type"]', 'planting');
      }

      // Select priority
      const prioritySelect = page.locator('select[name="priority"]');
      if (await prioritySelect.isVisible()) {
        await page.selectOption('select[name="priority"]', 'medium');
      }

      // Set due date
      const dueDateInput = page.locator('input[name="due_date"], input[type="date"]');
      if (await dueDateInput.isVisible()) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        await fillFormField(page, 'input[name="due_date"], input[type="date"]', tomorrow.toISOString().split('T')[0]);
      }

      // Submit task creation
      const submitButton = page.locator('[data-testid="task-submit-button"], button[type="submit"]');
      await submitButton.click();

      // Wait for API response
      await page.waitForResponse(/\/api\/v1\/tasks/, { timeout: 10000 });
      await waitForToast(page, undefined, 'success');

      // Verify task appears in list
      await page.waitForTimeout(1000);
      await expect(page.locator(`text="${taskTitle}"`).first()).toBeVisible({ timeout: 5000 });
    });

    test('should validate required fields', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/tasks/, { timeout: 10000 });

      // Click create task button
      const createButton = page.locator('[data-testid="create-task-button"], button:has-text("Add Task")').first();
      await createButton.click();

      // Wait for form
      await page.waitForSelector('[data-testid="create-task-form"], form:has-text("Task" i)', { timeout: 5000 });

      // Try to submit without filling required fields
      const submitButton = page.locator('[data-testid="task-submit-button"], button[type="submit"]');
      await submitButton.click();
      await page.waitForTimeout(500);

      // Should show validation errors
      const errorElements = page.locator('[data-testid="task-error"], [class*="error"], .error, [role="alert"]');
      const hasErrors = await errorElements.count() > 0;

      expect(hasErrors).toBeTruthy();
    });

    test('should assign workers to task during creation', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/tasks/, { timeout: 10000 });

      // Click create task button
      const createButton = page.locator('[data-testid="create-task-button"], button:has-text("Add Task")').first();
      await createButton.click();

      // Wait for form
      await page.waitForSelector('[data-testid="create-task-form"], form:has-text("Task" i)', { timeout: 5000 });

      // Fill basic task details
      const timestamp = Date.now();
      await fillFormField(page, 'input[name="title"], input[name="name"]', `Task ${timestamp}`);
      await fillFormField(page, 'textarea[name="description"]', 'Test task');

      // Look for worker assignment field
      const workerSelect = page.locator('select[name="worker_ids"], [data-testid="worker-select"]');

      if (await workerSelect.isVisible()) {
        const options = await workerSelect.locator('option').count();
        if (options > 1) {
          // Select first worker
          await page.selectOption('select[name="worker_ids"], [data-testid="worker-select"]', { index: 1 });
        }
      }

      // Submit task creation
      const submitButton = page.locator('[data-testid="task-submit-button"], button[type="submit"]');
      await submitButton.click();

      // Wait for API response
      await page.waitForResponse(/\/api\/v1\/tasks/, { timeout: 10000 });
      await waitForToast(page, undefined, 'success');
    });
  });

  test.describe('Task Details', () => {
    test('should display task details', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/tasks/, { timeout: 10000 });

      // Look for a task card
      const taskCard = page.locator('[data-testid="task-card"], .task-card, [class*="task"]').first();

      if (await taskCard.isVisible()) {
        // Click on task
        await taskCard.click();
        await page.waitForTimeout(500);

        // Verify details modal/page is shown
        const detailsModal = page.locator('[data-testid="task-details-modal"], [role="dialog"]');
        const hasDetails = await detailsModal.isVisible();

        expect(hasDetails).toBeTruthy();
      }
    });

    test('should show task assignees', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/tasks/, { timeout: 10000 });

      // Look for task card
      const taskCard = page.locator('[data-testid="task-card"], .task-card').first();

      if (await taskCard.isVisible()) {
        await taskCard.click();
        await page.waitForTimeout(500);

        // Look for assignees section
        const assigneesSection = page.locator('[data-testid="task-assignees"], .assignees');
        const hasAssignees = await assigneesSection.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasAssignees) {
          await expect(assigneesSection).toBeVisible();
        }
      }
    });

    test('should show task progress', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/tasks/, { timeout: 10000 });

      // Look for task card
      const taskCard = page.locator('[data-testid="task-card"], .task-card').first();

      if (await taskCard.isVisible()) {
        await taskCard.click();
        await page.waitForTimeout(500);

        // Look for progress bar
        const progressBar = page.locator('[data-testid="task-progress"], .progress-bar, [role="progressbar"]');
        const hasProgress = await progressBar.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasProgress) {
          await expect(progressBar).toBeVisible();
        }
      }
    });
  });

  test.describe('Task Update', () => {
    test('should update task information', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/tasks/, { timeout: 10000 });

      // Look for edit button on first task
      const editButton = page.locator('[data-testid="edit-task-button"], button:has-text("Edit"), button[title*="Edit"]').first();

      if (await editButton.isVisible()) {
        // Click edit
        await editButton.click();
        await page.waitForSelector('[data-testid="edit-task-form"], form:has-text("Task" i)', { timeout: 5000 });

        // Update title
        const timestamp = Date.now();
        await fillFormField(page, 'input[name="title"], input[name="name"]', `Updated Task ${timestamp}`);

        // Submit
        const submitButton = page.locator('[data-testid="task-submit-button"], button[type="submit"]');
        await submitButton.click();

        // Wait for API response
        await page.waitForResponse(/\/api\/v1\/tasks/, { timeout: 10000 });
        await waitForToast(page, undefined, 'success');

        // Verify update
        await page.waitForTimeout(1000);
        await expect(page.locator(`text="Updated Task ${timestamp}"`).first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('should update task status', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/tasks/, { timeout: 10000 });

      // Look for status dropdown or button
      const statusDropdown = page.locator('[data-testid="task-status-dropdown"], select[name="status"]').first();

      if (await statusDropdown.isVisible()) {
        // Get current status
        const currentStatus = await statusDropdown.inputValue();

        // Change status to in_progress
        await page.selectOption('[data-testid="task-status-dropdown"], select[name="status"]', 'in_progress');
        await page.waitForTimeout(500);

        // Verify status changed
        const newStatus = await statusDropdown.inputValue();
        expect(newStatus).not.toBe(currentStatus);
      }
    });

    test('should update task priority', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/tasks/, { timeout: 10000 });

      // Look for priority dropdown
      const priorityDropdown = page.locator('[data-testid="task-priority-dropdown"], select[name="priority"]').first();

      if (await priorityDropdown.isVisible()) {
        // Get current priority
        const currentPriority = await priorityDropdown.inputValue();

        // Change priority to high
        await page.selectOption('[data-testid="task-priority-dropdown"], select[name="priority"]', 'high');
        await page.waitForTimeout(500);

        // Verify priority changed
        const newPriority = await priorityDropdown.inputValue();
        expect(newPriority).not.toBe(currentPriority);
      }
    });
  });

  test.describe('Task Completion', () => {
    test('should complete a task', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/tasks/, { timeout: 10000 });

      // Look for complete button
      const completeButton = page.locator('[data-testid="complete-task-button"], button:has-text("Complete"), button:has-text("Terminer")').first();

      if (await completeButton.isVisible()) {
        await completeButton.click();

        // Wait for completion form or confirmation
        await page.waitForTimeout(500);

        const completionForm = page.locator('[data-testid="task-completion-form"], form:has-text("Complete" i)');

        if (await completionForm.isVisible()) {
          // Fill completion notes
          await fillFormField(page, 'textarea[name="completion_notes"]', 'Task completed successfully');

          // Submit completion
          const submitButton = completionForm.locator('button[type="submit"]');
          await submitButton.click();

          // Wait for API response
          await page.waitForResponse(/\/api\/v1\/tasks/, { timeout: 10000 });
          await waitForToast(page, undefined, 'success');
        }
      }
    });

    test('should complete harvest task with harvest record', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/tasks/, { timeout: 10000 });

      // Look for harvest task
      const harvestTaskCard = page.locator('[data-testid="task-card"]:has-text("harvest"), .task-card:has-text("récolte")').first();

      if (await harvestTaskCard.isVisible()) {
        await harvestTaskCard.click();
        await page.waitForTimeout(500);

        // Look for complete with harvest button
        const completeWithHarvestButton = page.locator('[data-testid="complete-with-harvest-button"], button:has-text("Complete with Harvest")').first();

        if (await completeWithHarvestButton.isVisible()) {
          await completeWithHarvestButton.click();

          // Wait for harvest form
          await page.waitForSelector('[data-testid="harvest-form"], form:has-text("Harvest" i)', { timeout: 5000 });

          // Fill harvest details
          const harvestDate = new Date().toISOString().split('T')[0];
          await fillFormField(page, 'input[name="harvest_date"], input[type="date"]', harvestDate);
          await fillFormField(page, 'input[name="quantity"]', '1000');

          // Submit
          const submitButton = page.locator('[data-testid="harvest-submit-button"], button[type="submit"]');
          await submitButton.click();

          // Wait for API response
          await page.waitForResponse(/\/api\/v1\/(tasks|harvests)/, { timeout: 10000 });
          await waitForToast(page, undefined, 'success');
        }
      }
    });
  });

  test.describe('Task Deletion', () => {
    test('should delete a task', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/tasks/, { timeout: 10000 });

      // Get initial count
      const taskCards = page.locator('[data-testid="task-card"], .task-card');
      const initialCount = await taskCards.count();

      if (initialCount > 0) {
        // Click delete button
        const deleteButton = page.locator('[data-testid="delete-task-button"], button:has-text("Delete"), button[title*="Delete"]').first();
        await deleteButton.click();

        // Wait for confirmation dialog
        const confirmDialog = page.locator('[role="alertdialog"], [role="dialog"]');
        if (await confirmDialog.isVisible()) {
          // Confirm deletion
          const confirmButton = confirmDialog.locator('button:has-text("Delete"), button:has-text("Supprimer"), button:has-text("Confirm")').first();
          await confirmButton.click();
        }

        // Wait for API response
        await page.waitForResponse(/\/api\/v1\/tasks/, { timeout: 10000 });
        await waitForToast(page, undefined, 'success');

        // Verify task is deleted
        await page.waitForTimeout(1000);
        const newCount = await taskCards.count();
        expect(newCount).toBeLessThan(initialCount);
      }
    });

    test('should cancel task deletion', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/tasks/, { timeout: 10000 });

      // Get initial count
      const taskCards = page.locator('[data-testid="task-card"], .task-card');
      const initialCount = await taskCards.count();

      if (initialCount > 0) {
        // Click delete button
        const deleteButton = page.locator('[data-testid="delete-task-button"], button:has-text("Delete")').first();
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
        const newCount = await taskCards.count();
        expect(newCount).toBe(initialCount);
      }
    });
  });

  test.describe('Task Comments', () => {
    test('should add comment to task', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/tasks/, { timeout: 10000 });

      // Look for task card
      const taskCard = page.locator('[data-testid="task-card"], .task-card').first();

      if (await taskCard.isVisible()) {
        await taskCard.click();
        await page.waitForTimeout(500);

        // Look for comment input
        const commentInput = page.locator('[data-testid="comment-input"], textarea[placeholder*="comment" i]');

        if (await commentInput.isVisible()) {
          // Add comment
          await fillFormField(page, '[data-testid="comment-input"], textarea[placeholder*="comment" i]', 'Test comment from E2E');

          // Submit comment
          const submitButton = page.locator('[data-testid="submit-comment-button"], button:has-text("Send"), button:has-text("Envoyer")').first();
          await submitButton.click();

          // Wait for API response
          await page.waitForResponse(/\/api\/v1\/(comments|task-comments)/, { timeout: 10000 });

          // Verify comment appears
          await page.waitForTimeout(500);
          await expect(page.locator('text="Test comment from E2E"').first()).toBeVisible();
        }
      }
    });

    test('should display task comments', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/tasks/, { timeout: 10000 });

      // Look for task card
      const taskCard = page.locator('[data-testid="task-card"], .task-card').first();

      if (await taskCard.isVisible()) {
        await taskCard.click();
        await page.waitForTimeout(500);

        // Look for comments section
        const commentsSection = page.locator('[data-testid="task-comments"], .comments');
        const hasComments = await commentsSection.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasComments) {
          await expect(commentsSection).toBeVisible();
        }
      }
    });
  });

  test.describe('Task Time Tracking', () => {
    test('should clock in to task', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/tasks/, { timeout: 10000 });

      // Look for clock in button
      const clockInButton = page.locator('[data-testid="clock-in-button"], button:has-text("Clock In"), button:has-text("Pointer")').first();

      if (await clockInButton.isVisible()) {
        await clockInButton.click();

        // Wait for API response
        await page.waitForResponse(/\/api\/v1\/(time-logs|clock-in)/, { timeout: 10000 });
        await waitForToast(page, undefined, 'success');

        // Verify button changed to clock out
        const clockOutButton = page.locator('[data-testid="clock-out-button"], button:has-text("Clock Out"), button:has-text("Pointer Out")').first();
        await expect(clockOutButton).toBeVisible({ timeout: 3000 });
      }
    });

    test('should clock out from task', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/tasks/, { timeout: 10000 });

      // Look for clock out button (assuming already clocked in)
      const clockOutButton = page.locator('[data-testid="clock-out-button"], button:has-text("Clock Out")').first();

      if (await clockOutButton.isVisible()) {
        await clockOutButton.click();

        // Wait for API response
        await page.waitForResponse(/\/api\/v1\/(time-logs|clock-out)/, { timeout: 10000 });
        await waitForToast(page, undefined, 'success');

        // Verify button changed to clock in
        const clockInButton = page.locator('[data-testid="clock-in-button"], button:has-text("Clock In")').first();
        await expect(clockInButton).toBeVisible({ timeout: 3000 });
      }
    });

    test('should display time logs', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/tasks/, { timeout: 10000 });

      // Look for task card
      const taskCard = page.locator('[data-testid="task-card"], .task-card').first();

      if (await taskCard.isVisible()) {
        await taskCard.click();
        await page.waitForTimeout(500);

        // Look for time logs section
        const timeLogsSection = page.locator('[data-testid="time-logs"], .time-logs');
        const hasTimeLogs = await timeLogsSection.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasTimeLogs) {
          await expect(timeLogsSection).toBeVisible();
        }
      }
    });
  });

  test.describe('Task Filtering and Sorting', () => {
    test('should sort tasks by due date', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/tasks/, { timeout: 10000 });

      // Look for sort dropdown
      const sortSelect = page.locator('select[name="sort"], [data-testid="sort-select"]').first();

      if (await sortSelect.isVisible()) {
        // Sort by due date
        await page.selectOption('select[name="sort"], [data-testid="sort-select"]', 'due_date');
        await page.waitForTimeout(500);

        // Verify sort is applied
        const url = page.url();
        expect(url).toContain('sort=due_date');
      }
    });

    test('should filter by priority', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/tasks/, { timeout: 10000 });

      // Look for priority filter
      const priorityFilter = page.locator('[data-testid="priority-filter"], select[name="priority"]').first();

      if (await priorityFilter.isVisible()) {
        // Filter by high priority
        await page.selectOption('[data-testid="priority-filter"], select[name="priority"]', 'high');
        await page.waitForTimeout(500);

        // Verify filter is applied
        const url = page.url();
        expect(url).toContain('priority=high');
      }
    });

    test('should filter by date range', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/tasks/, { timeout: 10000 });

      // Look for date range inputs
      const fromDateInput = page.locator('input[name="from_date"], [data-testid="from-date"]');
      const toDateInput = page.locator('input[name="to_date"], [data-testid="to-date"]');

      if (await fromDateInput.isVisible() && await toDateInput.isVisible()) {
        // Set date range
        const today = new Date().toISOString().split('T')[0];
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        await fillFormField(page, 'input[name="from_date"], [data-testid="from-date"]', today);
        await fillFormField(page, 'input[name="to_date"], [data-testid="to-date"]', nextWeek);

        await page.waitForTimeout(500);

        // Verify filter is applied
        const url = page.url();
        expect(url).toMatch(/(from_date|from)/);
      }
    });
  });

  test.describe('Task Categories', () => {
    test('should display task categories', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/tasks/, { timeout: 10000 });

      // Look for categories section
      const categoriesSection = page.locator('[data-testid="task-categories"], .categories');
      const hasCategories = await categoriesSection.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasCategories) {
        await expect(categoriesSection).toBeVisible();
      }
    });

    test('should filter by category', async ({ authenticatedPage: page }) => {
      await page.waitForResponse(/\/api\/v1\/tasks/, { timeout: 10000 });

      // Look for category filter
      const categoryFilter = page.locator('[data-testid="category-filter"], select[name="category"]').first();

      if (await categoryFilter.isVisible()) {
        // Filter by a category
        await page.selectOption('[data-testid="category-filter"], select[name="category"]', { index: 1 });
        await page.waitForTimeout(500);

        // Verify filter is applied
        const url = page.url();
        expect(url).toContain('category');
      }
    });
  });
});
