import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PassThrough, Readable } from 'stream';
import { DatabaseService } from '../database/database.service';
import {
  createMockDatabaseService,
  createMockQueryBuilder,
  createMockSupabaseClient,
  mockQueryResult,
  MockDatabaseService,
  MockSupabaseClient,
  setupThenableMock,
} from '../../../test/helpers/mock-database.helper';
import {
  CalibrationReviewAdapter,
  CalibrationSnapshotInput,
} from './calibration-review.adapter';
import {
  CalibrationExportData,
  CalibrationExportService,
} from './calibration-export.service';

const buildSnapshotInput = (): CalibrationSnapshotInput => ({
  calibration_id: 'calibration-001',
  parcel_id: 'parcel-001',
  generated_at: '2026-03-10T12:00:00.000Z',
  output: {
    maturity_phase: 'flowering',
    confidence: {
      total_score: 88,
      normalized_score: 0.88,
      components: {
        temporal: { score: 44, max_score: 50 },
      },
    },
    metadata: { data_quality_flags: ['stable_reference'] },
    step1: {
      filtered_image_count: 1,
      cloud_coverage_mean: 11,
      outlier_count: 0,
      interpolated_dates: [],
      index_time_series: {
        NIRv: [{ date: '2026-02-01', value: 0.41, outlier: false }],
        NDVI: [{ date: '2026-02-01', value: 0.56, outlier: false }],
        NDMI: [{ date: '2026-02-01', value: 0.2, outlier: false }],
        NDRE: [{ date: '2026-02-01', value: 0.23, outlier: false }],
        EVI: [{ date: '2026-02-01', value: 0.31, outlier: false }],
        GCI: [{ date: '2026-02-01', value: 1.18, outlier: false }],
      },
    },
    step2: {
      cumulative_gdd: { '2026-02': 120 },
      chill_hours: 12,
      daily_weather: [{ date: '2026-02-01', temp_min: 9, temp_max: 21, precip: 0.5, et0: 2.1 }],
      monthly_aggregates: [{ month: '2026-02', precipitation_total: 20, gdd_total: 120 }],
      extreme_events: [{ date: '2026-02-15', event_type: 'heatwave', severity: 'high' }],
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
      inter_annual_variability_days: { peak: 2 },
    },
    step5: {
      anomalies: [
        {
          date: '2026-02-19',
          anomaly_type: 'sudden_drop',
          severity: 'medium',
          index_name: 'NDVI',
          value: 0.45,
          previous_value: 0.53,
          deviation: -0.08,
          weather_reference: 'none',
          excluded_from_reference: false,
        },
      ],
    },
    step6: {
      alternance: { detected: false, current_year_type: 'off', confidence: 0.66 },
    },
    step7: {
      zone_summary: [{ class_name: 'B', surface_percent: 40 }],
    },
    step8: {
      health_score: {
        components: {
          vigor: 80,
          temporal_stability: 79,
          stability: 78,
          hydric: 77,
          nutritional: 76,
        },
      },
    },
  },
  inputs: { source: 'unit-test' },
  confidence_score: 0.88,
  status: 'completed',
  parcel_phase: 'flowering',
  organization_id: 'org-001',
  calibration_history: [
    {
      id: 'cal-000',
      date: '2026-01-01T00:00:00.000Z',
      health_score: 75,
      confidence_score: 0.71,
      maturity_phase: 'dormancy_exit',
      status: 'completed',
    },
  ],
});

const reviewFixture = new CalibrationReviewAdapter().transform(buildSnapshotInput());

const buildExportData = (): CalibrationExportData => ({
  calibration: {
    id: 'calibration-001',
    parcel_id: 'parcel-001',
    organization_id: 'org-001',
    status: 'completed',
    created_at: '2026-03-01T00:00:00.000Z',
    updated_at: '2026-03-10T12:00:00.000Z',
    completed_at: '2026-03-10T12:00:00.000Z',
    confidence_score: 0.88,
    phenology_stage: 'flowering',
  },
  inputs: { source: 'unit-test' },
  output: buildSnapshotInput().output,
  review: reviewFixture,
});

