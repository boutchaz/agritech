import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { CalibrationStateMachine } from './calibration-state-machine';
import {
  createMockDatabaseService,
  createMockQueryBuilder,
  createMockSupabaseClient,
  setupThenableMock,
} from '../../../test/helpers/mock-database.helper';

describe('CalibrationStateMachine', () => {
  let service: CalibrationStateMachine;
  const parcelId = 'parcel-001';
  const organizationId = 'org-001';

  beforeEach(async () => {
    const mockClient = createMockSupabaseClient();
    const mockDatabaseService = createMockDatabaseService(mockClient);

    const parcelUpdateQuery = createMockQueryBuilder();
    parcelUpdateQuery.update.mockReturnValue(parcelUpdateQuery);
    parcelUpdateQuery.eq.mockReturnValue(parcelUpdateQuery);
    setupThenableMock(parcelUpdateQuery, null);

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'parcels') return parcelUpdateQuery;
      return createMockQueryBuilder();
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalibrationStateMachine,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<CalibrationStateMachine>(CalibrationStateMachine);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('allows all valid transitions', async () => {
    const validTransitions: Array<
      ['disabled' | 'calibrating' | 'awaiting_validation' | 'awaiting_nutrition_option' | 'active' | 'paused',
      'disabled' | 'calibrating' | 'awaiting_validation' | 'awaiting_nutrition_option' | 'active' | 'paused']
    > = [
      ['disabled', 'calibrating'],
      ['calibrating', 'awaiting_validation'],
      ['calibrating', 'disabled'],
      ['awaiting_validation', 'awaiting_nutrition_option'],
      ['awaiting_nutrition_option', 'active'],
      ['active', 'awaiting_nutrition_option'],
      ['active', 'calibrating'],
      ['active', 'disabled'],
      ['paused', 'disabled'],
    ];

    for (const [fromPhase, toPhase] of validTransitions) {
      await expect(
        service.transitionPhase(parcelId, fromPhase, toPhase, organizationId),
      ).resolves.toBeUndefined();
    }
  });

  it('rejects invalid transition disabled -> active', async () => {
    await expect(
      service.transitionPhase(parcelId, 'disabled', 'active', organizationId),
    ).rejects.toThrow(BadRequestException);
  });

  it('resets to disabled when boundary changed and phase is active', async () => {
    const changed = await service.resetToDisabledOnBoundaryChange(
      parcelId,
      organizationId,
      'active',
      [
        [-7.1, 31.7],
        [-7.0, 31.8],
      ],
      [
        [-7.2, 31.7],
        [-7.0, 31.8],
      ],
    );

    expect(changed).toBe(true);
  });
});
