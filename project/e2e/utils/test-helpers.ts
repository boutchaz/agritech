import type { Page, Locator } from '@playwright/test';

/**
 * Test helper utilities for Playwright tests
 */

/**
 * Wait for API response and return the JSON data
 */
export async function waitForAPIResponse<T = unknown>(
  page: Page,
  urlPattern: string | RegExp,
  action: () => Promise<void>
): Promise<T> {
  const responsePromise = page.waitForResponse(urlPattern);
  await action();
  const response = await responsePromise;
  return response.json();
}

/**
 * Wait for multiple API calls to complete
 */
export async function waitForMultipleAPIs(
  page: Page,
  patterns: (string | RegExp)[],
  action: () => Promise<void>
): Promise<void> {
  const promises = patterns.map((pattern) => page.waitForResponse(pattern));
  await action();
  await Promise.all(promises);
}

/**
 * Fill form field and wait for validation
 */
export async function fillFormField(
  page: Page,
  selector: string,
  value: string,
  options?: { waitForValidation?: boolean }
): Promise<void> {
  await page.fill(selector, value);

  if (options?.waitForValidation) {
    // Wait a bit for validation to run
    await page.waitForTimeout(300);
  }
}

/**
 * Click button and wait for navigation or API call
 */
export async function clickAndWait(
  page: Page,
  selector: string,
  options?: {
    waitForNavigation?: boolean;
    waitForAPI?: string | RegExp;
  }
): Promise<void> {
  if (options?.waitForNavigation) {
    await Promise.all([
      page.waitForNavigation(),
      page.click(selector),
    ]);
  } else if (options?.waitForAPI) {
    await Promise.all([
      page.waitForResponse(options.waitForAPI),
      page.click(selector),
    ]);
  } else {
    await page.click(selector);
  }
}

/**
 * Wait for toast notification to appear (optional - doesn't fail if not present)
 */
export async function waitForToast(
  page: Page,
  message?: string,
  type?: 'success' | 'error' | 'warning' | 'info'
): Promise<void> {
  // Sonner toast selector (based on your setup)
  const toastSelector = '[data-sonner-toast]';

  // Wait for toast with a short timeout, but don't fail if not present
  try {
    await page.waitForSelector(toastSelector, { timeout: 2000 });

    if (message) {
      await page.waitForSelector(`${toastSelector}:has-text("${message}")`, {
        timeout: 2000,
      });
    }

    if (type) {
      await page.waitForSelector(`${toastSelector}[data-type="${type}"]`, {
        timeout: 2000,
      });
    }
  } catch {
    // Toast not showing is OK - some actions don't show toasts
    console.log('Note: Toast notification not shown (this is OK)');
  }
}

/**
 * Dismiss all toast notifications
 */
export async function dismissToasts(page: Page): Promise<void> {
  const closeButtons = page.locator('[data-sonner-toast] button[aria-label="Close"]');
  const count = await closeButtons.count();

  for (let i = 0; i < count; i++) {
    await closeButtons.nth(i).click();
    await page.waitForTimeout(100);
  }
}

/**
 * Check if element is visible and enabled
 */
export async function isInteractable(locator: Locator): Promise<boolean> {
  const isVisible = await locator.isVisible();
  const isEnabled = await locator.isEnabled();
  return isVisible && isEnabled;
}

/**
 * Wait for loading spinners to disappear
 */
export async function waitForLoadingComplete(page: Page): Promise<void> {
  // Wait for any loading indicators to disappear
  const loadingSelectors = [
    '[data-testid="loading"]',
    '.spinner',
    '[role="status"]:has-text("Loading")',
    '[aria-busy="true"]',
  ];

  for (const selector of loadingSelectors) {
    const elements = page.locator(selector);
    const count = await elements.count();
    if (count > 0) {
      await elements.first().waitFor({ state: 'hidden', timeout: 10000 });
    }
  }
}

/**
 * Scroll element into view
 */
export async function scrollIntoView(locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
}

/**
 * Take screenshot with name
 */
export async function takeScreenshot(
  page: Page,
  name: string
): Promise<void> {
  await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
}

/**
 * Check if page has error message
 */
export async function hasErrorMessage(page: Page, message?: string): Promise<boolean> {
  const errorSelectors = [
    '[role="alert"]',
    '.error-message',
    '[data-testid="error"]',
  ];

  for (const selector of errorSelectors) {
    const element = page.locator(selector);
    if (await element.isVisible()) {
      if (message) {
        const text = await element.textContent();
        return text?.includes(message) ?? false;
      }
      return true;
    }
  }

  return false;
}

/**
 * Select option from dropdown/select
 */
export async function selectOption(
  page: Page,
  selector: string,
  value: string
): Promise<void> {
  await page.selectOption(selector, value);
  await page.waitForTimeout(200); // Wait for any onChange handlers
}

/**
 * Get table row count
 */
export async function getTableRowCount(
  page: Page,
  tableSelector: string = 'table'
): Promise<number> {
  const rows = page.locator(`${tableSelector} tbody tr`);
  return rows.count();
}

/**
 * Get table cell text
 */
export async function getTableCellText(
  page: Page,
  row: number,
  column: number,
  tableSelector: string = 'table'
): Promise<string> {
  const cell = page.locator(`${tableSelector} tbody tr:nth-child(${row}) td:nth-child(${column})`);
  const text = await cell.textContent();
  return text ?? '';
}

/**
 * Wait for network idle
 */
export async function waitForNetworkIdle(page: Page, timeout: number = 2000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}
