import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CalibrationService } from './calibration.service';
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
import { agromindCalibrationFixture } from './fixtures/test-fixture';

describe('CalibrationService', () => {
  let service: CalibrationService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: MockDatabaseService;

  const organizationId = 'org-001';
  const parcelId = agromindCalibrationFixture.parcel.id;
  const parcelBoundary = [
    [-7.1, 31.7],
    [-7.1, 31.8],
    [-7.0, 31.8],
    [-7.0, 31.7],
    [-7.1, 31.7],
  ];

  beforeEach(async () => {
    process.env.SATELLITE_SERVICE_URL = 'http://satellite-service.test';
    mockClient = createMockSupabaseClient();
    mockDatabaseService = createMockDatabaseService(mockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalibrationService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<CalibrationService>(CalibrationService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    delete process.env.SATELLITE_SERVICE_URL;
  });

  it('startCalibration persists the completed calibration and links it to the parcel', async () => {
    const parcelQuery = createMockQueryBuilder();
    parcelQuery.select.mockReturnValue(parcelQuery);
    parcelQuery.eq.mockReturnValue(parcelQuery);
    parcelQuery.single.mockResolvedValue(
      mockQueryResult({
        id: parcelId,
        crop_type: agromindCalibrationFixture.parcel.crop_type,
        system: agromindCalibrationFixture.parcel.system,
        boundary: parcelBoundary,
        farms: { organization_id: organizationId },
      }),
    );

    const satelliteRows = agromindCalibrationFixture.satellite_readings.flatMap((reading) => [
      { date: reading.date, index_name: 'NDVI', mean_value: reading.ndvi },
      { date: reading.date, index_name: 'NDRE', mean_value: reading.ndre },
      { date: reading.date, index_name: 'NDMI', mean_value: reading.ndmi },
      { date: reading.date, index_name: 'GCI', mean_value: reading.gci },
      { date: reading.date, index_name: 'EVI', mean_value: reading.evi },
      { date: reading.date, index_name: 'SAVI', mean_value: reading.savi },
    ]);
    const satelliteQuery = createMockQueryBuilder();
    satelliteQuery.select.mockReturnValue(satelliteQuery);
    satelliteQuery.eq.mockReturnValue(satelliteQuery);
    satelliteQuery.in.mockReturnValue(satelliteQuery);
    satelliteQuery.gte.mockReturnValue(satelliteQuery);
    satelliteQuery.order.mockReturnValue(satelliteQuery);
    setupThenableMock(satelliteQuery, satelliteRows);

    const weatherQuery = createMockQueryBuilder();
    weatherQuery.select.mockReturnValue(weatherQuery);
    weatherQuery.eq.mockReturnValue(weatherQuery);
    weatherQuery.gte.mockReturnValue(weatherQuery);
    weatherQuery.order.mockReturnValue(weatherQuery);
    setupThenableMock(
      weatherQuery,
      agromindCalibrationFixture.weather_readings.map((reading) => ({
        date: reading.date,
        temperature_min: reading.temp_min,
        temperature_max: reading.temp_max,
        precipitation_sum: reading.precip,
        et0_fao_evapotranspiration: reading.et0,
      })),
    );

    const cropReferenceQuery = createMockQueryBuilder();
    cropReferenceQuery.select.mockReturnValue(cropReferenceQuery);
    cropReferenceQuery.eq.mockReturnValue(cropReferenceQuery);
    cropReferenceQuery.maybeSingle.mockResolvedValue(
      mockQueryResult({
        reference_data: {
          seuils_satellite: {
            intensif: {
              NDVI: agromindCalibrationFixture.ndvi_thresholds,
            },
          },
        },
      }),
    );

    const insertedCalibration = {
      id: 'calibration-001',
      parcel_id: parcelId,
      organization_id: organizationId,
      status: 'completed',
      started_at: '2026-03-12T09:00:00.000Z',
      completed_at: '2026-03-12T09:00:01.000Z',
      baseline_ndvi: 0.55,
      baseline_ndre: 0.21,
      baseline_ndmi: 0.17,
      confidence_score: agromindCalibrationFixture.expected_output.confidence_score,
      zone_classification: agromindCalibrationFixture.expected_output.zone_classification,
      phenology_stage: agromindCalibrationFixture.expected_output.phenology_stage,
      calibration_data: {},
      error_message: null,
      created_at: '2026-03-12T09:00:01.000Z',
      updated_at: '2026-03-12T09:00:01.000Z',
    };
    const calibrationInsertQuery = createMockQueryBuilder();
    calibrationInsertQuery.insert.mockReturnValue(calibrationInsertQuery);
    calibrationInsertQuery.select.mockReturnValue(calibrationInsertQuery);
    calibrationInsertQuery.single.mockResolvedValue(mockQueryResult(insertedCalibration));

    const parcelUpdateQuery = createMockQueryBuilder();
    parcelUpdateQuery.update.mockReturnValue(parcelUpdateQuery);
    parcelUpdateQuery.eq.mockReturnValue(parcelUpdateQuery);
    setupThenableMock(parcelUpdateQuery, null);

    let parcelReads = 0;
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'parcels') {
        parcelReads += 1;
        return parcelReads === 1 ? parcelQuery : parcelUpdateQuery;
      }
      if (table === 'satellite_indices_data') return satelliteQuery;
      if (table === 'weather_daily_data') return weatherQuery;
      if (table === 'crop_ai_references') return cropReferenceQuery;
      if (table === 'calibrations') return calibrationInsertQuery;
      return createMockQueryBuilder();
    });

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          baseline_ndvi: 0.55,
          baseline_ndre: 0.21,
          baseline_ndmi: 0.17,
          confidence_score: 0.82,
          zone_classification: 'normal',
          phenology_stage: 'repos_vegetatif',
          anomaly_count: 0,
          processing_time_ms: 11,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const result = await service.startCalibration(parcelId, organizationId, {});

    expect(result).toEqual(insertedCalibration);
    expect(mockDatabaseService.getAdminClient).toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://satellite-service.test/api/calibration/run',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-organization-id': organizationId,
        }),
      }),
    );

    const requestBody = fetchSpy.mock.calls[0]?.[1]?.body;
    expect(typeof requestBody).toBe('string');
    if (typeof requestBody !== 'string') {
      throw new Error('Calibration request body should be a string');
    }

    const parsedRequestBody = JSON.parse(requestBody) as Record<string, unknown>;
    expect(parsedRequestBody.crop_type).toBe(agromindCalibrationFixture.parcel.crop_type);
    expect(parsedRequestBody.system).toBe(agromindCalibrationFixture.parcel.system);
    expect(parsedRequestBody.satellite_readings).toHaveLength(
      agromindCalibrationFixture.satellite_readings.length,
    );
    expect(parsedRequestBody.weather_readings).toHaveLength(
      agromindCalibrationFixture.weather_readings.length,
    );
    expect(parcelUpdateQuery.update).toHaveBeenCalledWith({
      ai_calibration_id: insertedCalibration.id,
    });
  });

  it('startCalibration throws NotFoundException when the parcel does not exist', async () => {
    const parcelQuery = createMockQueryBuilder();
    parcelQuery.select.mockReturnValue(parcelQuery);
    parcelQuery.eq.mockReturnValue(parcelQuery);
    parcelQuery.single.mockResolvedValue(mockQueryResult(null, { message: 'Parcel not found' }));
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'parcels') return parcelQuery;
      return createMockQueryBuilder();
    });

    await expect(service.startCalibration(parcelId, organizationId, {})).rejects.toThrow(
      NotFoundException,
    );
  });

  it('getLatestCalibration returns null when no calibrations exist for the parcel', async () => {
    const calibrationQuery = createMockQueryBuilder();
    calibrationQuery.select.mockReturnValue(calibrationQuery);
    calibrationQuery.eq.mockReturnValue(calibrationQuery);
    calibrationQuery.order.mockReturnValue(calibrationQuery);
    calibrationQuery.limit.mockReturnValue(calibrationQuery);
    calibrationQuery.maybeSingle.mockResolvedValue(mockQueryResult(null));

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'calibrations') return calibrationQuery;
      return createMockQueryBuilder();
    });

    await expect(service.getLatestCalibration(parcelId, organizationId)).resolves.toBeNull();
  });
});
