import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { CalibrationStateMachine, AiPhase } from './calibration-state-machine';
import {
  createMockDatabaseService,
  createMockQueryBuilder,
  createMockSupabaseClient,
  setupThenableMock,
} from '../../../test/helpers/mock-database.helper';

describe('CalibrationStateMachine — V2 lifecycle', () => {
  let service: CalibrationStateMachine;
  const parcelId = 'parcel-001';
  const organizationId = 'org-001';

  beforeEach(async () => {
    const mockClient = createMockSupabaseClient();
    const mockDatabaseService = createMockDatabaseService(mockClient);

    const parcelUpdateQuery = createMockQueryBuilder();
    parcelUpdateQuery.update.mockReturnValue(parcelUpdateQuery);
    parcelUpdateQuery.eq.mockReturnValue(parcelUpdateQuery);
    setupThenableMock(parcelUpdateQuery, [{ id: parcelId }]);

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'parcels') return parcelUpdateQuery;
      return createMockQueryBuilder();
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalibrationStateMachine,
        { provide: DatabaseService, useValue: mockDatabaseService },
        {
          provide: NotificationsGateway,
          useValue: { emitToOrganization: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<CalibrationStateMachine>(CalibrationStateMachine);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('V2 valid transitions', () => {
    const validTransitions: Array<[AiPhase, AiPhase]> = [
      // Happy path
      ['awaiting_data', 'ready_calibration'],
      ['ready_calibration', 'calibrating'],
      ['calibrating', 'calibrated'],
      ['calibrated', 'awaiting_nutrition_option'],
      ['awaiting_nutrition_option', 'active'],
      // Recalibration loop from active
      ['active', 'calibrating'],
      // Archive
      ['active', 'archived'],
      // Recovery / fallback
      ['calibrating', 'ready_calibration'],
      ['calibrating', 'awaiting_data'],
      ['calibrated', 'calibrating'],
    ];

    it.each(validTransitions)(
      'allows transition %s → %s',
      async (from, to) => {
        await expect(
          service.transitionPhase(parcelId, from, to, organizationId),
        ).resolves.toBeUndefined();
      },
    );
  });

  describe('V2 invalid transitions', () => {
    const invalidTransitions: Array<[AiPhase, AiPhase]> = [
      ['awaiting_data', 'active'],
      ['awaiting_data', 'calibrated'],
      ['ready_calibration', 'active'],
      ['calibrated', 'active'],  // must go through awaiting_nutrition_option
      ['awaiting_nutrition_option', 'calibrated'],
    ];

    it.each(invalidTransitions)(
      'rejects transition %s → %s',
      async (from, to) => {
        await expect(
          service.transitionPhase(parcelId, from, to, organizationId),
        ).rejects.toThrow(BadRequestException);
      },
    );
  });

  describe('old V1 states are NOT valid', () => {
    it('rejects disabled as a state', async () => {
      await expect(
        service.transitionPhase(parcelId, 'disabled' as AiPhase, 'calibrating' as AiPhase, organizationId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('boundary change reset', () => {
    it('resets to awaiting_data when boundary changes on active parcel', async () => {
      const changed = await service.resetToAwaitingDataOnBoundaryChange(
        parcelId,
        organizationId,
        'active',
        [[-7.1, 31.7], [-7.0, 31.8]],
        [[-7.2, 31.7], [-7.0, 31.8]],
      );
      expect(changed).toBe(true);
    });

    it('does not reset when already awaiting_data', async () => {
      const changed = await service.resetToAwaitingDataOnBoundaryChange(
        parcelId,
        organizationId,
        'awaiting_data',
        [[-7.1, 31.7]],
        [[-7.2, 31.7]],
      );
      expect(changed).toBe(false);
    });

    it('does not reset when boundary is unchanged', async () => {
      const boundary = [[-7.1, 31.7], [-7.0, 31.8]];
      const changed = await service.resetToAwaitingDataOnBoundaryChange(
        parcelId,
        organizationId,
        'active',
        boundary,
        boundary,
      );
      expect(changed).toBe(false);
    });
  });
});
