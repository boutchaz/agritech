import { Test, TestingModule } from '@nestjs/testing';
import { CalibrationReviewAdapter } from './calibration-review.adapter';
import type {
  CalibrationSnapshotInput,
  ChillHoursDisplay,
} from './dto/calibration-review.dto';

const buildSnapshotInput = (
  overrides: Partial<CalibrationSnapshotInput> = {},
): CalibrationSnapshotInput => ({
  calibration_id: 'calibration-001',
  parcel_id: 'parcel-001',
  generated_at: '2026-03-10T12:00:00.000Z',
  confidence_score: 0.82,
  status: 'awaiting_validation',
  parcel_phase: 'flowering',
  organization_id: 'org-001',
  calibration_history: [
    {
      id: 'cal-1',
      date: '2026-01-10T12:00:00.000Z',
      health_score: 77,
      confidence_score: 0.72,
      phase_age: 'dormancy_exit',
      status: 'completed',
    },
  ],
  inputs: {
    soil_analysis: { pH: 7.2, organic_matter: 2.1 },
    water_analysis: {},
    foliar_analysis: {},
    harvest_history: {},
    irrigation: { frequency: 'weekly', volume: 40 },
  },
  output: {
    phase_age: 'flowering',
    confidence: {
      total_score: 55,
      normalized_score: 50,
      components: {
        satellite: { score: 20, max_score: 30 },
        soil: { score: 18, max_score: 20 },
        water: { score: 0, max_score: 15 },
        yield: { score: 0, max_score: 20 },
        profile: { score: 8, max_score: 10 },
        irrigation: { score: 9, max_score: 10 },
        coherence: { score: 0, max_score: 5 },
      },
    },
    metadata: {
      data_quality_flags: ['low_satellite_density'],
    },
    step1: {
      filtered_image_count: 2,
      cloud_coverage_mean: 12,
      outlier_count: 1,
      interpolated_dates: ['2026-02-18'],
      index_time_series: {
        NIRv: [
          { date: '2025-06-01', value: 0.10, outlier: false },
          { date: '2025-07-15', value: 0.12, outlier: false },
          { date: '2026-02-01', value: 0.42, outlier: false },
        ],
        NDVI: [
          { date: '2025-06-01', value: 0.45, outlier: false },
          { date: '2026-02-01', value: 0.55, outlier: false },
        ],
        NDMI: [
          { date: '2026-02-01', value: 0.19, outlier: false },
        ],
        NDRE: [
          { date: '2026-02-01', value: 0.24, outlier: false },
        ],
        EVI: [
          { date: '2025-07-15', value: 0.30, outlier: false },
          { date: '2026-02-01', value: 0.36, outlier: false },
        ],
        GCI: [
          { date: '2026-02-01', value: 1.21, outlier: false },
        ],
      },
    },
    step2: {
      cumulative_gdd: { '2026-02': 110.5 },
      chill_hours: 18,
      extreme_events: [
        {
          event_type: 'heatwave',
          severity: 'high',
          date: '2026-03-02',
          message: 'Vague de chaleur',
        },
      ],
    },
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
      mean_dates: {
        dormancy_exit: '2026-01-15',
        peak: '2026-02-20',
        plateau_start: '2026-03-20',
        decline_start: '2026-07-01',
        dormancy_entry: '2026-10-01',
      },
      yearly_stages: {
        '2026': {
          dormancy_exit: '2026-01-15',
          peak: '2026-02-20',
          plateau_start: '2026-03-20',
          decline_start: '2026-07-01',
          dormancy_entry: '2026-10-01',
        },
      },
      inter_annual_variability_days: { peak: 3, dormancy_exit: 5 },
    },
    step5: {
      anomalies: [
        {
          anomaly_type: 'sudden_drop',
          severity: 'critical',
          date: '2026-03-01',
          message: 'Chute brutale NDVI',
        },
      ],
    },
    step6: {
      yield_potential: { minimum: 2.8, maximum: 6.9 },
      alternance: {
        detected: true,
        current_year_type: 'on',
        confidence: 0.7,
        alternance_index: 0.28,
      },
    },
    step7: {
      zone_summary: [
        { class_name: 'A', surface_percent: 7 },
        { class_name: 'B', surface_percent: 67 },
        { class_name: 'C', surface_percent: 16 },
        { class_name: 'D', surface_percent: 5 },
        { class_name: 'E', surface_percent: 5 },
      ],
    },
    step8: {
      health_score: {
        total: 69,
        components: {
          vigor: 81,
          spatial_homogeneity: 70,
          temporal_stability: 78,
          hydric: 22,
          nutritional: 73,
        },
      },
    },
  },
  ...overrides,
});

