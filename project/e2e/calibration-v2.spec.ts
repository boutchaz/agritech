import { test, expect } from './fixtures/auth';
import { waitForLoadingComplete } from './utils/test-helpers';
import type { Page } from '@playwright/test';

const organizationId = 'org-e2e-001';
const farmId = 'farm-e2e-001';
const parcelId = 'parcel-e2e-test';
const calibrationId = 'cal-e2e-001';
const now = '2026-03-13T12:00:00.000Z';

const mockOrganization = {
  id: organizationId,
  name: 'E2E Organization',
  slug: 'e2e-organization',
  role: 'organization_admin',
  is_active: true,
  created_at: now,
  updated_at: now,
};

const mockFarm = {
  id: farmId,
  farm_id: farmId,
  organization_id: organizationId,
  name: 'North Farm',
  farm_name: 'North Farm',
  location: 'Meknes',
  farm_location: 'Meknes',
  size: 42,
  farm_size: 42,
  manager_name: 'E2E Manager',
  is_active: true,
  created_at: now,
  updated_at: now,
};

const baseParcel = {
  id: parcelId,
  farm_id: farmId,
  organization_id: organizationId,
  name: 'Parcel Alpha',
  description: 'Calibration V2 E2E parcel',
  area: 12.5,
  area_unit: 'ha',
  calculated_area: 12.5,
  is_active: true,
  created_at: now,
  updated_at: now,
};

const mockCalibrationOutput = {
  parcel_id: parcelId,
  maturity_phase: 'pleine_production',
  nutrition_option_suggestion: 'A',
  step1: {
    index_time_series: {
      NDVI: [
        { date: '2025-03-01', value: 0.48 },
        { date: '2025-05-01', value: 0.55 },
        { date: '2025-07-01', value: 0.61 },
      ],
      NDMI: [
        { date: '2025-03-01', value: 0.12 },
        { date: '2025-05-01', value: 0.17 },
        { date: '2025-07-01', value: 0.19 },
      ],
      NDRE: [
        { date: '2025-03-01', value: 0.18 },
        { date: '2025-05-01', value: 0.21 },
        { date: '2025-07-01', value: 0.24 },
      ],
    },
    cloud_coverage_mean: 12.5,
    filtered_image_count: 18,
    outlier_count: 0,
    interpolated_dates: [],
    raster_paths: {
      NDVI: ['mock/ndvi.tif'],
      NDMI: ['mock/ndmi.tif'],
      NDRE: ['mock/ndre.tif'],
    },
  },
  step2: {
    daily_weather: [
      { date: '2025-03-01', temp_min: 10, temp_max: 21, precip: 1.2, et0: 2.1 },
      { date: '2025-05-01', temp_min: 13, temp_max: 25, precip: 0.4, et0: 3.5 },
    ],
    monthly_aggregates: [
      { month: 'Mar', precipitation_total: 44.1, gdd_total: 130 },
      { month: 'Apr', precipitation_total: 28.3, gdd_total: 180 },
      { month: 'May', precipitation_total: 17.8, gdd_total: 240 },
    ],
    cumulative_gdd: {
      Mar: 130,
      Apr: 310,
      May: 550,
    },
    chill_hours: 90,
    extreme_events: [],
  },
  step3: {
    global_percentiles: {
      NDVI: { p10: 0.35, p25: 0.42, p50: 0.55, p75: 0.63, p90: 0.68, mean: 0.54, std: 0.08 },
      NDMI: { p10: 0.08, p25: 0.12, p50: 0.17, p75: 0.2, p90: 0.24, mean: 0.16, std: 0.04 },
      NDRE: { p10: 0.13, p25: 0.16, p50: 0.21, p75: 0.24, p90: 0.27, mean: 0.2, std: 0.03 },
    },
    phenology_period_percentiles: {},
  },
  step4: {
    mean_dates: {
      dormancy_exit: '2025-02-15',
      peak: '2025-05-20',
      plateau_start: '2025-06-15',
      decline_start: '2025-09-01',
      dormancy_entry: '2025-12-01',
    },
    inter_annual_variability_days: {
      peak: 8,
    },
    gdd_correlation: {
      peak: 0.82,
    },
  },
  step5: {
    anomalies: [],
  },
  step6: {
    yield_potential: {
      minimum: 4.2,
      maximum: 8.1,
      method: 'reference_and_history',
      reference_bracket: 'adult_orchard',
      historical_average: 6.4,
    },
  },
  step7: {
    zones_geojson: {
      type: 'FeatureCollection',
      features: [],
    },
    zone_summary: [
      { class_name: 'A', surface_percent: 35 },
      { class_name: 'B', surface_percent: 30 },
      { class_name: 'C', surface_percent: 20 },
      { class_name: 'D', surface_percent: 10 },
      { class_name: 'E', surface_percent: 5 },
    ],
    spatial_pattern_type: 'clustered',
  },
  step8: {
    health_score: {
      total: 72,
      components: {
        vigor: 75,
        homogeneity: 68,
        stability: 70,
        hydric: 72,
        nutritional: 65,
      },
    },
  },
  confidence: {
    total_score: 75,
    normalized_score: 0.63,
    components: {
      satellite: { score: 30, max_score: 30 },
      weather: { score: 24, max_score: 30 },
      coverage: { score: 21, max_score: 25 },
    },
  },
  metadata: {
    version: 'v2',
    generated_at: now,
    data_quality_flags: [],
  },
};

