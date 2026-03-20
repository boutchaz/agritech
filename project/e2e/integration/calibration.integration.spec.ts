import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { waitForLoadingComplete } from '../utils/test-helpers';

/**
 * Parcel calibration flows — locators use `data-testid` only so tests stay stable when copy is i18n'd.
 * Hooks live on calibration UI components (see `calibration-*` test ids in source).
 */

const parcelId = process.env.INTEGRATION_CALIBRATION_PARCEL_ID?.trim();

/** Opt-in: run the real initial calibration job (destructive on target parcel). */
function shouldSubmitInitialCalibration(): boolean {
  return (
    process.env.INTEGRATION_CALIBRATION_SUBMIT_INITIAL === 'true' ||
    process.env.INTEGRATION_CALIBRATION_SUBMIT_F1 === 'true'
  );
}

test.beforeAll(() => {
  test.skip(!parcelId, 'Set INTEGRATION_CALIBRATION_PARCEL_ID to a parcel UUID in your integration org.');
});

function calibrationPath(): string {
  return `/parcels/${parcelId}/ai/calibration`;
}

/** Any primary calibration UI state after load (locale-independent). */
function calibrationLoadedLocator(page: Page) {
  return page
    .getByTestId('calibration-initial-wizard')
    .or(page.locator('[data-testid="calibration-phase-banner"][data-phase="active"]'))
    .or(page.locator('[data-testid="calibration-phase-banner"][data-phase="awaiting_validation"]'))
    .or(page.locator('[data-testid="calibration-phase-banner"][data-phase="awaiting_nutrition_option"]'))
    .or(page.getByTestId('calibration-failed-panel'))
    .or(page.getByTestId('calibration-in-progress'))
    .or(page.getByTestId('calibration-v2-report'));
}

test.describe('Calibration integration', () => {
  test('Initial calibration — page loads without fatal errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const pid = parcelId as string;
    const failedApi: string[] = [];
    page.on('response', (resp) => {
      const u = resp.url();
      if (
        u.includes(`/api/v1/parcels/${pid}`) &&
        u.includes('/calibration') &&
        resp.status() >= 500
      ) {
        failedApi.push(`${resp.status()} ${u}`);
      }
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    await page.goto(calibrationPath());
    await waitForLoadingComplete(page);

    await expect(page.getByTestId('calibration-page')).toBeVisible();
    await expect(page.getByTestId('calibration-page-title')).toBeVisible();

    await expect(calibrationLoadedLocator(page)).toBeVisible({ timeout: 45_000 });

    expect(
      failedApi,
      `Calibration API returned 5xx: ${failedApi.join('; ')}`,
    ).toHaveLength(0);

    const criticalConsole = consoleErrors.filter(
      (t) =>
        !t.includes('favicon') &&
        !t.includes('ResizeObserver') &&
        !t.includes('Non-Error promise rejection'),
    );
    expect(
      criticalConsole,
      `Unexpected console errors: ${criticalConsole.join(' | ')}`,
    ).toHaveLength(0);
  });

  test('Initial calibration — readiness panel loads on Validation step when wizard is shown', async ({
    page,
  }) => {
    await page.goto(calibrationPath());
    await waitForLoadingComplete(page);

    const wizardVisible = await page
      .getByTestId('calibration-initial-wizard')
      .isVisible({ timeout: 15_000 })
      .catch(() => false);
    test.skip(
      !wizardVisible,
      'Parcel is not in the initial calibration wizard phase; skipping readiness UI check.',
    );

    await page.getByTestId('calibration-wizard-step-8').click();

    await expect(page.getByTestId('calibration-readiness-panel')).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByTestId('calibration-readiness-error')).not.toBeVisible();
  });

  test('Partial recalibration — motif wizard opens when parcel is active', async ({ page }) => {
    await page.goto(calibrationPath());
    await waitForLoadingComplete(page);

    const partialBtn = page.getByTestId('calibration-open-partial-recalibration');
    const partialVisible = await partialBtn.isVisible({ timeout: 15_000 }).catch(() => false);
    test.skip(!partialVisible, 'Partial recalibration not available (parcel not in active phase).');

    await partialBtn.click();

    await expect(page.getByTestId('calibration-partial-recalibration-dialog')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId('calibration-partial-motif-step')).toBeVisible();
    await expect(page.getByTestId('calibration-partial-motif-option-new_soil_analysis')).toBeVisible();
  });

  test('Annual recalibration — wizard opens from eligibility banner when shown', async ({
    page,
  }) => {
    await page.goto(calibrationPath());
    await waitForLoadingComplete(page);

    const banner = page.getByTestId('calibration-annual-eligibility-banner');
    const bannerVisible = await banner.isVisible({ timeout: 10_000 }).catch(() => false);
    test.skip(
      !bannerVisible,
      'Annual recalibration banner not shown (eligibility rules not met for this parcel).',
    );

    await page.getByTestId('calibration-start-annual-recalibration').click();

    await expect(page.getByTestId('calibration-annual-wizard')).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId('calibration-annual-wizard-trigger')).toBeVisible();
  });
});

test.describe('Calibration integration — optional deep run', () => {
  test.beforeAll(() => {
    test.skip(!parcelId, 'Set INTEGRATION_CALIBRATION_PARCEL_ID to a parcel UUID in your integration org.');
  });

  test('Initial calibration — submit launch when readiness allows (opt-in)', async ({ page }) => {
    test.skip(
      !shouldSubmitInitialCalibration(),
      'Set INTEGRATION_CALIBRATION_SUBMIT_INITIAL=true to run (legacy alias: INTEGRATION_CALIBRATION_SUBMIT_F1). Triggers a real calibration job on the parcel.',
    );

    await page.goto(calibrationPath());
    await waitForLoadingComplete(page);

    await expect(page.getByTestId('calibration-initial-wizard')).toBeVisible({
      timeout: 20_000,
    });

    await page.getByTestId('calibration-wizard-step-8').click();
    await expect(page.getByTestId('calibration-readiness-panel')).toBeVisible({
      timeout: 45_000,
    });

    const launch = page.getByTestId('calibration-readiness-launch');
    await expect(launch).toBeEnabled({ timeout: 10_000 });

    await launch.click();

    await expect(
      page
        .getByTestId('calibration-in-progress')
        .or(page.locator('[data-testid="calibration-phase-banner"][data-phase="awaiting_validation"]')),
    ).toBeVisible({ timeout: 120_000 });
  });
});
