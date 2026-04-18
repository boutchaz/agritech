import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FarmsService } from './farms.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { AdoptionService } from '../adoption/adoption.service';
import {
  createMockQueryBuilder,
  mockQueryResult,
  MockQueryBuilder,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

// We need to mock createClient from @supabase/supabase-js since FarmsService
// creates its own Supabase client in the constructor
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseAdmin),
}));

// The mock admin client used by the FarmsService constructor
const mockSupabaseAdmin = {
  from: jest.fn(),
  rpc: jest.fn(),
  auth: { admin: {} },
};

describe('FarmsService', () => {
  let service: FarmsService;
  let mockConfigService: Partial<ConfigService>;
  let mockSubscriptionsService: Partial<SubscriptionsService>;
  let mockAdoptionService: Partial<AdoptionService>;

  const MOCK_FARMS = [
    {
      id: TEST_IDS.farm,
      name: 'Main Farm',
      location: 'Casablanca',
      size: 100,
      manager_name: 'John',
      is_active: true,
      created_at: '2024-01-01',
    },
    {
      id: 'farm-2',
      name: 'Secondary Farm',
      location: 'Rabat',
      size: 50,
      manager_name: 'Jane',
      is_active: true,
      created_at: '2024-02-01',
    },
  ];

  const MOCK_PARCELS = [
    { farm_id: TEST_IDS.farm },
    { farm_id: TEST_IDS.farm },
    { farm_id: 'farm-2' },
  ];

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          SUPABASE_URL: 'https://test.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        };
        return config[key];
      }),
    };

    mockSubscriptionsService = {
      checkLimit: jest.fn().mockResolvedValue(undefined),
    };

    mockAdoptionService = {
      completeMilestone: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FarmsService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SubscriptionsService, useValue: mockSubscriptionsService },
        { provide: AdoptionService, useValue: mockAdoptionService },
      ],
    }).compile();

    service = module.get<FarmsService>(FarmsService);

    // Reset the mock admin client between tests
    mockSupabaseAdmin.from.mockReset();
    mockSupabaseAdmin.rpc.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // listFarms
  // ============================================================

  describe('listFarms', () => {
    it('should return PaginatedResponse shape', async () => {
      // org user check
      const orgUserBuilder = createMockQueryBuilder();
      orgUserBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({ organization_id: TEST_IDS.organization, role_id: 'admin', is_active: true }),
      );

      // all user orgs query (first .from call)
      const allOrgsBuilder = createMockQueryBuilder();
      allOrgsBuilder.then.mockImplementation((resolve) => {
        const result = { data: [{ organization_id: TEST_IDS.organization }], error: null };
        resolve(result);
        return Promise.resolve(result);
      });

      // farms query
      const farmsBuilder = createMockQueryBuilder();
      farmsBuilder.then.mockImplementation((resolve) => {
        const result = { data: MOCK_FARMS, error: null };
        resolve(result);
        return Promise.resolve(result);
      });

      // parcels query
      const parcelsBuilder = createMockQueryBuilder();
      parcelsBuilder.then.mockImplementation((resolve) => {
        const result = { data: MOCK_PARCELS, error: null };
        resolve(result);
        return Promise.resolve(result);
      });

      let callCount = 0;
      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'organization_users') {
          // First call returns all orgs, second returns specific org
          if (callCount === 1) return allOrgsBuilder;
          return orgUserBuilder;
        }
        if (table === 'farms') return farmsBuilder;
        if (table === 'parcels') return parcelsBuilder;
        return createMockQueryBuilder();
      });

      const result = await service.listFarms(TEST_IDS.user, TEST_IDS.organization);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('pageSize');
      expect(result).toHaveProperty('totalPages');
      expect(result.data).toHaveLength(2);
    });

    it('should return empty PaginatedResponse when user has no org membership', async () => {
      const allOrgsBuilder = createMockQueryBuilder();
      allOrgsBuilder.then.mockImplementation((resolve) => {
        const result = { data: [], error: null };
        resolve(result);
        return Promise.resolve(result);
      });

      const orgUserBuilder = createMockQueryBuilder();
      orgUserBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null, { message: 'Not found' }));

      let callCount = 0;
      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'organization_users') {
          if (callCount === 1) return allOrgsBuilder;
          return orgUserBuilder;
        }
        return createMockQueryBuilder();
      });

      const result = await service.listFarms(TEST_IDS.user, TEST_IDS.organization);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle empty farms list', async () => {
      const allOrgsBuilder = createMockQueryBuilder();
      allOrgsBuilder.then.mockImplementation((resolve) => {
        const result = { data: [{ organization_id: TEST_IDS.organization }], error: null };
        resolve(result);
        return Promise.resolve(result);
      });

      const orgUserBuilder = createMockQueryBuilder();
      orgUserBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({ organization_id: TEST_IDS.organization, role_id: 'admin', is_active: true }),
      );

      const farmsBuilder = createMockQueryBuilder();
      farmsBuilder.then.mockImplementation((resolve) => {
        const result = { data: [], error: null };
        resolve(result);
        return Promise.resolve(result);
      });

      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'organization_users') {
          // Return different builders for the two org user queries
          const builder = createMockQueryBuilder();
          builder.then.mockImplementation((resolve) => {
            const result = { data: [{ organization_id: TEST_IDS.organization }], error: null };
            resolve(result);
            return Promise.resolve(result);
          });
          builder.maybeSingle.mockResolvedValue(
            mockQueryResult({ organization_id: TEST_IDS.organization, role_id: 'admin', is_active: true }),
          );
          return builder;
        }
        if (table === 'farms') return farmsBuilder;
        return createMockQueryBuilder();
      });

      const result = await service.listFarms(TEST_IDS.user, TEST_IDS.organization);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should throw InternalServerErrorException on farms query error', async () => {
      const orgBuilder = createMockQueryBuilder();
      orgBuilder.then.mockImplementation((resolve) => {
        const result = { data: [{ organization_id: TEST_IDS.organization }], error: null };
        resolve(result);
        return Promise.resolve(result);
      });
      orgBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({ organization_id: TEST_IDS.organization, role_id: 'admin', is_active: true }),
      );

      const farmsBuilder = createMockQueryBuilder();
      farmsBuilder.then.mockImplementation((resolve) => {
        const result = { data: null, error: { message: 'DB failure' } };
        resolve(result);
        return Promise.resolve(result);
      });

      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgBuilder;
        if (table === 'farms') return farmsBuilder;
        return createMockQueryBuilder();
      });

      await expect(service.listFarms(TEST_IDS.user, TEST_IDS.organization))
        .rejects.toThrow(InternalServerErrorException);
    });

    it('should include parcel counts per farm', async () => {
      const orgBuilder = createMockQueryBuilder();
      orgBuilder.then.mockImplementation((resolve) => {
        const result = { data: [{ organization_id: TEST_IDS.organization }], error: null };
        resolve(result);
        return Promise.resolve(result);
      });
      orgBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({ organization_id: TEST_IDS.organization, role_id: 'admin', is_active: true }),
      );

      const farmsBuilder = createMockQueryBuilder();
      farmsBuilder.then.mockImplementation((resolve) => {
        const result = { data: MOCK_FARMS, error: null };
        resolve(result);
        return Promise.resolve(result);
      });

      const parcelsBuilder = createMockQueryBuilder();
      parcelsBuilder.then.mockImplementation((resolve) => {
        const result = { data: MOCK_PARCELS, error: null };
        resolve(result);
        return Promise.resolve(result);
      });

      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgBuilder;
        if (table === 'farms') return farmsBuilder;
        if (table === 'parcels') return parcelsBuilder;
        return createMockQueryBuilder();
      });

      const result = await service.listFarms(TEST_IDS.user, TEST_IDS.organization);

      // Main Farm should have 2 parcels, Secondary Farm should have 1
      const mainFarm = result.data.find((f: any) => f.farm_id === TEST_IDS.farm);
      expect(mainFarm?.parcel_count).toBe(2);
    });
  });
});
