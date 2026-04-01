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

  const TODAY = new Date().toISOString().split('T')[0];

  function mockMaxDateResult(date: string | null) {
    const queryBuilder = createMockQueryBuilder();
    mockClient.from.mockReturnValue(queryBuilder);

    // Override single to return the expected result
    // The query chain is: from().select().eq().eq().order().limit().single()
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

    // Should be 2026-03-27 (one day before last synced date)
    expect(result).toBe('2026-03-27');
  });

  it('returns today - 36 months when no data and planting_year >= 3 years ago', async () => {
    mockMaxDateResult(null);

    const threeYearsAgo = new Date().getFullYear() - 3;
    const result = await service.getParcelSyncStartDate(
      'parcel-1',
      'org-1',
      threeYearsAgo,
    );

    const expected = new Date();
    expected.setMonth(expected.getMonth() - 36);
    const expectedStr = expected.toISOString().split('T')[0];

    expect(result).toBe(expectedStr);
  });

  it('returns Jan 1 of planting year when no data and planting_year < 2 years ago', async () => {
    mockMaxDateResult(null);

    const lastYear = new Date().getFullYear() - 1;
    const result = await service.getParcelSyncStartDate(
      'parcel-1',
      'org-1',
      lastYear,
    );

    expect(result).toBe(`${lastYear}-01-01`);
  });

  it('returns today - 24 months when no data and no planting_year', async () => {
    mockMaxDateResult(null);

    const result = await service.getParcelSyncStartDate(
      'parcel-1',
      'org-1',
      null,
    );

    const expected = new Date();
    expected.setMonth(expected.getMonth() - 24);
    const expectedStr = expected.toISOString().split('T')[0];

    expect(result).toBe(expectedStr);
  });

  it('returns today - 24 months when no data and planting_year 2-3 years ago', async () => {
    mockMaxDateResult(null);

    const twoYearsAgo = new Date().getFullYear() - 2;
    const result = await service.getParcelSyncStartDate(
      'parcel-1',
      'org-1',
      twoYearsAgo,
    );

    const expected = new Date();
    expected.setMonth(expected.getMonth() - 24);
    const expectedStr = expected.toISOString().split('T')[0];

    expect(result).toBe(expectedStr);
  });
});