type MockPhase =
  | 'disabled'
  | 'calibrating'
  | 'awaiting_validation'
  | 'awaiting_nutrition_option'
  | 'active'
  | 'unknown';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createCalibrationRecord(status: 'in_progress' | 'completed' = 'completed') {
  return {
    id: calibrationId,
    parcel_id: parcelId,
    organization_id: organizationId,
    status,
    calibration_version: 'v2',
    baseline_ndvi: 0.55,
    baseline_ndre: 0.21,
    baseline_ndmi: 0.17,
    confidence_score: 0.63,
    zone_classification: 'B',
    phenology_stage: 'fruit_development',
    health_score: 72,
    yield_potential_min: 4.2,
    yield_potential_max: 8.1,
    maturity_phase: 'adult',
    anomaly_count: 0,
    data_completeness_score: 75,
    started_at: now,
    completed_at: status === 'completed' ? now : null,
  };
}

function createReportResponse(validated: boolean) {
  return {
    calibration: createCalibrationRecord('completed'),
    report: {
      version: 'v2',
      output: mockCalibrationOutput,
      validation: {
        validated,
        validated_at: validated ? now : null,
      },
    },
  };
}

async function seedOrganization(page: Page) {
  const storageValue = JSON.stringify({
    state: {
      currentOrganization: {
        id: organizationId,
        name: mockOrganization.name,
        description: null,
        slug: mockOrganization.slug,
        currency_code: 'MAD',
        timezone: 'Africa/Casablanca',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    },
    version: 0,
  });

  await page.addInitScript(
    ({ currentOrganization, organizationStorage }) => {
      localStorage.setItem('currentOrganization', currentOrganization);
      localStorage.setItem('organization-storage', organizationStorage);
    },
    {
      currentOrganization: JSON.stringify(mockOrganization),
      organizationStorage: storageValue,
    },
  );

  await page.evaluate(
    ({ currentOrganization, organizationStorage }) => {
      localStorage.setItem('currentOrganization', currentOrganization);
      localStorage.setItem('organization-storage', organizationStorage);
    },
    {
      currentOrganization: JSON.stringify(mockOrganization),
      organizationStorage: storageValue,
    },
  );
}

async function mockCalibrationRoutes(
  page: Page,
  initialPhase: MockPhase,
) {
  const state = {
    phase: initialPhase,
    calibrationCompleted: initialPhase !== 'disabled' && initialPhase !== 'unknown' && initialPhase !== 'calibrating',
    validationComplete: initialPhase === 'awaiting_nutrition_option' || initialPhase === 'active',
    selectedOption: initialPhase === 'active' ? 'A' : null as string | null,
  };

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const method = request.method();

    if (pathname === '/api/v1/farms' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, farms: [mockFarm] }),
      });
      return;
    }

    if (pathname === '/api/v1/parcels' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          parcels: [{ ...baseParcel, ai_phase: state.phase }],
        }),
      });
      return;
    }

    if (pathname === `/api/v1/parcels/${parcelId}` && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...baseParcel,
          ai_phase: state.phase,
        }),
      });
      return;
    }

    if (pathname === `/api/v1/parcels/${parcelId}/ai/diagnostics` && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }

    if (pathname === `/api/v1/parcels/${parcelId}/calibration` && method === 'GET') {
      const calibration = state.phase === 'calibrating'
        ? createCalibrationRecord('in_progress')
        : state.calibrationCompleted || state.validationComplete || state.phase === 'active'
          ? createCalibrationRecord('completed')
          : null;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(calibration),
      });
      return;
    }

    if (pathname === `/api/v1/parcels/${parcelId}/calibration/report` && method === 'GET') {
      const report = state.phase === 'calibrating' || (!state.calibrationCompleted && !state.validationComplete && state.phase !== 'active')
        ? null
        : createReportResponse(state.validationComplete || state.phase === 'active');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(report),
      });
      return;
    }

    if (pathname === `/api/v1/parcels/${parcelId}/calibration/start-v2` && method === 'POST') {
      await delay(300);
      state.phase = 'awaiting_validation';
      state.calibrationCompleted = true;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createCalibrationRecord('in_progress')),
      });
      return;
    }

    if (pathname === `/api/v1/parcels/${parcelId}/calibration/${calibrationId}/validate` && method === 'POST') {
      await delay(250);
      state.phase = 'awaiting_nutrition_option';
      state.validationComplete = true;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createCalibrationRecord('completed')),
      });
      return;
    }

    if (pathname === `/api/v1/parcels/${parcelId}/calibration/nutrition-suggestion` && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          suggested_option: 'A',
          rationale: {
            health_score: 72,
            confidence: 0.63,
          },
          alternatives: [
            { option: 'A', eligible: true, reason: 'Best balance for current canopy vigor.' },
            { option: 'B', eligible: true, reason: 'Higher input cost with moderate upside.' },
            { option: 'C', eligible: true, reason: 'Aggressive program reserved for stressed parcels.' },
          ],
        }),
      });
      return;
    }

    if (pathname === `/api/v1/parcels/${parcelId}/calibration/${calibrationId}/nutrition-option` && method === 'POST') {
      const payload = request.postDataJSON();
      const selectedOption =
        typeof payload === 'object' &&
        payload !== null &&
        'option' in payload &&
        typeof payload.option === 'string'
          ? payload.option
          : 'A';

      await delay(250);
      state.phase = 'active';
      state.selectedOption = selectedOption;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          calibration_id: calibrationId,
          parcel_id: parcelId,
          option: selectedOption,
          ai_phase: 'active',
        }),
      });
      return;
    }

    if (pathname.startsWith('/api/v1/organizations/') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOrganization),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });

  return state;
}

