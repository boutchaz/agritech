import { Test, TestingModule } from '@nestjs/testing';
import { AnnualRecalibrationService } from './annual-recalibration.service';
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

const mockCalibrationService = {
  startCalibration: jest.fn(),
};

describe('AnnualRecalibrationService', () => {
  let service: AnnualRecalibrationService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: MockDatabaseService;

  const organizationId = 'org-001';
  const parcelId = 'parcel-001';

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = createMockDatabaseService(mockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnualRecalibrationService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: CalibrationService, useValue: mockCalibrationService },
      ],
    }).compile();

    service = module.get<AnnualRecalibrationService>(AnnualRecalibrationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('saveMissingTaskReview preserves unrelated annual trigger config keys', async () => {
    const parcelLookupQuery = createMockQueryBuilder();
    parcelLookupQuery.select.mockReturnValue(parcelLookupQuery);
    parcelLookupQuery.eq.mockReturnValue(parcelLookupQuery);
    parcelLookupQuery.maybeSingle.mockResolvedValue(
      mockQueryResult({
        id: parcelId,
        crop_type: 'olivier',
        ai_phase: 'active',
        annual_trigger_config: {
          month: 2,
          day: 15,
          custom_flag: true,
          nested: { keep: 'value' },
        },
      }),
    );

    const parcelUpdateQuery = createMockQueryBuilder();
    parcelUpdateQuery.update.mockReturnValue(parcelUpdateQuery);
    parcelUpdateQuery.eq.mockReturnValue(parcelUpdateQuery);
    setupThenableMock(parcelUpdateQuery, null);

    let parcelCalls = 0;
    mockClient.from.mockImplementation((table: string) => {
      if (table !== 'parcels') {
        return createMockQueryBuilder();
      }

      parcelCalls += 1;
      return parcelCalls === 1 ? parcelLookupQuery : parcelUpdateQuery;
    });

    const result = await service.saveMissingTaskReview(parcelId, organizationId, [
      { task_id: 'task-001', resolution: 'unconfirmed' },
    ]);

    expect(result.resolutions).toEqual([
      { task_id: 'task-001', resolution: 'unconfirmed' },
    ]);
    expect(parcelUpdateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        annual_trigger_config: expect.objectContaining({
          month: 2,
          day: 15,
          custom_flag: true,
          nested: { keep: 'value' },
          missing_task_review: expect.objectContaining({
            reviewed_at: expect.any(String),
            resolutions: [{ task_id: 'task-001', resolution: 'unconfirmed' }],
          }),
        }),
      }),
    );
  });

  it('snoozeAnnualReminder preserves unrelated annual trigger config keys', async () => {
    const parcelLookupQuery = createMockQueryBuilder();
    parcelLookupQuery.select.mockReturnValue(parcelLookupQuery);
    parcelLookupQuery.eq.mockReturnValue(parcelLookupQuery);
    parcelLookupQuery.maybeSingle.mockResolvedValue(
      mockQueryResult({
        id: parcelId,
        crop_type: 'olivier',
        ai_phase: 'active',
        annual_trigger_config: {
          month: 1,
          day: 20,
          custom_window: 'post-harvest',
        },
      }),
    );

    const parcelUpdateQuery = createMockQueryBuilder();
    parcelUpdateQuery.update.mockReturnValue(parcelUpdateQuery);
    parcelUpdateQuery.eq.mockReturnValue(parcelUpdateQuery);
    setupThenableMock(parcelUpdateQuery, null);

    let parcelCalls = 0;
    mockClient.from.mockImplementation((table: string) => {
      if (table !== 'parcels') {
        return createMockQueryBuilder();
      }

      parcelCalls += 1;
      return parcelCalls === 1 ? parcelLookupQuery : parcelUpdateQuery;
    });

    const result = await service.snoozeAnnualReminder(parcelId, organizationId, 10);

    expect(result.snoozed_until).toEqual(expect.any(String));
    expect(parcelUpdateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        annual_trigger_config: expect.objectContaining({
          month: 1,
          day: 20,
          custom_window: 'post-harvest',
          snoozed_until: expect.any(String),
        }),
      }),
    );
  });
});
