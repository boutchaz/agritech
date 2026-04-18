import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MonitoringCronService } from './monitoring-cron.service';
import { DatabaseService } from '../database/database.service';
import { SatelliteCacheService } from './satellite-cache.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  createMockDatabaseService,
  createMockQueryBuilder,
  createMockSupabaseClient,
  MockDatabaseService,
  MockSupabaseClient,
} from '../../../test/helpers/mock-database.helper';

describe('MonitoringCronService — delta sync', () => {
  let service: MonitoringCronService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: MockDatabaseService;

  const mockCacheService = {
    syncParcelSatelliteData: jest.fn().mockResolvedValue({ totalPoints: 5 }),
    getParcelSyncStartDate: jest.fn().mockResolvedValue('2026-03-29'),
  };

  const mockNotificationsService = {
    sendOperationalEmailToManagementRoles: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'CALIBRATION_SATELLITE_CRON_EMAIL') return 'true';
      if (key === 'FRONTEND_URL') return 'https://app.example.test';
      return undefined;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDatabaseService = createMockDatabaseService();
    mockClient = createMockSupabaseClient();
    mockDatabaseService.getAdminClient.mockReturnValue(mockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringCronService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: SatelliteCacheService, useValue: mockCacheService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<MonitoringCronService>(MonitoringCronService);
  });

  const TODAY = new Date().toISOString().split('T')[0];

  function mockParcelsQuery(parcels: any[]) {
    const queryBuilder = createMockQueryBuilder();
    mockClient.from.mockReturnValue(queryBuilder);

    queryBuilder.not.mockImplementation(() => {
      return {
        ...queryBuilder,
        then: (resolve: Function) => {
          resolve({ data: parcels, error: null });
          return Promise.resolve();
        },
      };
    });
  }

  it('selects planting_year from parcels', async () => {
    const queryBuilder = createMockQueryBuilder();
    mockClient.from.mockReturnValue(queryBuilder);

    queryBuilder.not.mockImplementation(() => {
      return {
        ...queryBuilder,
        then: (resolve: Function) => {
          resolve({ data: [], error: null });
          return Promise.resolve();
        },
      };
    });

    await service.runMonitoringCycle();

    expect(queryBuilder.select).toHaveBeenCalled();
    const selectArg = queryBuilder.select.mock.calls[0][0];
    expect(selectArg).toContain('planting_year');
  });

  it('calls getParcelSyncStartDate and syncParcelSatelliteData with delta range', async () => {
    mockParcelsQuery([{
      id: 'parcel-1',
      organization_id: 'org-1',
      farm_id: 'farm-1',
      crop_type: 'olives',
      ai_phase: 'active',
      planting_year: 2021,
    }]);

    mockCacheService.getParcelSyncStartDate.mockResolvedValue('2026-03-29');

    await service.runMonitoringCycle();

    // Should call getParcelSyncStartDate with planting_year
    expect(mockCacheService.getParcelSyncStartDate).toHaveBeenCalledWith(
      'parcel-1',
      'org-1',
      2021,
      'olives',
    );

    // Should call syncParcelSatelliteData with delta range, NOT the fixed 10-day range
    expect(mockCacheService.syncParcelSatelliteData).toHaveBeenCalledWith(
      'parcel-1',
      'org-1',
      'farm-1',
      expect.objectContaining({
        startDate: '2026-03-29',
        endDate: TODAY,
      }),
    );

    expect(
      mockNotificationsService.sendOperationalEmailToManagementRoles,
    ).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({
        subject: expect.stringContaining('Synchronisation satellite'),
        html: expect.stringContaining('synchronisées'),
      }),
      expect.any(Array),
    );
  });

  it('does NOT use fixed 10-day lookback', async () => {
    mockParcelsQuery([{
      id: 'parcel-1',
      organization_id: 'org-1',
      farm_id: 'farm-1',
      crop_type: 'olives',
      ai_phase: 'active',
      planting_year: null,
    }]);

    mockCacheService.getParcelSyncStartDate.mockResolvedValue('2026-03-29');

    await service.runMonitoringCycle();

    // The startDate in the sync call should come from getParcelSyncStartDate,
    // not from a fixed "today - 10 days" calculation
    const syncCall = mockCacheService.syncParcelSatelliteData.mock.calls[0];
    const options = syncCall[3];
    expect(options.startDate).toBe('2026-03-29');

    // Fixed 10-day lookback would be around 2026-03-21
    expect(options.startDate).not.toBe(
      new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
    );
  });
});
