import { Test, TestingModule } from '@nestjs/testing';
import { SatelliteCacheService } from './satellite-cache.service';
import { DatabaseService } from '../database/database.service';
import { SatelliteProxyService } from './satellite-proxy.service';
import {
  createMockDatabaseService,
  createMockQueryBuilder,
  MockDatabaseService,
  MockSupabaseClient,
  createMockSupabaseClient,
} from '../../../test/helpers/mock-database.helper';
import { resolveParcelSyncLookbackStartDate } from './parcel-sync-lookback';

describe('SatelliteCacheService.getParcelSyncStartDate', () => {
  let service: SatelliteCacheService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: MockDatabaseService;

  const mockProxyService = {
    post: jest.fn(),
    get: jest.fn(),
  };

  beforeEach(async () => {
    mockDatabaseService = createMockDatabaseService();
    mockClient = createMockSupabaseClient();
    mockDatabaseService.getAdminClient.mockReturnValue(mockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SatelliteCacheService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: SatelliteProxyService, useValue: mockProxyService },
      ],
    }).compile();

    service = module.get<SatelliteCacheService>(SatelliteCacheService);
  });

  function mockMaxDateResult(date: string | null) {
    const queryBuilder = createMockQueryBuilder();
    mockClient.from.mockReturnValue(queryBuilder);

    const result = date
      ? { data: { date }, error: null }
      : { data: null, error: { message: 'no rows' } };
    queryBuilder.single.mockResolvedValue(result);
  }

  it('returns max_date - 1 day when parcel has existing data', async () => {
    mockMaxDateResult('2026-03-28');

    const result = await service.getParcelSyncStartDate(
      'parcel-1',
      'org-1',
    );

    expect(result).toBe('2026-03-27');
  });

  it('delegates no-data lookback to referential + MAX_LOOKBACK clamp (juvenile)', async () => {
    mockMaxDateResult(null);

    const threeYearsAgo = new Date().getFullYear() - 3;
    const result = await service.getParcelSyncStartDate(
      'parcel-1',
      'org-1',
      threeYearsAgo,
      null,
    );

    expect(result).toBe(
      resolveParcelSyncLookbackStartDate(threeYearsAgo, null),
    );
  });

  it('delegates no-data lookback (entree span [5,10): 24 rolling months, clamped)', async () => {
    mockMaxDateResult(null);

    const sevenYearsAgo = new Date().getFullYear() - 7;
    const result = await service.getParcelSyncStartDate(
      'parcel-1',
      'org-1',
      sevenYearsAgo,
      null,
    );

    expect(result).toBe(
      resolveParcelSyncLookbackStartDate(sevenYearsAgo, null),
    );
  });

  it('delegates no-data lookback (pleine: 36 rolling months, clamped)', async () => {
    mockMaxDateResult(null);

    const fifteenYearsAgo = new Date().getFullYear() - 15;
    const result = await service.getParcelSyncStartDate(
      'parcel-1',
      'org-1',
      fifteenYearsAgo,
      null,
    );

    expect(result).toBe(
      resolveParcelSyncLookbackStartDate(fifteenYearsAgo, null),
    );
  });

  it('delegates no planting_year to 24 months + clamp', async () => {
    mockMaxDateResult(null);

    const result = await service.getParcelSyncStartDate(
      'parcel-1',
      'org-1',
      null,
    );

    expect(result).toBe(resolveParcelSyncLookbackStartDate(null, null));
  });

  it('delegates last-year planting (juvenile) to Jan 1 when within MAX_LOOKBACK', async () => {
    mockMaxDateResult(null);

    const lastYear = new Date().getFullYear() - 1;
    const result = await service.getParcelSyncStartDate(
      'parcel-1',
      'org-1',
      lastYear,
      null,
    );

    expect(result).toBe(
      resolveParcelSyncLookbackStartDate(lastYear, null),
    );
  });
});