describe('CalibrationExportService', () => {
  let service: CalibrationExportService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: MockDatabaseService;
  let mockReviewAdapter: { transform: jest.Mock };

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = createMockDatabaseService(mockClient);
    mockReviewAdapter = {
      transform: jest.fn().mockReturnValue(reviewFixture),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalibrationExportService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: CalibrationReviewAdapter, useValue: mockReviewAdapter },
      ],
    }).compile();

    service = module.get<CalibrationExportService>(CalibrationExportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getExportData() with valid org returns CalibrationExportData', async () => {
    const calibrationQuery = createMockQueryBuilder();
    calibrationQuery.maybeSingle.mockResolvedValue(
      mockQueryResult({
        id: 'calibration-001',
        parcel_id: 'parcel-001',
        organization_id: 'org-001',
        status: 'completed',
        confidence_score: 0.88,
        phenology_stage: 'flowering',
        calibration_data: {
          inputs: { source: 'unit-test' },
          output: buildSnapshotInput().output,
        },
        created_at: '2026-03-01T00:00:00.000Z',
        updated_at: '2026-03-10T12:00:00.000Z',
        completed_at: '2026-03-10T12:00:00.000Z',
      }),
    );

    const historyQuery = createMockQueryBuilder();
    setupThenableMock(historyQuery, [
      {
        id: 'cal-000',
        status: 'completed',
        health_score: 75,
        confidence_score: 0.71,
        maturity_phase: 'dormancy_exit',
        created_at: '2026-01-01T00:00:00.000Z',
        completed_at: '2026-01-15T00:00:00.000Z',
      },
    ]);

    let calibrationCallCount = 0;
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'calibrations') {
        calibrationCallCount += 1;
        return calibrationCallCount === 1 ? calibrationQuery : historyQuery;
      }
      return createMockQueryBuilder();
    });

    const result = await service.getExportData('calibration-001', 'org-001');

    expect(result.calibration.id).toBe('calibration-001');
    expect(result.calibration.organization_id).toBe('org-001');
    expect(result.review).toEqual(reviewFixture);
    expect(calibrationQuery.eq).toHaveBeenCalledWith('organization_id', 'org-001');
    expect(mockReviewAdapter.transform).toHaveBeenCalledWith(
      expect.objectContaining({
        calibration_id: 'calibration-001',
        organization_id: 'org-001',
      }),
    );
  });

  it('getExportData() with wrong org throws NotFoundException', async () => {
    const calibrationQuery = createMockQueryBuilder();
    calibrationQuery.maybeSingle.mockResolvedValue(mockQueryResult(null));

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'calibrations') {
        return calibrationQuery;
      }
      return createMockQueryBuilder();
    });

    await expect(service.getExportData('calibration-001', 'org-999')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('generateJsonExport() returns { output, review, meta }', () => {
    const data = buildExportData();

    const result = service.generateJsonExport(data);

    expect(result).toEqual(
      expect.objectContaining({
        output: data.output,
        review: data.review,
        meta: expect.objectContaining({
          calibration_id: data.calibration.id,
          parcel_id: data.calibration.parcel_id,
          organization_id: data.calibration.organization_id,
        }),
      }),
    );
  });

  it('generateCsvExport() returns CSV with metric,value header', () => {
    const data = buildExportData();

    const csv = service.generateCsvExport(data);

    expect(csv.split('\n')[0]).toBe('metric,value');
    expect(csv).toContain('calibration_id,calibration-001');
  });

  it('generateZipExport() returns a Readable stream backed by PassThrough', () => {
    const data = buildExportData();

    const stream = service.generateZipExport(data);

    expect(stream).toBeInstanceOf(Readable);
    expect(stream).toBeInstanceOf(PassThrough);
  });
});
