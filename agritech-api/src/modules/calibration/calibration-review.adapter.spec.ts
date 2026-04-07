import { Test, TestingModule } from '@nestjs/testing';
import {
  CalibrationReviewAdapter,
  CalibrationSnapshotInput,
} from './calibration-review.adapter';

const buildSnapshotInput = (
  overrides: Partial<CalibrationSnapshotInput> = {},
): CalibrationSnapshotInput => ({
  calibration_id: 'calibration-001',
  parcel_id: 'parcel-001',
  generated_at: '2026-03-10T12:00:00.000Z',
  confidence_score: 0.82,
  status: 'completed',
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
    {
      id: 'cal-2',
      date: '2026-02-10T12:00:00.000Z',
      health_score: 80,
      confidence_score: 0.76,
      phase_age: 'flowering',
      status: 'completed',
    },
  ],
  output: {
    phase_age: 'flowering',
    confidence: {
      total_score: 86,
      normalized_score: 0.86,
      components: {
        temporal: { score: 40, max_score: 50 },
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
        NIRv: [{ date: '2026-02-01', value: 0.42, outlier: false }],
        NDVI: [{ date: '2026-02-01', value: 0.55, outlier: false }],
        NDMI: [{ date: '2026-02-01', value: 0.19, outlier: false }],
        NDRE: [{ date: '2026-02-01', value: 0.24, outlier: false }],
        EVI: [{ date: '2026-02-01', value: 0.36, outlier: false }],
        GCI: [{ date: '2026-02-01', value: 1.21, outlier: false }],
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
        NDVI: { p10: 0.2, p25: 0.3, p50: 0.5, p75: 0.6, p90: 0.7, mean: 0.5, std: 0.1 },
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
      inter_annual_variability_days: { peak: 3 },
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
      alternance: {
        detected: true,
        current_year_type: 'on',
        confidence: 0.7,
      },
    },
    step7: {
      zone_summary: [{ class_name: 'A', surface_percent: 65 }],
    },
    step8: {
      health_score: {
        components: {
          vigor: 81,
          temporal_stability: 78,
          stability: 76,
          hydric: 74,
          nutritional: 73,
        },
      },
    },
  },
  ...overrides,
});

