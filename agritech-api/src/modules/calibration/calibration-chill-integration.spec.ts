import { Test, TestingModule } from '@nestjs/testing';
import { CalibrationReviewAdapter } from './calibration-review.adapter';
import type { CalibrationSnapshotInput } from './dto/calibration-review.dto';

/**
 * Integration spec for chill_hours surfacing through CalibrationReviewAdapter.
 *
 * Verifies the full pipeline: snapshot input (as built by CalibrationService) →
 * adapter → review view → block_a concerns/strengths + block_b chill display.
 *
 * Backend wiring this exercises:
 *  - dto/calibration-review.dto.ts: variety field + ChillHoursDisplay + chill on PhenologyDashboardData
 *  - calibration-review.adapter.ts: buildChillDisplay + Block A overlay + buildBlockB plumb
 *  - referentials/DATA_OLIVIER.json: variety bracket lookup
 */

const buildOliveSnapshot = (overrides: {
  variety: string | null;
  chillHours: number;
}): CalibrationSnapshotInput => ({
  calibration_id: 'cal-int-001',
  parcel_id: 'parcel-int-001',
  generated_at: '2026-04-01T00:00:00.000Z',
  confidence_score: 0.7,
  status: 'awaiting_validation',
  parcel_phase: 'flowering',
  organization_id: 'org-int-001',
  crop_type: 'olivier',
  variety: overrides.variety,
  planting_year: 2015,
  calibration_history: [],
  inputs: {},
  output: {
    phase_age: 'flowering',
    confidence: { total_score: 70, normalized_score: 70, components: {} },
    metadata: { data_quality_flags: [] },
    step1: {
      filtered_image_count: 12,
      cloud_coverage_mean: 8,
      outlier_count: 0,
      interpolated_dates: [],
      index_time_series: { NDVI: [{ date: '2026-02-01', value: 0.55, outlier: false }] },
    },
    step2: { chill_hours: overrides.chillHours, cumulative_gdd: {}, extreme_events: [] },
    step3: {
      global_percentiles: {
        NIRv: { p10: 0.05, p25: 0.08, p50: 0.12, p75: 0.18, p90: 0.25, mean: 0.13, std: 0.05 },
        NDVI: { p10: 0.2, p25: 0.3, p50: 0.5, p75: 0.6, p90: 0.7, mean: 0.5, std: 0.1 },
        NDMI: { p10: 0.05, p25: 0.10, p50: 0.19, p75: 0.25, p90: 0.30, mean: 0.18, std: 0.06 },
        NDRE: { p10: 0.08, p25: 0.14, p50: 0.24, p75: 0.30, p90: 0.35, mean: 0.22, std: 0.07 },
        EVI: { p10: 0.15, p25: 0.22, p50: 0.34, p75: 0.42, p90: 0.50, mean: 0.33, std: 0.09 },
        GCI: { p10: 0.80, p25: 1.00, p50: 1.20, p75: 1.40, p90: 1.60, mean: 1.20, std: 0.2 },
      },
    },
    step4: {
      mean_dates: { dormancy_exit: '2026-02-01', peak: '2026-04-01', plateau_start: '2026-05-01', decline_start: '2026-09-01', dormancy_entry: '2026-12-01' },
      yearly_stages: { '2026': { dormancy_exit: '2026-02-01', peak: '2026-04-01', plateau_start: '2026-05-01', decline_start: '2026-09-01', dormancy_entry: '2026-12-01' } },
      inter_annual_variability_days: {},
    },
    step5: { anomalies: [] },
    step6: { yield_potential: { minimum: 3, maximum: 6 } },
    step7: { zone_summary: [] },
    step8: { health_score: { total: 70, components: { vigor: 75, hydric: 70, nutritional: 70, spatial_homogeneity: 70, temporal_stability: 70 } } },
  },
});

describe('Chill hours integration through CalibrationReviewAdapter', () => {
  let adapter: CalibrationReviewAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CalibrationReviewAdapter],
    }).compile();
    adapter = module.get(CalibrationReviewAdapter);
  });

  it('Picholine Marocaine 350h → green band (≥ max 200) → strength entry in Block A', () => {
    const result = adapter.transform(
      buildOliveSnapshot({ variety: 'Picholine Marocaine', chillHours: 350 }),
    );
    const chill = result.block_b.phenology_dashboard?.chill;
    expect(chill).not.toBeNull();
    expect(chill!.value).toBe(350);
    expect(chill!.reference.min).toBe(100);
    expect(chill!.reference.max).toBe(200);
    expect(chill!.reference.source).toBe('variety');
    // 350 ≥ 200 (max) → green band, NOT yellow (Picholine bracket is tighter)
    expect(chill!.band).toBe('green');
    // Green → strength entry exists
    expect(result.block_a.strengths.find((s) => s.component === 'Heures de froid')).toBeDefined();
  });

  it('Picual 250h → red band → vigilance concern in Block A', () => {
    const result = adapter.transform(
      buildOliveSnapshot({ variety: 'Picual', chillHours: 250 }),
    );
    const chill = result.block_b.phenology_dashboard?.chill;
    expect(chill!.band).toBe('red');
    const concern = result.block_a.concerns.find((c) => c.component === 'Heures de froid');
    expect(concern).toBeDefined();
    expect(concern!.severity).toBe('vigilance');
    expect(concern!.target_block).toBe('B');
  });

  it('Critique 80h → critique concern in Block A regardless of variety', () => {
    const result = adapter.transform(
      buildOliveSnapshot({ variety: 'Picholine Marocaine', chillHours: 80 }),
    );
    expect(result.block_b.phenology_dashboard?.chill?.band).toBe('critique');
    const concern = result.block_a.concerns.find((c) => c.component === 'Heures de froid');
    expect(concern!.severity).toBe('critique');
    expect(concern!.phrase.toLowerCase()).toContain('dormance');
  });

  it('Unknown variety → fallback bracket [200,400], variety_label null', () => {
    const result = adapter.transform(
      buildOliveSnapshot({ variety: 'NotARealVariety', chillHours: 300 }),
    );
    const chill = result.block_b.phenology_dashboard?.chill;
    expect(chill!.reference.source).toBe('fallback');
    expect(chill!.reference.variety_label).toBeNull();
    expect(chill!.reference.min).toBe(200);
    expect(chill!.reference.max).toBe(400);
    expect(chill!.band).toBe('yellow');
  });
});
