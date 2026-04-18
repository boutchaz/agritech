import { Test, TestingModule } from '@nestjs/testing';
import { SatelliteSyncService } from './satellite-sync.service';
import { DatabaseService } from '../database/database.service';
import { SatelliteCacheService } from './satellite-cache.service';
import {
  createMockDatabaseService,
  createMockQueryBuilder,
  createMockSupabaseClient,
  MockDatabaseService,
  MockSupabaseClient,
} from '../../../test/helpers/mock-database.helper';

describe('SatelliteSyncService — delta sync', () => {
  let service: SatelliteSyncService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: MockDatabaseService;

  const mockCacheService = {
    getTimeSeries: jest.fn(),
    getHeatmap: jest.fn(),
    getAvailableDates: jest.fn(),
    syncParcelSatelliteData: jest.fn().mockResolvedValue({ totalPoints: 5 }),
    getParcelSyncStartDate: jest.fn().mockResolvedValue('2026-03-29'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDatabaseService = createMockDatabaseService();
    mockClient = createMockSupabaseClient();
    mockDatabaseService.getAdminClient.mockReturnValue(mockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SatelliteSyncService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: SatelliteCacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<SatelliteSyncService>(SatelliteSyncService);
  });

  const TODAY = new Date().toISOString().split('T')[0];

  it('selects planting_year from parcels', async () => {
    // Mock parcels query to return one parcel with planting_year
    const queryBuilder = createMockQueryBuilder();
    mockClient.from.mockReturnValue(queryBuilder);

    // Make the query chain resolve with a parcel that has planting_year
    queryBuilder.not.mockImplementation(() => {
      return {
        ...queryBuilder,
        then: (resolve: Function) => {
          resolve({
            data: [{
              id: 'parcel-1',
              name: 'Test Parcel',
              boundary: [[-7.6, 32.9], [-7.6, 32.8], [-7.5, 32.8], [-7.6, 32.9]],
              farm_id: 'farm-1',
              organization_id: 'org-1',
              planting_year: 2022,
              crop_type: 'olivier',
            }],
            error: null,
          });
          return Promise.resolve();
        },
      };
    });

    // Mock getAvailableDates for heatmap sync
    mockCacheService.getAvailableDates.mockResolvedValue({ available_dates: [] });

    await service.runFullSync();

    // Verify planting_year is in the select
    expect(queryBuilder.select).toHaveBeenCalled();
    const selectArg = queryBuilder.select.mock.calls[0][0];
    expect(selectArg).toContain('planting_year');
    expect(selectArg).toContain('crop_type');
  });

  it('calls syncParcelSatelliteData with delta date range from getParcelSyncStartDate', async () => {
    const queryBuilder = createMockQueryBuilder();
    mockClient.from.mockReturnValue(queryBuilder);

    queryBuilder.not.mockImplementation(() => {
      return {
        ...queryBuilder,
        then: (resolve: Function) => {
          resolve({
            data: [{
              id: 'parcel-1',
              name: 'Test Parcel',
              boundary: [[-7.6, 32.9], [-7.6, 32.8], [-7.5, 32.8], [-7.6, 32.9]],
              farm_id: 'farm-1',
              organization_id: 'org-1',
              planting_year: 2020,
              crop_type: 'olivier',
            }],
            error: null,
          });
          return Promise.resolve();
        },
      };
    });

    mockCacheService.getAvailableDates.mockResolvedValue({ available_dates: [] });
    mockCacheService.getParcelSyncStartDate.mockResolvedValue('2026-03-29');

    await service.runFullSync();

    // Should call getParcelSyncStartDate with parcel info
    expect(mockCacheService.getParcelSyncStartDate).toHaveBeenCalledWith(
      'parcel-1',
      'org-1',
      2020,
      'olivier',
    );

    // Should call syncParcelSatelliteData with delta range
    expect(mockCacheService.syncParcelSatelliteData).toHaveBeenCalledWith(
      'parcel-1',
      'org-1',
      'farm-1',
      expect.objectContaining({
        startDate: '2026-03-29',
        endDate: TODAY,
      }),
    );
  });

  it('does NOT call the old getTimeSeries method', async () => {
    const queryBuilder = createMockQueryBuilder();
    mockClient.from.mockReturnValue(queryBuilder);

    queryBuilder.not.mockImplementation(() => {
      return {
        ...queryBuilder,
        then: (resolve: Function) => {
          resolve({
            data: [{
              id: 'parcel-1',
              name: 'Test Parcel',
              boundary: [[-7.6, 32.9], [-7.6, 32.8], [-7.5, 32.8], [-7.6, 32.9]],
              farm_id: 'farm-1',
              organization_id: 'org-1',
              planting_year: null,
              crop_type: null,
            }],
            error: null,
          });
          return Promise.resolve();
        },
      };
    });

    mockCacheService.getAvailableDates.mockResolvedValue({ available_dates: [] });

    await service.runFullSync();

    // Should NOT use the cache-hitting getTimeSeries
    expect(mockCacheService.getTimeSeries).not.toHaveBeenCalled();
  });
});