describe('CalibrationReviewAdapter', () => {
  let adapter: CalibrationReviewAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CalibrationReviewAdapter],
    }).compile();

    adapter = module.get<CalibrationReviewAdapter>(CalibrationReviewAdapter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('transform() maps step4.yearly_stages onto level4 phenology_timeline', () => {
    const result = adapter.transform(buildSnapshotInput());
    expect(result.level4_temporal.phenology_timeline.yearly_stages?.['2026']).toEqual({
      dormancy_exit: '2026-01-15',
      peak: '2026-02-20',
      plateau_start: '2026-03-20',
      decline_start: '2026-07-01',
      dormancy_entry: '2026-10-01',
    });
  });

  it('transform() passes through planting_year from snapshot input', () => {
    const result = adapter.transform(
      buildSnapshotInput({ planting_year: 2019 }),
    );
    expect(result.planting_year).toBe(2019);
  });

  it('transform() with valid step1-8 output returns review view with all levels populated', () => {
    const input = buildSnapshotInput();

    const result = adapter.transform(input);

    expect(result.calibration_id).toBe(input.calibration_id);
    expect(result.output).toEqual(input.output);
    expect(result.level1_decision).toBeDefined();
    expect(result.level2_diagnostic).toBeDefined();
    expect(result.level3_biophysical).toBeDefined();
    expect(result.level4_temporal).toBeDefined();
    expect(result.level5_quality_audit).toBeDefined();
    expect(result.export.available_formats).toEqual(['json', 'csv', 'zip']);
  });

  it('level1_decision.detected_signals merges anomalies + extreme_events with correct sources', () => {
    const result = adapter.transform(buildSnapshotInput());

    expect(result.level1_decision.detected_signals).toHaveLength(2);
    expect(result.level1_decision.detected_signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'anomaly' }),
        expect.objectContaining({ source: 'extreme_event' }),
      ]),
    );
    expect(
      result.level1_decision.detected_signals.some(
        (signal) => String(signal.source) === 'recommendation',
      ),
    ).toBe(false);
  });

  it('level1_decision.operational_alerts is always null', () => {
    const result = adapter.transform(buildSnapshotInput());
    expect(result.level1_decision.operational_alerts).toBeNull();
  });

  it('level2_diagnostic.signal_state is NON_DISPONIBLE', () => {
    const result = adapter.transform(buildSnapshotInput());
    expect(result.level2_diagnostic.signal_state).toBe('NON_DISPONIBLE');
  });

  it('level2_diagnostic.mode is AMORCAGE when history < 3 and NORMAL otherwise', () => {
    const amorcage = adapter.transform(
      buildSnapshotInput({
        calibration_history: [
          {
            id: 'h1',
            date: '2026-01-01T12:00:00.000Z',
            health_score: 70,
            confidence_score: 0.6,
            phase_age: 'dormancy_exit',
            status: 'completed',
          },
          {
            id: 'h2',
            date: '2026-02-01T12:00:00.000Z',
            health_score: 71,
            confidence_score: 0.61,
            phase_age: 'flowering',
            status: 'completed',
          },
        ],
      }),
    );

    const normal = adapter.transform(
      buildSnapshotInput({
        calibration_history: [
          {
            id: 'h1',
            date: '2026-01-01T12:00:00.000Z',
            health_score: 70,
            confidence_score: 0.6,
            phase_age: 'dormancy_exit',
            status: 'completed',
          },
          {
            id: 'h2',
            date: '2026-02-01T12:00:00.000Z',
            health_score: 71,
            confidence_score: 0.61,
            phase_age: 'flowering',
            status: 'completed',
          },
          {
            id: 'h3',
            date: '2026-03-01T12:00:00.000Z',
            health_score: 72,
            confidence_score: 0.62,
            phase_age: 'flowering',
            status: 'completed',
          },
        ],
      }),
    );

    expect(amorcage.level2_diagnostic.mode).toBe('AMORCAGE');
    expect(normal.level2_diagnostic.mode).toBe('NORMAL');
  });

  it('level3_biophysical.indices.NIRvP is always null', () => {
    const result = adapter.transform(buildSnapshotInput());
    expect(result.level3_biophysical.indices.NIRvP).toBeNull();
  });

  it('level3_biophysical.gdd exposes both base temperatures', () => {
    const result = adapter.transform(buildSnapshotInput());
    expect(result.level3_biophysical.gdd.base_temperature_used).toBe(10.0);
    expect(result.level3_biophysical.gdd.base_temperature_protocol).toBe(7.5);
  });

  it('level5_quality_audit.excluded_cycles is always empty array', () => {
    const result = adapter.transform(buildSnapshotInput());
    expect(result.level5_quality_audit.excluded_cycles).toEqual([]);
  });

  it('expert_audit rules and protocol compliance include expected partial/not_implemented statuses', () => {
    const result = adapter.transform(buildSnapshotInput());

    const regle11 = result.expert_audit.rules_applied.find((rule) => rule.rule_id === 'REGLE_1_1');
    const regle12 = result.expert_audit.rules_applied.find((rule) => rule.rule_id === 'REGLE_1_2');

    expect(regle11?.status).toBe('partial');
    expect(regle12?.status).toBe('not_implemented');
    expect(result.expert_audit.protocol_compliance.section_1_filtering).toBe('partial');
  });

  it('transform() with empty/minimal output does not throw and returns defaults', () => {
    const input = buildSnapshotInput({
      output: {},
      confidence_score: null,
      calibration_history: [],
    });

    expect(() => adapter.transform(input)).not.toThrow();

    const result = adapter.transform(input);
    expect(result.level1_decision.detected_signals).toEqual([]);
    expect(result.level2_diagnostic.signal_state).toBe('NON_DISPONIBLE');
    expect(result.level3_biophysical.indices.NIRvP).toBeNull();
    expect(result.level5_quality_audit.excluded_cycles).toEqual([]);
  });
});