describe('ChillHoursDisplay shape', () => {
  it('exposes value, reference, band, phrase fields', () => {
    const sample: ChillHoursDisplay = {
      value: 342,
      reference: {
        min: 200,
        max: 400,
        source: 'variety',
        variety_label: 'Picholine Marocaine',
      },
      band: 'yellow',
      phrase: 'Heures de froid suffisantes',
    };
    expect(sample.value).toBe(342);
    expect(sample.reference.source).toBe('variety');
  });
});

describe('CalibrationSnapshotInput', () => {
  it('accepts variety field on snapshot input', () => {
    const input: CalibrationSnapshotInput = {
      ...buildSnapshotInput(),
      variety: 'Picual',
    };
    expect(input.variety).toBe('Picual');
  });
});

describe('CalibrationReviewAdapter', () => {
  let adapter: CalibrationReviewAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CalibrationReviewAdapter],
    }).compile();
    adapter = module.get(CalibrationReviewAdapter);
  });

  it('transform() returns review with all blocks populated', () => {
    const result = adapter.transform(buildSnapshotInput());

    expect(result.calibration_id).toBe('calibration-001');
    expect(result.block_a).toBeDefined();
    expect(result.block_b).toBeDefined();
    expect(result.block_d).toBeDefined();
    expect(result.block_g).toBeDefined();
    expect(result.export.available_formats).toEqual(['json', 'csv', 'zip']);
  });

  // ── Block A ──

  describe('block_a', () => {
    it('maps health score to correct label per spec thresholds', () => {
      const result = adapter.transform(buildSnapshotInput());
      expect(result.block_a.health_score).toBe(69);
      expect(result.block_a.health_label).toBe('bon'); // 60-80 range
    });

    it('maps confidence score to correct level', () => {
      const result = adapter.transform(buildSnapshotInput());
      expect(result.block_a.confidence_score).toBe(50);
      expect(result.block_a.confidence_level).toBe('moyen'); // 50-75 range
    });

    it('scales 0–1 pipeline normalized_score to percent for level and score', () => {
      const input = buildSnapshotInput();
      (input.output as { confidence: { normalized_score: number } }).confidence.normalized_score =
        0.6364;
      const result = adapter.transform(input);
      expect(result.block_a.confidence_score).toBe(64);
      expect(result.block_a.confidence_level).toBe('moyen');
      expect(result.block_d.current_confidence).toBe(64);
    });

    it('returns yield range with min and max', () => {
      const result = adapter.transform(buildSnapshotInput());
      expect(result.block_a.yield_range).toBeDefined();
      expect(result.block_a.yield_range!.min).toBe(2.8);
      expect(result.block_a.yield_range!.max).toBe(6.9);
      expect(result.block_a.yield_range!.unit).toBe('t/ha');
    });

    it('sets wide_range_warning when max > 2.5x min', () => {
      const result = adapter.transform(buildSnapshotInput());
      // 6.9 / 2.8 ≈ 2.46, not > 2.5
      expect(result.block_a.yield_range!.wide_range_warning).toBe(false);
    });

    it('derives concerns from health components below P25', () => {
      const result = adapter.transform(buildSnapshotInput());
      // hydric = 22 (below 25) → should be a concern
      const hydricConcern = result.block_a.concerns.find(
        (c) => c.component === 'État hydrique',
      );
      expect(hydricConcern).toBeDefined();
      expect(hydricConcern!.severity).toBe('vigilance'); // 22 > 10, so vigilance not critique
      expect(hydricConcern!.target_block).toBe('B');
    });

    it('derives strengths from health components above P75', () => {
      const result = adapter.transform(buildSnapshotInput());
      // vigor = 81 (above 75)
      const vigorStrength = result.block_a.strengths.find(
        (s) => s.component === 'Vigueur végétative',
      );
      expect(vigorStrength).toBeDefined();
    });

    it('caps strengths and concerns at 3 each', () => {
      const result = adapter.transform(buildSnapshotInput());
      expect(result.block_a.strengths.length).toBeLessThanOrEqual(3);
      expect(result.block_a.concerns.length).toBeLessThanOrEqual(3);
    });

    it('adds confidence concern when score < 50', () => {
      const input = buildSnapshotInput();
      (input.output as any).confidence.normalized_score = 30;
      const result = adapter.transform(input);
      const confConcern = result.block_a.concerns.find(
        (c) => c.component === 'Confiance',
      );
      expect(confConcern).toBeDefined();
      expect(confConcern!.target_block).toBe('D');
    });

    it('maps health labels correctly at boundaries', () => {
      const testCases: Array<[number, string]> = [
        [95, 'excellent'],
        [80, 'excellent'],
        [79, 'bon'],
        [60, 'bon'],
        [40, 'moyen'],
        [20, 'faible'],
        [5, 'critique'],
      ];

      for (const [score, expected] of testCases) {
        const input = buildSnapshotInput();
        (input.output as any).step8.health_score.total = score;
        const result = adapter.transform(input);
        expect(result.block_a.health_label).toBe(expected);
      }
    });
  });

  // ── Block B ──

  describe('block_b', () => {
    it('builds vigor card from NIRv percentiles', () => {
      const result = adapter.transform(buildSnapshotInput());
      expect(result.block_b.vigor.indice).toBe('NIRv');
      expect(result.block_b.vigor.valeur_mediane).toBe(0.12);
      expect(result.block_b.vigor.gauge.min).toBe(0);
      expect(result.block_b.vigor.gauge.max).toBe(100);
    });

    it('builds hydric card with cross-diagnosis', () => {
      const result = adapter.transform(buildSnapshotInput());
      expect(result.block_b.hydric.indice).toBe('NDMI');
      expect(result.block_b.hydric.sources_used).toContain('NDMI satellite');
    });

    it('builds nutritional card with NDRE', () => {
      const result = adapter.transform(buildSnapshotInput());
      expect(result.block_b.nutritional.indice).toBe('NDRE');
    });

    it('builds heatmap with zone summary', () => {
      const result = adapter.transform(buildSnapshotInput());
      expect(result.block_b.heatmap.zone_summary).toHaveLength(5);
      expect(result.block_b.heatmap.zone_summary[0].class_name).toBe('A');
      expect(result.block_b.heatmap.zone_summary[0].color).toBe('#0d6a2e');
    });

    it('marks heatmap unavailable when no EVI in summer window', () => {
      const input = buildSnapshotInput();
      // Remove all EVI data points
      (input.output as any).step1.index_time_series.EVI = [];
      (input.output as any).step7.zone_summary = [];
      const result = adapter.transform(input);
      expect(result.block_b.heatmap.available).toBe(false);
      expect(result.block_b.heatmap.blocked_message).toBeTruthy();
    });

    it('detects heterogeneity when D+E > 20%', () => {
      const result = adapter.transform(buildSnapshotInput());
      // D=5% + E=5% = 10% → not flagged
      expect(result.block_b.heterogeneity_flag).toBe(false);
    });

    it('flags heterogeneity when D+E > 20%', () => {
      const input = buildSnapshotInput();
      (input.output as any).step7.zone_summary = [
        { class_name: 'C', surface_percent: 60 },
        { class_name: 'D', surface_percent: 15 },
        { class_name: 'E', surface_percent: 25 },
      ];
      const result = adapter.transform(input);
      expect(result.block_b.heterogeneity_flag).toBe(true);
    });

    it('builds temporal stability from inter-annual variability', () => {
      const result = adapter.transform(buildSnapshotInput());
      expect(['stable', 'moderee', 'forte']).toContain(
        result.block_b.temporal_stability.label,
      );
      expect(result.block_b.temporal_stability.phrase).toBeTruthy();
    });

    it('calculates history depth from NDVI series date range', () => {
      const result = adapter.transform(buildSnapshotInput());
      expect(result.block_b.history_depth.months).toBeGreaterThan(0);
      expect(result.block_b.history_depth.date_start).toBeTruthy();
      expect(result.block_b.history_depth.date_end).toBeTruthy();
    });
  });

  // ── Block D ──

  describe('block_d', () => {
    it('identifies available and missing data from inputs', () => {
      const result = adapter.transform(buildSnapshotInput());
      // soil_analysis has data → available
      expect(result.block_d.available_data.some((d) => d.type === 'sol')).toBe(true);
      // water_analysis is empty → missing
      expect(result.block_d.missing_data.some((d) => d.type === 'eau')).toBe(true);
    });

    it('assigns correct gain points per spec', () => {
      const result = adapter.transform(buildSnapshotInput());
      const waterMissing = result.block_d.missing_data.find((d) => d.type === 'eau');
      expect(waterMissing?.gain_points).toBe(23);

      const foliarMissing = result.block_d.missing_data.find((d) => d.type === 'foliaire');
      expect(foliarMissing?.gain_points).toBe(15);

      const yieldMissing = result.block_d.missing_data.find((d) => d.type === 'rendements');
      expect(yieldMissing?.gain_points).toBe(11);
    });

    it('computes projected confidence correctly', () => {
      const result = adapter.transform(buildSnapshotInput());
      const totalGain = result.block_d.missing_data.reduce(
        (sum, m) => sum + m.gain_points,
        0,
      );
      expect(result.block_d.projected_confidence).toBe(
        Math.min(100, result.block_d.current_confidence + totalGain),
      );
    });

    it('includes prescribed messages for missing data', () => {
      const result = adapter.transform(buildSnapshotInput());
      for (const item of result.block_d.missing_data) {
        expect(item.message).toBeTruthy();
        expect(item.label).toBeTruthy();
      }
    });
  });

  // ── Block F ──

  describe('block_f', () => {
    it('returns alternance data when detected', () => {
      const result = adapter.transform(buildSnapshotInput());
      expect(result.block_f).toBeDefined();
      expect(result.block_f!.indice).toBe(0.28);
      expect(result.block_f!.label).toBe('marquee'); // 0.25-0.35
    });

    it('returns null when alternance not detected', () => {
      const input = buildSnapshotInput();
      (input.output as any).step6.alternance = { detected: false };
      const result = adapter.transform(input);
      expect(result.block_f).toBeNull();
    });

    it('maps next season badge to indetermine with < 24 months history', () => {
      const result = adapter.transform(buildSnapshotInput());
      // Only ~8 months of NDVI history → indetermine per spec
      expect(result.block_f!.next_season.badge).toBe('indetermine');
    });

    it('maps next season badge correctly for ON year with sufficient history', () => {
      const input = buildSnapshotInput();
      // Add 3 years of NDVI data to get >= 24 months
      const series = (input.output as any).step1.index_time_series;
      series.NDVI = [
        { date: '2023-06-01', value: 0.40, outlier: false },
        { date: '2024-06-01', value: 0.50, outlier: false },
        { date: '2025-06-01', value: 0.45, outlier: false },
        { date: '2026-02-01', value: 0.55, outlier: false },
      ];
      const result = adapter.transform(input);
      expect(result.block_f!.next_season.badge).toBe('off_probable');
    });
  });

  // ── Block G ──

  describe('block_g', () => {
    it('formats generation date in French locale', () => {
      const result = adapter.transform(buildSnapshotInput());
      expect(result.block_g.generated_at_formatted).toContain('Calibrage généré le');
      expect(result.block_g.calibration_version).toBe('v3');
    });
  });

  // ── Block H ──

  describe('block_h_enabled', () => {
    it('is true for awaiting_validation status', () => {
      const result = adapter.transform(buildSnapshotInput());
      expect(result.block_h_enabled).toBe(true);
    });

    it('is false for active status', () => {
      const result = adapter.transform(
        buildSnapshotInput({ status: 'active' }),
      );
      expect(result.block_h_enabled).toBe(false);
    });
  });

  // ── Block C (Phase 2 stub) ──

  describe('block_c', () => {
    it('returns anomaly list when anomalies exist', () => {
      const result = adapter.transform(buildSnapshotInput());
      expect(result.block_c).toBeDefined();
      expect(result.block_c!.anomalies).toHaveLength(1);
    });

    it('returns null when no anomalies', () => {
      const input = buildSnapshotInput();
      (input.output as any).step5.anomalies = [];
      const result = adapter.transform(input);
      expect(result.block_c).toBeNull();
    });
  });

  // ── Block A chill concern/strength injection ──

  describe('block_a chill concern injection', () => {
    const buildOlive = (chillValue: number, variety: string | null) => {
      const input = buildSnapshotInput({ crop_type: 'olivier', variety });
      (input.output as any).step2.chill_hours = chillValue;
      return input;
    };

    it('S3.1 — critique band → critique concern in block_a', () => {
      const result = adapter.transform(buildOlive(80, 'Picual'));
      const entry = result.block_a.concerns.find((c) => c.component === 'Heures de froid');
      expect(entry).toBeDefined();
      expect(entry!.severity).toBe('critique');
      expect(entry!.target_block).toBe('B');
      expect(entry!.phrase.toLowerCase()).toContain('dormance');
    });

    it('S3.2 — red band → vigilance concern in block_a', () => {
      const result = adapter.transform(buildOlive(250, 'Picual')); // bracket [400, 600]
      const entry = result.block_a.concerns.find((c) => c.component === 'Heures de froid');
      expect(entry).toBeDefined();
      expect(entry!.severity).toBe('vigilance');
      expect(entry!.phrase).toContain('400');
      expect(entry!.phrase).toContain('250');
    });

    it('S3.3 — green band → strength entry in block_a', () => {
      const result = adapter.transform(buildOlive(650, 'Picual'));
      const entry = result.block_a.strengths.find((s) => s.component === 'Heures de froid');
      expect(entry).toBeDefined();
      expect(entry!.phrase).toBeTruthy();
    });

    it('S3.4 — yellow band → no concern and no strength', () => {
      const result = adapter.transform(buildOlive(450, 'Picual'));
      expect(result.block_a.concerns.find((c) => c.component === 'Heures de froid')).toBeUndefined();
      expect(result.block_a.strengths.find((s) => s.component === 'Heures de froid')).toBeUndefined();
    });

    it('S3.5 — null chill display → no entry', () => {
      // Default fixture: no crop_type → chill is null
      const result = adapter.transform(buildSnapshotInput());
      expect(result.block_a.concerns.find((c) => c.component === 'Heures de froid')).toBeUndefined();
      expect(result.block_a.strengths.find((s) => s.component === 'Heures de froid')).toBeUndefined();
    });
  });

  // ── Block B chill_hours ──

  describe('block_b.phenology_dashboard.chill', () => {
    const buildOlive = (chillValue: number | undefined, variety: string | null) => {
      const input = buildSnapshotInput({ crop_type: 'olivier', variety });
      const step2 = (input.output as any).step2 as Record<string, unknown>;
      if (chillValue === undefined) {
        delete step2.chill_hours;
      } else {
        step2.chill_hours = chillValue;
      }
      return input;
    };

    it('S2.1 — variety found, value above max → green band (Picual 650h, bracket 400-600)', () => {
      const result = adapter.transform(buildOlive(650, 'Picual'));
      const chill = result.block_b.phenology_dashboard?.chill;
      expect(chill).not.toBeNull();
      expect(chill!.value).toBe(650);
      expect(chill!.reference.min).toBe(400);
      expect(chill!.reference.max).toBe(600);
      expect(chill!.reference.source).toBe('variety');
      expect(chill!.reference.variety_label).toBe('Picual');
      expect(chill!.band).toBe('green');
      expect(chill!.phrase).toBeTruthy();
    });

    it('S2.1b — variety found, value between min and max → yellow band (Picual 450h)', () => {
      const result = adapter.transform(buildOlive(450, 'Picual'));
      expect(result.block_b.phenology_dashboard!.chill!.band).toBe('yellow');
    });

    it('S2.2 — value below min, above 100 → red band (Picual 250h)', () => {
      const result = adapter.transform(buildOlive(250, 'Picual'));
      const chill = result.block_b.phenology_dashboard!.chill!;
      expect(chill.band).toBe('red');
      expect(chill.value).toBe(250);
      expect(chill.reference.source).toBe('variety');
    });

    it('S2.3 — value below 100 → critique band always', () => {
      const result = adapter.transform(buildOlive(80, 'Picual'));
      expect(result.block_b.phenology_dashboard!.chill!.band).toBe('critique');
    });

    it('S2.4 — variety not in referentiel → fallback bracket [200, 400] yellow', () => {
      const result = adapter.transform(buildOlive(300, 'Unknown Variety'));
      const chill = result.block_b.phenology_dashboard!.chill!;
      expect(chill.reference.min).toBe(200);
      expect(chill.reference.max).toBe(400);
      expect(chill.reference.source).toBe('fallback');
      expect(chill.reference.variety_label).toBeNull();
      expect(chill.band).toBe('yellow');
    });

    it('S2.5 — variety null → fallback bracket, 500h green', () => {
      const result = adapter.transform(buildOlive(500, null));
      const chill = result.block_b.phenology_dashboard!.chill!;
      expect(chill.reference.source).toBe('fallback');
      expect(chill.band).toBe('green');
    });

    it('S2.6 — chill_hours missing from step2 → null', () => {
      const result = adapter.transform(buildOlive(undefined, 'Picual'));
      expect(result.block_b.phenology_dashboard!.chill).toBeNull();
    });

    it('S2.7 — non-olive crop → null', () => {
      const input = buildSnapshotInput({ crop_type: 'agrumes', variety: 'Maltaise' });
      (input.output as any).step2.chill_hours = 200;
      const result = adapter.transform(input);
      expect(result.block_b.phenology_dashboard!.chill).toBeNull();
    });
  });

  // ── Edge cases ──

  describe('edge cases', () => {
    it('handles empty output gracefully', () => {
      const input = buildSnapshotInput({ output: {} });
      const result = adapter.transform(input);
      expect(result.block_a.health_score).toBe(0);
      expect(result.block_a.health_label).toBe('critique');
      expect(result.block_b.vigor.valeur_mediane).toBe(0);
      expect(result.block_d.missing_data.length).toBeGreaterThan(0);
    });

    it('handles null yield potential', () => {
      const input = buildSnapshotInput();
      (input.output as any).step6.yield_potential = {};
      const result = adapter.transform(input);
      expect(result.block_a.yield_range).toBeNull();
    });

    it('handles missing inputs gracefully for block_d', () => {
      const input = buildSnapshotInput({ inputs: undefined });
      const result = adapter.transform(input);
      // All 4 data types should be missing
      expect(result.block_d.missing_data).toHaveLength(4);
    });
  });
});