test.describe('Calibration V2 Page', () => {
  test('should complete the full calibration V2 journey with mocked API routes', async ({ authenticatedPage: page }) => {
    await seedOrganization(page);
    await mockCalibrationRoutes(page, 'disabled');

    await page.goto(`/parcels/${parcelId}/ai/calibration`);
    await waitForLoadingComplete(page);

    await expect(page.getByRole('heading', { name: 'AI Calibration' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start Calibration' })).toBeVisible();

    await page.getByRole('button', { name: 'Start Calibration' }).click();
    await expect(page.getByRole('button', { name: 'Starting...' })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Executive Summary' })).toBeVisible();
    await expect(page.getByText('72').first()).toBeVisible();
    await expect(page.getByText('63%').first()).toBeVisible();
    await expect(page.getByText('Full Production')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Detailed Analysis' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Detected Anomalies (0)' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Calibration Improvement' })).toBeVisible();

    await expect(page.getByText('Awaiting Validation')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Validate & Activate' })).toBeVisible();

    await page.getByRole('button', { name: 'Validate & Activate' }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('button', { name: 'Validate' }).click();

    await expect(page.getByText('Select Nutrition Option').first()).toBeVisible();
    await expect(page.getByText('Recommended')).toBeVisible();
    await expect(page.getByRole('button', { name: /Option A — Standard/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Option B — Enhanced/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Option C — Intensive/i })).toBeVisible();

    await page.getByRole('button', { name: /Option A — Standard/i }).click();
    await page.getByRole('button', { name: 'Confirm Selection' }).click();

    await expect(page.getByText('Calibration Active')).toBeVisible();
    await expect(page.getByText('AI diagnostics and monitoring are fully operational for this parcel.')).toBeVisible();
  });

  test('should show calibration phase indicators for calibrating and active states', async ({ authenticatedPage: page }) => {
    await seedOrganization(page);
    const state = await mockCalibrationRoutes(page, 'calibrating');

    await page.goto(`/parcels/${parcelId}/ai/calibration`);
    await waitForLoadingComplete(page);

    await expect(page.getByText('Provisioning Data')).toBeVisible();
    await expect(page.getByText('Fetching satellite indices (NDVI, NDRE, NDMI, EVI, SAVI, GCI)...')).toBeVisible();

    state.phase = 'active';
    state.calibrationCompleted = true;
    state.validationComplete = true;
    state.selectedOption = 'A';

    await page.goto(`/parcels/${parcelId}/ai/calibration`);
    await waitForLoadingComplete(page);

    await expect(page.getByText('Calibration Active')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Executive Summary' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Re-calibrate' })).toBeVisible();
  });
});
