import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ParcelsService } from './parcels.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CalibrationStateMachine } from '../calibration/calibration-state-machine';
import { SatelliteCacheService } from '../satellite-indices/satellite-cache.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CalibrationService } from '../calibration/calibration.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  MockSupabaseClient,
  MockQueryBuilder,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('ParcelsService', () => {
  let service: ParcelsService;
  let mockClient: MockSupabaseClient;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockSubscriptionsService: { hasValidSubscription: jest.Mock };
  let mockStateMachine: { transitionPhase: jest.Mock };
  let mockSatelliteCacheService: { syncParcelSatelliteData: jest.Mock };
  let mockNotificationsService: { createNotification: jest.Mock };
  let mockCalibrationService: { scheduleAnnualPlanRefreshAfterMajorParcelEdit: jest.Mock };

  // ============================================================
  // TEST DATA FIXTURES
  // ============================================================

  const MOCK_PARCELS = [
    {
      id: 'parcel-1',
      farm_id: 'farm-1',
      name: 'Parcel A',
      description: 'Test parcel',
      area: 10,
      area_unit: 'hectares',
      crop_category: 'vegetables',
      crop_type: 'tomatoes',
      variety: 'Roma',
      planting_system: 'organic',
      spacing: '1m x 1m',
      density_per_hectare: 10000,
      plant_count: 100000,
      planting_date: '2024-01-01',
      planting_year: 2024,
      rootstock: null,
      soil_type: 'loam',
      irrigation_type: 'drip',
      boundary: null,
      calculated_area: 10.5,
      perimeter: 500,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      farms: {
        id: 'farm-1',
        organization_id: TEST_IDS.organization,
      },
    },
  ];

  const VALID_AREA_UNITS = ['hectares', 'acres', 'square_meters', 'ares'];
  const VALID_CROP_CATEGORIES = ['vegetables', 'fruits', 'grains', 'legumes', 'tubers', 'others'];
  const VALID_IRRIGATION_TYPES = ['drip', 'sprinkler', 'flood', 'none'];
  const VALID_SOIL_TYPES = ['clay', 'sandy', 'loam', 'silt', 'peat', 'chalky'];

  const EDGE_CASE_AREAS = [0, 0.01, 10000, 1000000, Number.MAX_SAFE_INTEGER];
  const INVALID_AREAS = [-1, -100, Number.NEGATIVE_INFINITY, NaN];

  // ============================================================
  // SETUP & TEARDOWN
  // ============================================================

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockConfigService = {
      get: jest.fn(),
    } as any;
    mockSubscriptionsService = {
      hasValidSubscription: jest.fn().mockResolvedValue(true),
    };
    mockStateMachine = {
      transitionPhase: jest.fn().mockResolvedValue(undefined),
    };
    mockSatelliteCacheService = {
      syncParcelSatelliteData: jest.fn().mockResolvedValue({ totalPoints: 0 }),
    };
    mockNotificationsService = {
      createNotification: jest.fn().mockResolvedValue(undefined),
    };
    mockCalibrationService = {
      scheduleAnnualPlanRefreshAfterMajorParcelEdit: jest.fn(),
    };

    // Mock environment variables
    mockConfigService.get.mockImplementation((key: string) => {
      const config: Record<string, string> = {
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'test-key',
      };
      return config[key];
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParcelsService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SubscriptionsService, useValue: mockSubscriptionsService },
        { provide: CalibrationStateMachine, useValue: mockStateMachine },
        { provide: SatelliteCacheService, useValue: mockSatelliteCacheService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: CalibrationService, useValue: mockCalibrationService },
      ],
    }).compile();

    service = module.get<ParcelsService>(ParcelsService);

    // Replace the supabase admin client with our mock
    (service as any).supabaseAdmin = mockClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  function setupOrganizationAccessMock(organizationId: string, userId: string, hasAccess = true) {
    const queryBuilder = createMockQueryBuilder();
    queryBuilder.eq.mockReturnValue(queryBuilder);
    queryBuilder.maybeSingle.mockResolvedValue(
      hasAccess
        ? mockQueryResult({ organization_id: organizationId, user_id: userId })
        : mockQueryResult(null, null)
    );
    return queryBuilder;
  }

  function setupFarmMock(farmId: string, organizationId: string, exists = true) {
    const queryBuilder = createMockQueryBuilder();
    queryBuilder.eq.mockReturnValue(queryBuilder);
    queryBuilder.single.mockResolvedValue(
      exists
        ? mockQueryResult({ id: farmId, organization_id: organizationId })
        : mockQueryResult(null, { message: 'Farm not found' })
    );
    return queryBuilder;
  }

  function setupParcelMock(parcelId: string, farmId: string, exists = true) {
    const queryBuilder = createMockQueryBuilder();
    queryBuilder.eq.mockReturnValue(queryBuilder);
    queryBuilder.single.mockResolvedValue(
      exists
        ? mockQueryResult({
            id: parcelId,
            name: 'Test Parcel',
            farm_id: farmId,
          })
        : mockQueryResult(null, { message: 'Parcel not found' })
    );
    return queryBuilder;
  }

  // ============================================================
  // PARAMETERIZED TESTS - CRUD OPERATIONS
  // ============================================================

  describe('listParcels (Parameterized)', () => {
    it.each(VALID_AREA_UNITS)(
      'should handle parcels with area_unit: %s',
      async (areaUnit) => {
        const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);
        const parcels = [{ ...MOCK_PARCELS[0], area_unit: areaUnit }];

        const parcelQuery = createMockQueryBuilder();
        parcelQuery.eq.mockReturnValue(parcelQuery);
        parcelQuery.order.mockReturnValue(parcelQuery);
        parcelQuery.then.mockResolvedValue(mockQueryResult(parcels));

        mockClient.from.mockImplementation((table: string) => {
          if (table === 'organization_users') return orgQuery;
          if (table === 'parcels') return parcelQuery;
          return createMockQueryBuilder();
        });

        const result = await service.listParcels(
          TEST_IDS.user,
          TEST_IDS.organization
        );

        expect(result.success).toBe(true);
        expect(result.parcels).toHaveLength(1);
        expect(result.parcels[0].area_unit).toBe(areaUnit);
      }
    );

    it.each(VALID_CROP_CATEGORIES)(
      'should handle parcels with crop_category: %s',
      async (category) => {
        const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);
        const parcels = [{ ...MOCK_PARCELS[0], crop_category: category }];

        const parcelQuery = createMockQueryBuilder();
        parcelQuery.eq.mockReturnValue(parcelQuery);
        parcelQuery.order.mockReturnValue(parcelQuery);
        parcelQuery.then.mockResolvedValue(mockQueryResult(parcels));

        mockClient.from.mockImplementation((table: string) => {
          if (table === 'organization_users') return orgQuery;
          if (table === 'parcels') return parcelQuery;
          return createMockQueryBuilder();
        });

        const result = await service.listParcels(
          TEST_IDS.user,
          TEST_IDS.organization
        );

        expect(result.parcels[0].crop_category).toBe(category);
      }
    );
  });

  describe('createParcel (Parameterized)', () => {
    it.each(VALID_SOIL_TYPES)(
      'should create parcel with soil_type: %s',
      async (soilType) => {
        const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);
        const farmQuery = setupFarmMock('farm-1', TEST_IDS.organization);

        const createDto = {
          farm_id: 'farm-1',
          name: 'Test Parcel',
          area: 10,
          area_unit: 'hectares' as const,
          soil_type: soilType,
          boundary: [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]] as any,
        };

        const parcelQuery = createMockQueryBuilder();
        parcelQuery.insert.mockReturnValue(parcelQuery);
        parcelQuery.select.mockReturnValue(parcelQuery);
        parcelQuery.single.mockResolvedValue(
          mockQueryResult({
            id: 'new-parcel',
            ...createDto,
            organization_id: TEST_IDS.organization,
          })
        );

        mockClient.from.mockImplementation((table: string) => {
          if (table === 'organization_users') return orgQuery;
          if (table === 'farms') return farmQuery;
          if (table === 'parcels') return parcelQuery;
          return createMockQueryBuilder();
        });

        const result = await service.createParcel(
          TEST_IDS.user,
          TEST_IDS.organization,
          createDto
        );

        expect(result.soil_type).toBe(soilType);
        expect(parcelQuery.insert).toHaveBeenCalled();
      }
    );

    it.each(VALID_IRRIGATION_TYPES)(
      'should create parcel with irrigation_type: %s',
      async (irrigationType) => {
        const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);
        const farmQuery = setupFarmMock('farm-1', TEST_IDS.organization);

        const createDto = {
          farm_id: 'farm-1',
          name: 'Test Parcel',
          area: 10,
          area_unit: 'hectares' as const,
          irrigation_type: irrigationType,
          boundary: [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]] as any,
        };

        const parcelQuery = createMockQueryBuilder();
        parcelQuery.insert.mockReturnValue(parcelQuery);
        parcelQuery.select.mockReturnValue(parcelQuery);
        parcelQuery.single.mockResolvedValue(
          mockQueryResult({
            id: 'new-parcel',
            ...createDto,
            organization_id: TEST_IDS.organization,
          })
        );

        mockClient.from.mockImplementation((table: string) => {
          if (table === 'organization_users') return orgQuery;
          if (table === 'farms') return farmQuery;
          if (table === 'parcels') return parcelQuery;
          return createMockQueryBuilder();
        });

        const result = await service.createParcel(
          TEST_IDS.user,
          TEST_IDS.organization,
          createDto
        );

        expect(result.irrigation_type).toBe(irrigationType);
      }
    );
  });

  // ============================================================
  // INPUT VALIDATION TESTS
  // ============================================================

  describe('Input Validation', () => {
    describe('deleteParcel', () => {
      it.each([null, undefined, '', '   ', '\t\n'])(
        'should reject invalid parcel_id: %s',
        async (parcelId) => {
          const dto = { parcel_id: parcelId as any };

          const parcelQuery = setupParcelMock(dto.parcel_id, 'farm-1', false);
          mockClient.from.mockReturnValue(parcelQuery);

          await expect(
            service.deleteParcel(TEST_IDS.user, dto)
          ).rejects.toThrow(NotFoundException);
        }
      );

      it('should reject deletion when parcel has no farm', async () => {
        const dto = { parcel_id: 'parcel-1' };

        const parcelQuery = createMockQueryBuilder();
        parcelQuery.eq.mockReturnValue(parcelQuery);
        parcelQuery.single.mockResolvedValue(
          mockQueryResult({
            id: 'parcel-1',
            name: 'Orphan Parcel',
            farm_id: null, // No farm associated
          })
        );

        mockClient.from.mockReturnValue(parcelQuery);

        await expect(
          service.deleteParcel(TEST_IDS.user, dto)
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.deleteParcel(TEST_IDS.user, dto)
        ).rejects.toThrow('not associated with any farm');
      });
    });

    describe('createParcel', () => {
      it.each(INVALID_AREAS)(
        'should reject invalid area value: %s',
        async (area) => {
          const orgQuery = setupOrganizationAccessMock(
            TEST_IDS.organization,
            TEST_IDS.user
          );
          const farmQuery = setupFarmMock('farm-1', TEST_IDS.organization);

          const createDto = {
            farm_id: 'farm-1',
            name: 'Test Parcel',
            area: area as any,
            area_unit: 'hectares' as const,
            boundary: [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]] as any,
          };

          const parcelQuery = createMockQueryBuilder();
          parcelQuery.insert.mockReturnValue(parcelQuery);
          parcelQuery.select.mockReturnValue(parcelQuery);
          parcelQuery.single.mockResolvedValue(
            mockQueryResult(null, { message: 'Invalid area' })
          );

          mockClient.from.mockImplementation((table: string) => {
            if (table === 'organization_users') return orgQuery;
            if (table === 'farms') return farmQuery;
            if (table === 'parcels') return parcelQuery;
            return createMockQueryBuilder();
          });

          await expect(
            service.createParcel(TEST_IDS.user, TEST_IDS.organization, createDto)
          ).rejects.toThrow();
        }
      );

      it('should reject creation when farm does not belong to organization', async () => {
        const orgQuery = setupOrganizationAccessMock(
          TEST_IDS.organization,
          TEST_IDS.user
        );
        const farmQuery = setupFarmMock('farm-1', 'different-org', false);

        const createDto = {
          farm_id: 'farm-1',
          name: 'Test Parcel',
          area: 10,
          area_unit: 'hectares' as const,
          boundary: [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]] as any,
        };

        mockClient.from.mockImplementation((table: string) => {
          if (table === 'organization_users') return orgQuery;
          if (table === 'farms') return farmQuery;
          return createMockQueryBuilder();
        });

        await expect(
          service.createParcel(TEST_IDS.user, TEST_IDS.organization, createDto)
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('updateParcel', () => {
      it('should reject update when parcel not found', async () => {
        const orgQuery = setupOrganizationAccessMock(
          TEST_IDS.organization,
          TEST_IDS.user
        );

        const parcelQuery = createMockQueryBuilder();
        parcelQuery.eq.mockReturnValue(parcelQuery);
        parcelQuery.single.mockResolvedValue(
          mockQueryResult(null, { message: 'Not found' })
        );

        mockClient.from.mockReturnValue(parcelQuery);

        const updateDto = { name: 'Updated Name' };

        await expect(
          service.updateParcel(
            TEST_IDS.user,
            TEST_IDS.organization,
            'non-existent',
            updateDto
          )
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  // ============================================================
  // BEHAVIOR-FOCUSED TESTS
  // ============================================================

  describe('Behavior - Access Control', () => {
    it('should verify organization access before listing parcels', async () => {
      const orgQuery = setupOrganizationAccessMock(
        TEST_IDS.organization,
        TEST_IDS.user,
        false
      );

      mockClient.from.mockReturnValue(orgQuery);

      await expect(
        service.listParcels(TEST_IDS.user, TEST_IDS.organization)
      ).rejects.toThrow(ForbiddenException);

      expect(orgQuery.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
      expect(orgQuery.eq).toHaveBeenCalledWith('user_id', TEST_IDS.user);
      expect(orgQuery.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('should verify organization access before creating parcel', async () => {
      const orgQuery = setupOrganizationAccessMock(
        TEST_IDS.organization,
        TEST_IDS.user,
        false
      );

      mockClient.from.mockReturnValue(orgQuery);

      const createDto = {
        farm_id: 'farm-1',
        name: 'Test Parcel',
        area: 10,
        area_unit: 'hectares' as const,
        boundary: [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]] as any,
      };

      await expect(
        service.createParcel(TEST_IDS.user, TEST_IDS.organization, createDto)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should verify farm belongs to organization before creating parcel', async () => {
      const orgQuery = setupOrganizationAccessMock(
        TEST_IDS.organization,
        TEST_IDS.user
      );

      const farmQuery = setupFarmMock('farm-1', 'different-org-id', false);

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgQuery;
        if (table === 'farms') return farmQuery;
        return createMockQueryBuilder();
      });

      const createDto = {
        farm_id: 'farm-1',
        name: 'Test Parcel',
        area: 10,
        area_unit: 'hectares' as const,
        boundary: [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]] as any,
      };

      await expect(
        service.createParcel(TEST_IDS.user, TEST_IDS.organization, createDto)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Behavior - Parcel Deletion', () => {
    it('should verify subscription before allowing deletion', async () => {
      const dto = { parcel_id: 'parcel-1' };
      const farmId = 'farm-1';

      // Parcel exists and has farm
      const parcelQuery = createMockQueryBuilder();
      parcelQuery.eq.mockReturnValue(parcelQuery);
      parcelQuery.single.mockResolvedValue(
        mockQueryResult({
          id: 'parcel-1',
          name: 'Test Parcel',
          farm_id: farmId,
        })
      );

      // Farm exists
      const farmQuery = createMockQueryBuilder();
      farmQuery.eq.mockReturnValue(farmQuery);
      farmQuery.single.mockResolvedValue(
        mockQueryResult({
          id: farmId,
          organization_id: TEST_IDS.organization,
        })
      );

      // User has access
      const orgUserQuery = createMockQueryBuilder();
      orgUserQuery.eq.mockReturnValue(orgUserQuery);
      orgUserQuery.maybeSingle.mockResolvedValue(
        mockQueryResult({
          organization_id: TEST_IDS.organization,
          user_id: TEST_IDS.user,
        })
      );

      // Subscription check fails
      mockClient.rpc.mockResolvedValue({
        data: false, // No valid subscription
        error: null,
      });

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'parcels' && callCount === 0) {
          callCount++;
          return parcelQuery;
        }
        if (table === 'farms') return farmQuery;
        if (table === 'organization_users') return orgUserQuery;
        return createMockQueryBuilder();
      });

      await expect(
        service.deleteParcel(TEST_IDS.user, dto)
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.deleteParcel(TEST_IDS.user, dto)
      ).rejects.toThrow('active subscription is required');
    });

    it('should successfully delete parcel with valid subscription', async () => {
      const dto = { parcel_id: 'parcel-1' };
      const farmId = 'farm-1';

      const parcelQuery = createMockQueryBuilder();
      parcelQuery.eq.mockReturnValue(parcelQuery);

      // Mock single() call for getting parcel
      parcelQuery.single.mockResolvedValue(
        mockQueryResult({
          id: 'parcel-1',
          name: 'Test Parcel',
          farm_id: farmId,
        })
      );

      // Mock delete operation - returns array of deleted parcels
      const deleteQuery = createMockQueryBuilder();
      deleteQuery.eq.mockReturnValue(deleteQuery);
      deleteQuery.select.mockReturnValue(deleteQuery);

      // Mock the thenable to return array of deleted parcels
      deleteQuery.then.mockImplementation((resolve: (value: { data: any[]; error: any }) => void) => {
        resolve({
          data: [{
            id: 'parcel-1',
            name: 'Test Parcel',
          }],
          error: null
        });
        return Promise.resolve({
          data: [{
            id: 'parcel-1',
            name: 'Test Parcel',
          }],
          error: null
        });
      });

      parcelQuery.delete.mockReturnValue(deleteQuery);

      const farmQuery = createMockQueryBuilder();
      farmQuery.eq.mockReturnValue(farmQuery);
      farmQuery.single.mockResolvedValue(
        mockQueryResult({
          id: farmId,
          organization_id: TEST_IDS.organization,
        })
      );

      const orgUserQuery = createMockQueryBuilder();
      orgUserQuery.eq.mockReturnValue(orgUserQuery);
      orgUserQuery.maybeSingle.mockResolvedValue(
        mockQueryResult({
          organization_id: TEST_IDS.organization,
          user_id: TEST_IDS.user,
        })
      );

      // Subscription valid
      mockClient.rpc.mockResolvedValue({
        data: true,
        error: null,
      });

      let fromCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        fromCallCount++;
        if (table === 'parcels') {
          return parcelQuery;
        }
        if (table === 'farms') return farmQuery;
        if (table === 'organization_users') return orgUserQuery;
        return createMockQueryBuilder();
      });

      const result = await service.deleteParcel(TEST_IDS.user, dto);

      expect(result.success).toBe(true);
      expect(result.deleted_parcel).toEqual({
        id: 'parcel-1',
        name: 'Test Parcel',
      });
      expect(parcelQuery.delete).toHaveBeenCalled();
    });

    it('should handle deletion when parcel was already deleted', async () => {
      const dto = { parcel_id: 'parcel-1' };
      const farmId = 'farm-1';

      const parcelQuery = createMockQueryBuilder();
      parcelQuery.eq.mockReturnValue(parcelQuery);

      // Mock single() call for getting parcel
      parcelQuery.single.mockResolvedValue(
        mockQueryResult({
          id: 'parcel-1',
          name: 'Test Parcel',
          farm_id: farmId,
        })
      );

      // Mock delete operation - returns empty array (no parcels deleted)
      const deleteQuery = createMockQueryBuilder();
      deleteQuery.eq.mockReturnValue(deleteQuery);
      deleteQuery.select.mockReturnValue(deleteQuery);

      // Mock the thenable to return empty array (parcel already deleted)
      deleteQuery.then.mockImplementation((resolve: (value: { data: any[]; error: any }) => void) => {
        resolve({
          data: [], // No parcels deleted
          error: null
        });
        return Promise.resolve({
          data: [],
          error: null
        });
      });

      parcelQuery.delete.mockReturnValue(deleteQuery);

      // Mock maybeSingle for verification - parcel doesn't exist
      const verifyQuery = createMockQueryBuilder();
      verifyQuery.eq.mockReturnValue(verifyQuery);
      verifyQuery.maybeSingle.mockResolvedValue(
        mockQueryResult(null, null)
      );

      const farmQuery = createMockQueryBuilder();
      farmQuery.eq.mockReturnValue(farmQuery);
      farmQuery.single.mockResolvedValue(
        mockQueryResult({
          id: farmId,
          organization_id: TEST_IDS.organization,
        })
      );

      const orgUserQuery = createMockQueryBuilder();
      orgUserQuery.eq.mockReturnValue(orgUserQuery);
      orgUserQuery.maybeSingle.mockResolvedValue(
        mockQueryResult({
          organization_id: TEST_IDS.organization,
          user_id: TEST_IDS.user,
        })
      );

      mockClient.rpc.mockResolvedValue({
        data: true,
        error: null,
      });

      let fromCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        fromCallCount++;
        if (table === 'parcels') {
          if (fromCallCount === 1) {
            // First call: get parcel
            return parcelQuery;
          } else if (fromCallCount === 2) {
            // Second call: verify parcel doesn't exist
            return verifyQuery;
          }
          return parcelQuery;
        }
        if (table === 'farms') return farmQuery;
        if (table === 'organization_users') return orgUserQuery;
        return createMockQueryBuilder();
      });

      const result = await service.deleteParcel(TEST_IDS.user, dto);

      expect(result.success).toBe(true);
      expect(result.message).toContain('deleted or already absent');
    });
  });

  describe('Behavior - Parcel Updates', () => {
    it('should only update provided fields', async () => {
      const orgQuery = setupOrganizationAccessMock(
        TEST_IDS.organization,
        TEST_IDS.user
      );

      const existingParcel = { ...MOCK_PARCELS[0] };

      const parcelQuery = createMockQueryBuilder();
      parcelQuery.eq.mockReturnValue(parcelQuery);

      parcelQuery.maybeSingle.mockResolvedValue(
        mockQueryResult({
          crop_type: existingParcel.crop_type,
          variety: existingParcel.variety,
          planting_system: existingParcel.planting_system,
          irrigation_type: existingParcel.irrigation_type,
          water_source: null,
          density_per_hectare: existingParcel.density_per_hectare,
          plant_count: existingParcel.plant_count,
          ai_phase: 'disabled',
          ai_enabled: false,
          ai_observation_only: false,
          ai_calibration_id: null,
        }),
      );

      // First single() call returns existing parcel
      let singleCallCount = 0;
      parcelQuery.single.mockImplementation(() => {
        singleCallCount++;
        if (singleCallCount === 1) {
          return Promise.resolve(mockQueryResult(existingParcel));
        }
        // Second single() call returns updated parcel
        const updatedParcel = {
          ...existingParcel,
          name: 'Updated Name',
        };
        return Promise.resolve(mockQueryResult(updatedParcel));
      });

      parcelQuery.update.mockReturnValue(parcelQuery);
      parcelQuery.select.mockReturnValue(parcelQuery);

      mockClient.from.mockReturnValue(parcelQuery);

      const updateDto = { name: 'Updated Name' };

      const result = await service.updateParcel(
        TEST_IDS.user,
        TEST_IDS.organization,
        'parcel-1',
        updateDto
      );

      expect(result.name).toBe('Updated Name');
      expect(parcelQuery.update).toHaveBeenCalledWith({ name: 'Updated Name' });
    });

    it('should update multiple fields at once', async () => {
      const orgQuery = setupOrganizationAccessMock(
        TEST_IDS.organization,
        TEST_IDS.user
      );

      const existingParcel = { ...MOCK_PARCELS[0] };

      const parcelQuery = createMockQueryBuilder();
      parcelQuery.eq.mockReturnValue(parcelQuery);

      parcelQuery.maybeSingle.mockResolvedValue(
        mockQueryResult({
          crop_type: existingParcel.crop_type,
          variety: existingParcel.variety,
          planting_system: existingParcel.planting_system,
          irrigation_type: existingParcel.irrigation_type,
          water_source: null,
          density_per_hectare: existingParcel.density_per_hectare,
          plant_count: existingParcel.plant_count,
          ai_phase: 'disabled',
          ai_enabled: false,
          ai_observation_only: false,
          ai_calibration_id: null,
        }),
      );

      // First single() call returns existing parcel
      let singleCallCount = 0;
      parcelQuery.single.mockImplementation(() => {
        singleCallCount++;
        if (singleCallCount === 1) {
          return Promise.resolve(mockQueryResult(existingParcel));
        }
        // Second single() call returns updated parcel
        return Promise.resolve(
          mockQueryResult({
            ...existingParcel,
            name: 'New Name',
            area: 20,
            soil_type: 'clay',
          })
        );
      });

      parcelQuery.update.mockReturnValue(parcelQuery);
      parcelQuery.select.mockReturnValue(parcelQuery);

      mockClient.from.mockReturnValue(parcelQuery);

      const updateDto = {
        name: 'New Name',
        area: 20,
        soil_type: 'clay',
      };

      const result = await service.updateParcel(
        TEST_IDS.user,
        TEST_IDS.organization,
        'parcel-1',
        updateDto
      );

      expect(result.name).toBe('New Name');
      expect(result.area).toBe(20);
      expect(result.soil_type).toBe('clay');
    });
  });

  // ============================================================
  // EDGE CASE TESTS
  // ============================================================

  describe('Edge Cases', () => {
    describe('Area Calculations', () => {
      it.each(EDGE_CASE_AREAS)(
        'should handle edge case area: %s',
        async (area) => {
          const orgQuery = setupOrganizationAccessMock(
            TEST_IDS.organization,
            TEST_IDS.user
          );
          const farmQuery = setupFarmMock('farm-1', TEST_IDS.organization);

          const createDto = {
            farm_id: 'farm-1',
            name: 'Edge Case Parcel',
            area: area,
            area_unit: 'hectares' as const,
            boundary: [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]] as any,
          };

          const parcelQuery = createMockQueryBuilder();
          parcelQuery.insert.mockReturnValue(parcelQuery);
          parcelQuery.select.mockReturnValue(parcelQuery);
          parcelQuery.single.mockResolvedValue(
            mockQueryResult({
              id: 'new-parcel',
              ...createDto,
            })
          );

          mockClient.from.mockImplementation((table: string) => {
            if (table === 'organization_users') return orgQuery;
            if (table === 'farms') return farmQuery;
            if (table === 'parcels') return parcelQuery;
            return createMockQueryBuilder();
          });

          const result = await service.createParcel(
            TEST_IDS.user,
            TEST_IDS.organization,
            createDto
          );

          expect(result.area).toBe(area);
        }
      );
    });

    describe('Special Characters', () => {
      it('should handle special characters in parcel names', async () => {
        const orgQuery = setupOrganizationAccessMock(
          TEST_IDS.organization,
          TEST_IDS.user
        );
        const farmQuery = setupFarmMock('farm-1', TEST_IDS.organization);

        const specialNames = [
          "Côte d'Azur",
          'São Paulo',
          'Московская',
          'الرباط',
          'parcel & test',
          'parcel/test',
          'parcel-test',
        ];

        const parcelQuery = createMockQueryBuilder();
        parcelQuery.insert.mockReturnValue(parcelQuery);
        parcelQuery.select.mockReturnValue(parcelQuery);
        parcelQuery.single.mockResolvedValue(
          mockQueryResult({
            id: 'new-parcel',
            farm_id: 'farm-1',
            name: specialNames[0],
          })
        );

        mockClient.from.mockImplementation((table: string) => {
          if (table === 'organization_users') return orgQuery;
          if (table === 'farms') return farmQuery;
          if (table === 'parcels') return parcelQuery;
          return createMockQueryBuilder();
        });

        const result = await service.createParcel(
          TEST_IDS.user,
          TEST_IDS.organization,
          {
            farm_id: 'farm-1',
            name: specialNames[0],
            area: 10,
            area_unit: 'hectares' as const,
            boundary: [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]] as any,
          }
        );

        expect(result.name).toBe(specialNames[0]);
      });
    });

    describe('Null and Optional Fields', () => {
      it('should handle null optional fields in create', async () => {
        const orgQuery = setupOrganizationAccessMock(
          TEST_IDS.organization,
          TEST_IDS.user
        );
        const farmQuery = setupFarmMock('farm-1', TEST_IDS.organization);

        const createDto = {
          farm_id: 'farm-1',
          name: 'Minimal Parcel',
          area: 10,
          area_unit: 'hectares' as const,
          description: null,
          variety: null,
          rootstock: null,
          irrigation_type: null,
          boundary: [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]] as any,
        };

        const parcelQuery = createMockQueryBuilder();
        parcelQuery.insert.mockReturnValue(parcelQuery);
        parcelQuery.select.mockReturnValue(parcelQuery);
        parcelQuery.single.mockResolvedValue(
          mockQueryResult({
            id: 'new-parcel',
            ...createDto,
          })
        );

        mockClient.from.mockImplementation((table: string) => {
          if (table === 'organization_users') return orgQuery;
          if (table === 'farms') return farmQuery;
          if (table === 'parcels') return parcelQuery;
          return createMockQueryBuilder();
        });

        const result = await service.createParcel(
          TEST_IDS.user,
          TEST_IDS.organization,
          createDto
        );

        expect(result.description).toBeNull();
        expect(result.variety).toBeNull();
      });
    });

    describe('Performance Summary', () => {
      it('should handle empty harvest data in performance summary', async () => {
        const orgQuery = setupOrganizationAccessMock(
          TEST_IDS.organization,
          TEST_IDS.user
        );

        const harvestQuery = createMockQueryBuilder();
        harvestQuery.eq.mockReturnValue(harvestQuery);
        harvestQuery.gte.mockReturnValue(harvestQuery);
        harvestQuery.lte.mockReturnValue(harvestQuery);
        harvestQuery.then.mockResolvedValue(mockQueryResult([])); // No harvests

        let fromCallCount = 0;
        mockClient.from.mockImplementation((table: string) => {
          fromCallCount++;
          if (table === 'organization_users' && fromCallCount === 1) {
            return orgQuery;
          }
          if (table === 'harvest_records') {
            return harvestQuery;
          }
          return createMockQueryBuilder();
        });

        const result = await service.getPerformanceSummary(
          TEST_IDS.user,
          TEST_IDS.organization
        );

        expect(result).toEqual([]);
      });

      it('should calculate performance metrics correctly', async () => {
        const orgQuery = setupOrganizationAccessMock(
          TEST_IDS.organization,
          TEST_IDS.user
        );

        const mockHarvests = [
          {
            parcel_id: 'parcel-1',
            crop_type: 'tomatoes',
            actual_yield: 1000,
            estimated_yield: 900,
            revenue_amount: 5000,
            cost_amount: 2000,
            profit_amount: 3000,
            harvest_date: '2024-06-01',
            parcels: {
              id: 'parcel-1',
              name: 'Parcel A',
              area: 10,
              area_unit: 'hectares',
              farms: {
                id: 'farm-1',
                name: 'Farm 1',
                organization_id: TEST_IDS.organization,
              },
            },
          },
        ];

        const harvestQuery = createMockQueryBuilder();
        harvestQuery.eq.mockReturnValue(harvestQuery);
        harvestQuery.gte.mockReturnValue(harvestQuery);
        harvestQuery.lte.mockReturnValue(harvestQuery);
        harvestQuery.then.mockResolvedValue(mockQueryResult(mockHarvests));

        let fromCallCount = 0;
        mockClient.from.mockImplementation((table: string) => {
          fromCallCount++;
          if (table === 'organization_users' && fromCallCount === 1) {
            return orgQuery;
          }
          if (table === 'harvest_records') {
            return harvestQuery;
          }
          return createMockQueryBuilder();
        });

        const result = await service.getPerformanceSummary(
          TEST_IDS.user,
          TEST_IDS.organization
        );

        expect(result).toHaveLength(1);
        expect(result[0].parcel_name).toBe('Parcel A');
        expect(result[0].total_harvests).toBe(1);
        expect(result[0].avg_yield_per_hectare).toBe(100);
        expect(result[0].performance_rating).toBe('Excellent');
      });
    });
  });

  describe('Filtering and Pagination', () => {
    it('should filter parcels by farm_id', async () => {
      const orgQuery = setupOrganizationAccessMock(
        TEST_IDS.organization,
        TEST_IDS.user
      );

      const farmId = 'farm-1';
      const parcels = [MOCK_PARCELS[0]];

      const parcelQuery = createMockQueryBuilder();
      parcelQuery.eq.mockReturnValue(parcelQuery);
      parcelQuery.order.mockReturnValue(parcelQuery);
      parcelQuery.then.mockResolvedValue(mockQueryResult(parcels));

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgQuery;
        if (table === 'parcels') return parcelQuery;
        return createMockQueryBuilder();
      });

      const result = await service.listParcels(
        TEST_IDS.user,
        TEST_IDS.organization,
        farmId
      );

      expect(parcelQuery.eq).toHaveBeenCalledWith('farm_id', farmId);
      expect(result.parcels).toHaveLength(1);
    });

    it('should order parcels by name', async () => {
      const orgQuery = setupOrganizationAccessMock(
        TEST_IDS.organization,
        TEST_IDS.user
      );

      const parcels = [
        { ...MOCK_PARCELS[0], name: 'Z Parcel' },
        { ...MOCK_PARCELS[0], name: 'A Parcel' },
      ];

      const parcelQuery = createMockQueryBuilder();
      parcelQuery.eq.mockReturnValue(parcelQuery);
      parcelQuery.order.mockReturnValue(parcelQuery);
      parcelQuery.then.mockResolvedValue(mockQueryResult(parcels));

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgQuery;
        if (table === 'parcels') return parcelQuery;
        return createMockQueryBuilder();
      });

      await service.listParcels(TEST_IDS.user, TEST_IDS.organization);

      expect(parcelQuery.order).toHaveBeenCalledWith('name', {
        ascending: true,
      });
    });
  });

  // ============================================================
  // AGRICULTURAL-SPECIFIC TESTS
  // ============================================================

  describe('Agricultural Features', () => {
    it('should store planting date correctly', async () => {
      const orgQuery = setupOrganizationAccessMock(
        TEST_IDS.organization,
        TEST_IDS.user
      );
      const farmQuery = setupFarmMock('farm-1', TEST_IDS.organization);

      const plantingDate = '2024-03-15';

      const parcelQuery = createMockQueryBuilder();
      parcelQuery.insert.mockReturnValue(parcelQuery);
      parcelQuery.select.mockReturnValue(parcelQuery);
      parcelQuery.single.mockResolvedValue(
        mockQueryResult({
          id: 'new-parcel',
          farm_id: 'farm-1',
          name: 'Test Parcel',
          planting_date: plantingDate,
        })
      );

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgQuery;
        if (table === 'farms') return farmQuery;
        if (table === 'parcels') return parcelQuery;
        return createMockQueryBuilder();
      });

      const result = await service.createParcel(
        TEST_IDS.user,
        TEST_IDS.organization,
        {
          farm_id: 'farm-1',
          name: 'Test Parcel',
          area: 10,
          area_unit: 'hectares' as const,
          planting_date: plantingDate,
          boundary: [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]] as any,
        }
      );

      expect(result.planting_date).toBe(plantingDate);
    });

    it('should calculate planting density correctly', async () => {
      const orgQuery = setupOrganizationAccessMock(
        TEST_IDS.organization,
        TEST_IDS.user
      );
      const farmQuery = setupFarmMock('farm-1', TEST_IDS.organization);

      const density = 10000;
      const area = 5;
      const expectedPlantCount = density * area;

      const parcelQuery = createMockQueryBuilder();
      parcelQuery.insert.mockReturnValue(parcelQuery);
      parcelQuery.select.mockReturnValue(parcelQuery);
      parcelQuery.single.mockResolvedValue(
        mockQueryResult({
          id: 'new-parcel',
          farm_id: 'farm-1',
          name: 'Test Parcel',
          area: area,
          density_per_hectare: density,
          plant_count: expectedPlantCount,
        })
      );

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgQuery;
        if (table === 'farms') return farmQuery;
        if (table === 'parcels') return parcelQuery;
        return createMockQueryBuilder();
      });

      const result = await service.createParcel(
        TEST_IDS.user,
        TEST_IDS.organization,
        {
          farm_id: 'farm-1',
          name: 'Test Parcel',
          area: area,
          area_unit: 'hectares' as const,
          density_per_hectare: density,
          plant_count: expectedPlantCount,
          boundary: [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]] as any,
        }
      );

      expect(result.plant_count).toBe(expectedPlantCount);
    });

    it('should handle boundary data for mapping', async () => {
      const orgQuery = setupOrganizationAccessMock(
        TEST_IDS.organization,
        TEST_IDS.user
      );
      const farmQuery = setupFarmMock('farm-1', TEST_IDS.organization);

      const boundary = {
        type: 'Polygon',
        coordinates: [
          [
            [-1.2, 35.5],
            [-1.2, 35.6],
            [-1.1, 35.6],
            [-1.1, 35.5],
            [-1.2, 35.5],
          ],
        ],
      };

      const parcelQuery = createMockQueryBuilder();
      parcelQuery.insert.mockReturnValue(parcelQuery);
      parcelQuery.select.mockReturnValue(parcelQuery);
      parcelQuery.single.mockResolvedValue(
        mockQueryResult({
          id: 'new-parcel',
          farm_id: 'farm-1',
          name: 'Test Parcel',
          boundary: boundary,
        })
      );

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgQuery;
        if (table === 'farms') return farmQuery;
        if (table === 'parcels') return parcelQuery;
        return createMockQueryBuilder();
      });

      const result = await service.createParcel(
        TEST_IDS.user,
        TEST_IDS.organization,
        {
          farm_id: 'farm-1',
          name: 'Test Parcel',
          area: 10,
          area_unit: 'hectares' as const,
          boundary: boundary as any,
        }
      );

      expect(result.boundary).toEqual(boundary);
    });
  });
});
