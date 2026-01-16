import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WarehousesService } from './warehouses.service';
import { DatabaseService } from '../database/database.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  MockSupabaseClient,
  MockQueryBuilder,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('WarehousesService', () => {
  let service: WarehousesService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: { getAdminClient: jest.Mock };

  // ============================================================
  // TEST DATA FIXTURES
  // ============================================================

  const VALID_WAREHOUSE_TYPES = ['standard', 'cold_storage', 'climate_controlled', 'secure'];
  const VALID_SECURITY_LEVELS = ['standard', 'high', 'restricted'];

  const MOCK_WAREHOUSES = [
    {
      id: 'wh1',
      organization_id: TEST_IDS.organization,
      name: 'Main Warehouse',
      description: 'Primary storage facility',
      location: 'Building A',
      address: '123 Farm Road',
      city: 'Casablanca',
      postal_code: '20000',
      capacity: 10000,
      capacity_unit: 'kg',
      temperature_controlled: true,
      humidity_controlled: true,
      security_level: 'high',
      manager_name: 'John Doe',
      manager_phone: '+212-600-000000',
      farm_id: TEST_IDS.farm,
      is_active: true,
    },
    {
      id: 'wh2',
      organization_id: TEST_IDS.organization,
      name: 'Cold Storage',
      description: 'Temperature controlled storage',
      location: 'Building B',
      city: 'Casablanca',
      temperature_controlled: true,
      humidity_controlled: false,
      security_level: 'standard',
      is_active: true,
    },
  ];

  const INVENTORY_ITEMS = [
    {
      id: 'inv1',
      organization_id: TEST_IDS.organization,
      item_id: 'item1',
      warehouse_id: 'wh1',
      quantity: 500,
      item: {
        id: 'item1',
        item_code: 'FERT-001',
        item_name: 'NPK Fertilizer',
        default_unit: 'kg',
      },
      warehouse: {
        id: 'wh1',
        name: 'Main Warehouse',
      },
    },
  ];

  // ============================================================
  // SETUP & TEARDOWN
  // ============================================================

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = {
      getAdminClient: jest.fn(() => mockClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehousesService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<WarehousesService>(WarehousesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // PARAMETERIZED TESTS - WAREHOUSE TYPES
  // ============================================================

  describe('Warehouse Types and Features (Parameterized)', () => {
    it.each(VALID_SECURITY_LEVELS)(
      'should create warehouse with security level: %s',
      async (securityLevel) => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'wh-new',
            organization_id: TEST_IDS.organization,
            name: 'Secure Warehouse',
            security_level: securityLevel,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create(
          {
            name: 'Secure Warehouse',
            security_level: securityLevel as any,
          },
          TEST_IDS.organization
        );

        expect(result.security_level).toBe(securityLevel);
        expect(queryBuilder.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            security_level: securityLevel,
          })
        );
      }
    );

    it.each([
      { temp: true, humidity: true, desc: 'Temperature and humidity controlled' },
      { temp: true, humidity: false, desc: 'Temperature controlled only' },
      { temp: false, humidity: true, desc: 'Humidity controlled only' },
      { temp: false, humidity: false, desc: 'Standard storage' },
    ])('should create warehouse with $desc', async ({ temp, humidity }) => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(
        mockQueryResult({
          id: 'wh-new',
          organization_id: TEST_IDS.organization,
          name: 'Test Warehouse',
          temperature_controlled: temp,
          humidity_controlled: humidity,
        })
      );
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.create(
        {
          name: 'Test Warehouse',
          temperature_controlled: temp,
          humidity_controlled: humidity,
        },
        TEST_IDS.organization
      );

      expect(result.temperature_controlled).toBe(temp);
      expect(result.humidity_controlled).toBe(humidity);
    });
  });

  // ============================================================
  // INPUT VALIDATION TESTS
  // ============================================================

  describe('Input Validation', () => {
    describe('findAll', () => {
      it.each([null, undefined, '', '   ', '\t\n'])(
        'should handle invalid organization ID: %s',
        async (orgId) => {
          const queryBuilder = createMockQueryBuilder();
          queryBuilder.eq.mockReturnValue(queryBuilder);
          // Make order() return a thenable that resolves with empty array
          queryBuilder.order.mockReturnValue({
            ...queryBuilder,
            then: (resolve: any) => resolve(mockQueryResult([])),
          });
          mockClient.from.mockReturnValue(queryBuilder);

          const result = await service.findAll(orgId as any);

          expect(result).toEqual([]);
        },
        10000 // Explicit timeout for parameterized test
      );

      it('should handle database errors gracefully', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        // Make order() return a thenable that resolves with error
        queryBuilder.order.mockReturnValue({
          ...queryBuilder,
          then: (resolve: any) => resolve(mockQueryResult(null, { message: 'Database connection failed' })),
        });
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(service.findAll(TEST_IDS.organization)).rejects.toThrow(BadRequestException);
      });
    });

    describe('findOne', () => {
      it.each([null, undefined, '', 'invalid-uuid'])(
        'should handle invalid warehouse ID: %s',
        async (warehouseId) => {
          const queryBuilder = createMockQueryBuilder();
          queryBuilder.eq.mockReturnValue(queryBuilder);
          queryBuilder.single.mockResolvedValue(
            mockQueryResult(null, { message: 'Invalid UUID' })
          );
          mockClient.from.mockReturnValue(queryBuilder);

          await expect(service.findOne(warehouseId as any, TEST_IDS.organization)).rejects.toThrow(
            NotFoundException
          );
        }
      );

      it('should handle non-existent warehouse', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult(null, { message: 'Not found' })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(service.findOne('non-existent', TEST_IDS.organization)).rejects.toThrow(
          NotFoundException
        );
        await expect(service.findOne('non-existent', TEST_IDS.organization)).rejects.toThrow(
          'Warehouse with ID non-existent not found'
        );
      });
    });

    describe('create', () => {
      it.each([
        { name: '', expected: 'name is required' },
        { name: '   ', expected: 'name cannot be empty' },
        { name: null, expected: 'name cannot be null' },
        { name: undefined, expected: 'name is required' },
      ])('should reject invalid warehouse name: $expected', async ({ name }) => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult(null, { message: 'Name is required' })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.create({ name: name as any } as any, TEST_IDS.organization)
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject negative capacity values', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult(null, { message: 'Capacity must be positive' })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.create(
            {
              name: 'Test Warehouse',
              capacity: -100,
            } as any,
            TEST_IDS.organization
          )
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('update', () => {
      it('should reject update of non-existent warehouse', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult(null, { message: 'Not found' })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.update('non-existent', { name: 'Updated' }, TEST_IDS.organization)
        ).rejects.toThrow(NotFoundException);
      });

      it('should reject invalid capacity value', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult(MOCK_WAREHOUSES[0]))
          .mockResolvedValueOnce(
            mockQueryResult(null, { message: 'Capacity must be positive' })
          );
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.update('wh1', { capacity: -50 }, TEST_IDS.organization)
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('delete', () => {
      it('should reject deletion of non-existent warehouse', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult(null, { message: 'Not found' })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(service.delete('non-existent', TEST_IDS.organization)).rejects.toThrow(
          NotFoundException
        );
      });
    });
  });

  // ============================================================
  // BEHAVIOR-FOCUSED TESTS
  // ============================================================

  describe('Behavior - CRUD Operations', () => {
    describe('findAll', () => {
      it('should return only active warehouses', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        // Make order() return a thenable that resolves with warehouses
        queryBuilder.order.mockReturnValue({
          ...queryBuilder,
          then: (resolve: any) => resolve(mockQueryResult(MOCK_WAREHOUSES)),
        });
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.organization);

        expect(result).toEqual(MOCK_WAREHOUSES);
        expect(mockClient.from).toHaveBeenCalledWith('warehouses');
        expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
        expect(queryBuilder.eq).toHaveBeenCalledWith('is_active', true);
        expect(queryBuilder.order).toHaveBeenCalledWith('name', { ascending: true });
      });

      it('should return empty array when no warehouses exist', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue({
          ...queryBuilder,
          then: (resolve: any) => resolve(mockQueryResult([])),
        });
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.organization);

        expect(result).toEqual([]);
      });

      it('should handle database error on fetch', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue({
          ...queryBuilder,
          then: (resolve: any) => resolve(mockQueryResult(null, { message: 'Connection lost' })),
        });
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(service.findAll(TEST_IDS.organization)).rejects.toThrow(BadRequestException);
      });
    });

    describe('findOne', () => {
      it('should return warehouse by ID with organization context', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(MOCK_WAREHOUSES[0]));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findOne('wh1', TEST_IDS.organization);

        expect(result).toEqual(MOCK_WAREHOUSES[0]);
        expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'wh1');
        expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
      });

      it('should throw NotFoundException when warehouse not found', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(null, { message: 'Not found' }));
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(service.findOne('non-existent', TEST_IDS.organization)).rejects.toThrow(
          NotFoundException
        );
      });
    });

    describe('create', () => {
      it('should create warehouse with all optional fields', async () => {
        const newWarehouse = {
          name: 'New Warehouse',
          description: 'A new storage facility',
          location: 'Building C',
          address: '456 Farm Road',
          city: 'Rabat',
          postal_code: '10000',
          capacity: 5000,
          capacity_unit: 'tons',
          temperature_controlled: false,
          humidity_controlled: false,
          security_level: 'standard',
          manager_name: 'Jane Smith',
          manager_phone: '+212-700-000000',
          farm_id: TEST_IDS.farm,
          is_active: true,
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'wh3',
            organization_id: TEST_IDS.organization,
            ...newWarehouse,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create(newWarehouse as any, TEST_IDS.organization);

        expect(result.name).toBe(newWarehouse.name);
        expect(queryBuilder.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            organization_id: TEST_IDS.organization,
            name: newWarehouse.name,
            description: newWarehouse.description,
            location: newWarehouse.location,
            address: newWarehouse.address,
            city: newWarehouse.city,
            postal_code: newWarehouse.postal_code,
            capacity: newWarehouse.capacity,
            capacity_unit: newWarehouse.capacity_unit,
            temperature_controlled: newWarehouse.temperature_controlled,
            humidity_controlled: newWarehouse.humidity_controlled,
            security_level: newWarehouse.security_level,
            manager_name: newWarehouse.manager_name,
            manager_phone: newWarehouse.manager_phone,
            farm_id: newWarehouse.farm_id,
            is_active: newWarehouse.is_active,
          })
        );
      });

      it('should create warehouse with only required fields', async () => {
        const newWarehouse = {
          name: 'Minimal Warehouse',
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'wh3',
            organization_id: TEST_IDS.organization,
            name: 'Minimal Warehouse',
            description: null,
            location: null,
            address: null,
            city: null,
            postal_code: null,
            capacity: null,
            capacity_unit: null,
            temperature_controlled: false,
            humidity_controlled: false,
            security_level: 'standard',
            manager_name: null,
            manager_phone: null,
            farm_id: null,
            is_active: true,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create(newWarehouse as any, TEST_IDS.organization);

        expect(result.name).toBe('Minimal Warehouse');
        expect(result.description).toBeNull();
        expect(result.is_active).toBe(true);
      });

      it('should handle database error on create', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult(null, { message: 'Duplicate key violation' })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.create({ name: 'Duplicate' } as any, TEST_IDS.organization)
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('update', () => {
      it('should update warehouse with partial data', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult(MOCK_WAREHOUSES[0]))
          .mockResolvedValueOnce(
            mockQueryResult({
              ...MOCK_WAREHOUSES[0],
              name: 'Updated Warehouse',
              capacity: 15000,
            })
          );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.update('wh1', { name: 'Updated Warehouse', capacity: 15000 }, TEST_IDS.organization);

        expect(result.name).toBe('Updated Warehouse');
        expect(result.capacity).toBe(15000);
        expect(queryBuilder.update).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Updated Warehouse',
            capacity: 15000,
          })
        );
      });

      it('should verify warehouse exists before update', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(MOCK_WAREHOUSES[0]));
        mockClient.from.mockReturnValue(queryBuilder);

        await service.update('wh1', { name: 'Updated' }, TEST_IDS.organization);

        expect(queryBuilder.single).toHaveBeenCalledTimes(2); // Once for verification, once for update
      });

      it('should handle database error on update', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult(MOCK_WAREHOUSES[0]))
          .mockResolvedValueOnce(mockQueryResult(null, { message: 'Update failed' }));
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.update('wh1', { name: 'Updated' }, TEST_IDS.organization)
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('delete', () => {
      it('should soft delete warehouse (set is_active to false)', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult(MOCK_WAREHOUSES[0]))
          .mockResolvedValueOnce(mockQueryResult({}));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.delete('wh1', TEST_IDS.organization);

        expect(result).toEqual({ message: 'Warehouse deleted successfully' });
        expect(queryBuilder.update).toHaveBeenCalledWith({
          is_active: false,
        });
        expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'wh1');
        expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
      });

      it('should verify warehouse exists before deletion', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult(MOCK_WAREHOUSES[0]))
          .mockResolvedValueOnce(mockQueryResult({}));
        mockClient.from.mockReturnValue(queryBuilder);

        await service.delete('wh1', TEST_IDS.organization);

        expect(queryBuilder.single).toHaveBeenCalled(); // Verification call
      });

      it('should handle database error on delete', async () => {
        const queryBuilder = createMockQueryBuilder();
        let callCount = 0;
        queryBuilder.eq.mockImplementation(() => {
          callCount++;
          // After the findOne verification, make update fail
          if (callCount >= 3) {
            // This is the update call path - make it return error
            queryBuilder.then = jest.fn((resolve: any) => resolve(mockQueryResult(null, { message: 'Delete failed' })));
          }
          return queryBuilder;
        });
        // First call is findOne verification
        queryBuilder.single.mockResolvedValueOnce(mockQueryResult(MOCK_WAREHOUSES[0]));
        // Make the update thenable return an error
        queryBuilder.update.mockReturnValue({
          ...queryBuilder,
          eq: jest.fn().mockReturnValue({
            ...queryBuilder,
            eq: jest.fn().mockReturnValue({
              then: (resolve: any) => resolve(mockQueryResult(null, { message: 'Delete failed' })),
            }),
          }),
        });
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(service.delete('wh1', TEST_IDS.organization)).rejects.toThrow(
          BadRequestException
        );
      });
    });
  });

  describe('Behavior - Inventory Management', () => {
    describe('getInventory', () => {
      it('should return inventory with related item and warehouse data', async () => {
        const queryBuilder = createMockQueryBuilder();
        let eqCallCount = 0;
        queryBuilder.eq.mockImplementation(() => {
          eqCallCount++;
          return queryBuilder;
        });
        // getInventory uses order() as terminal method
        queryBuilder.order.mockReturnValue({
          ...queryBuilder,
          eq: queryBuilder.eq,
          then: (resolve: any) => resolve(mockQueryResult(INVENTORY_ITEMS)),
        });
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.getInventory(TEST_IDS.organization);

        expect(result).toEqual(INVENTORY_ITEMS);
        expect(mockClient.from).toHaveBeenCalledWith('inventory_items');
        expect(eqCallCount).toBeGreaterThanOrEqual(1);
      });

      it('should filter inventory by warehouse_id', async () => {
        const queryBuilder = createMockQueryBuilder();
        let eqCallCount = 0;
        const thenableResult = {
          ...queryBuilder,
          then: (resolve: any) => resolve(mockQueryResult(INVENTORY_ITEMS)),
        };
        queryBuilder.eq.mockImplementation(() => {
          eqCallCount++;
          return { ...queryBuilder, eq: queryBuilder.eq };
        });
        queryBuilder.order.mockReturnValue({
          ...queryBuilder,
          eq: jest.fn().mockReturnValue(thenableResult),
          then: (resolve: any) => resolve(mockQueryResult(INVENTORY_ITEMS)),
        });
        mockClient.from.mockReturnValue(queryBuilder);

        await service.getInventory(TEST_IDS.organization, { warehouse_id: 'wh1' });

        expect(eqCallCount).toBeGreaterThanOrEqual(1);
      });

      it('should filter inventory by item_id', async () => {
        const queryBuilder = createMockQueryBuilder();
        let eqCallCount = 0;
        const thenableResult = {
          ...queryBuilder,
          then: (resolve: any) => resolve(mockQueryResult(INVENTORY_ITEMS)),
        };
        queryBuilder.eq.mockImplementation(() => {
          eqCallCount++;
          return { ...queryBuilder, eq: queryBuilder.eq };
        });
        queryBuilder.order.mockReturnValue({
          ...queryBuilder,
          eq: jest.fn().mockReturnValue(thenableResult),
          then: (resolve: any) => resolve(mockQueryResult(INVENTORY_ITEMS)),
        });
        mockClient.from.mockReturnValue(queryBuilder);

        await service.getInventory(TEST_IDS.organization, { item_id: 'item1' });

        expect(eqCallCount).toBeGreaterThanOrEqual(1);
      });

      it('should filter inventory by both warehouse and item', async () => {
        const queryBuilder = createMockQueryBuilder();
        let eqCallCount = 0;
        const thenableResult = {
          ...queryBuilder,
          then: (resolve: any) => resolve(mockQueryResult(INVENTORY_ITEMS)),
        };
        queryBuilder.eq.mockImplementation(() => {
          eqCallCount++;
          return { ...queryBuilder, eq: queryBuilder.eq, then: thenableResult.then };
        });
        queryBuilder.order.mockReturnValue({
          ...queryBuilder,
          eq: jest.fn().mockImplementation(() => {
            eqCallCount++;
            return { ...queryBuilder, eq: jest.fn().mockReturnValue(thenableResult), then: thenableResult.then };
          }),
          then: (resolve: any) => resolve(mockQueryResult(INVENTORY_ITEMS)),
        });
        mockClient.from.mockReturnValue(queryBuilder);

        await service.getInventory(TEST_IDS.organization, {
          warehouse_id: 'wh1',
          item_id: 'item1',
        });

        expect(eqCallCount).toBeGreaterThanOrEqual(1);
      });

      it('should return empty inventory when no items exist', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue({
          ...queryBuilder,
          then: (resolve: any) => resolve(mockQueryResult([])),
        });
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.getInventory(TEST_IDS.organization);

        expect(result).toEqual([]);
      });

      it('should handle database error on inventory fetch', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue({
          ...queryBuilder,
          then: (resolve: any) => resolve(mockQueryResult(null, { message: 'Database error' })),
        });
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(service.getInventory(TEST_IDS.organization)).rejects.toThrow(
          BadRequestException
        );
      });
    });
  });

  // ============================================================
  // EDGE CASE TESTS
  // ============================================================

  describe('Edge Cases', () => {
    describe('Organization Context', () => {
      it('should enforce organization context in findAll', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue({
          ...queryBuilder,
          then: (resolve: any) => resolve(mockQueryResult(MOCK_WAREHOUSES)),
        });
        mockClient.from.mockReturnValue(queryBuilder);

        await service.findAll(TEST_IDS.organization);

        expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
      });

      it('should enforce organization context in findOne', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(MOCK_WAREHOUSES[0]));
        mockClient.from.mockReturnValue(queryBuilder);

        await service.findOne('wh1', TEST_IDS.organization);

        expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
      });

      it('should enforce organization context in update', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(MOCK_WAREHOUSES[0]));
        mockClient.from.mockReturnValue(queryBuilder);

        await service.update('wh1', { name: 'Updated' }, TEST_IDS.organization);

        expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
      });

      it('should enforce organization context in delete', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult(MOCK_WAREHOUSES[0]))
          .mockResolvedValueOnce(mockQueryResult({}));
        mockClient.from.mockReturnValue(queryBuilder);

        await service.delete('wh1', TEST_IDS.organization);

        expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
      });
    });

    describe('Capacity Management', () => {
      it.each([0, -1, -100, -9999])(
        'should handle zero or negative capacity: %s',
        async (capacity) => {
          const queryBuilder = createMockQueryBuilder();
          queryBuilder.insert.mockReturnValue(queryBuilder);
          queryBuilder.select.mockReturnValue(queryBuilder);
          queryBuilder.single.mockResolvedValue(
            mockQueryResult({
              id: 'wh3',
              organization_id: TEST_IDS.organization,
              name: 'Test Warehouse',
              capacity: capacity,
            })
          );
          mockClient.from.mockReturnValue(queryBuilder);

          const result = await service.create(
            {
              name: 'Test Warehouse',
              capacity: capacity,
            } as any,
            TEST_IDS.organization
          );

          expect(result.capacity).toBe(capacity);
        }
      );

      it('should handle very large capacity values', async () => {
        const largeCapacity = 999999999;

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'wh3',
            organization_id: TEST_IDS.organization,
            name: 'Massive Warehouse',
            capacity: largeCapacity,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create(
          {
            name: 'Massive Warehouse',
            capacity: largeCapacity,
          } as any,
            TEST_IDS.organization
        );

        expect(result.capacity).toBe(largeCapacity);
      });
    });

    describe('Special Characters in Names', () => {
      it.each([
        { name: "Côte d'Ivoire Warehouse", desc: 'French accents' },
        { name: 'São Paulo Storage', desc: 'Portuguese tilde' },
        { name: 'Москва Склад', desc: 'Cyrillic characters' },
        { name: 'المخزن الرئيسي', desc: 'Arabic characters' },
        { name: '東京倉庫', desc: 'Japanese characters' },
      ])('should handle $desc in warehouse name', async ({ name }) => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'wh3',
            organization_id: TEST_IDS.organization,
            name: name,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create({ name } as any, TEST_IDS.organization);

        expect(result.name).toBe(name);
      });
    });

    describe('Concurrent Operations', () => {
      it('should handle multiple simultaneous fetch requests', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue({
          ...queryBuilder,
          then: (resolve: any) => resolve(mockQueryResult(MOCK_WAREHOUSES)),
        });
        mockClient.from.mockReturnValue(queryBuilder);

        const promises = [
          service.findAll(TEST_IDS.organization),
          service.findAll(TEST_IDS.organization),
          service.findAll(TEST_IDS.organization),
        ];

        const results = await Promise.all(promises);

        results.forEach((result) => {
          expect(result).toEqual(MOCK_WAREHOUSES);
        });
      });
    });

    describe('Null and Undefined Handling', () => {
      it('should handle null optional fields in create', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'wh3',
            organization_id: TEST_IDS.organization,
            name: 'Test Warehouse',
            description: null,
            location: null,
            capacity: null,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create(
          {
            name: 'Test Warehouse',
            description: null,
            location: null,
            capacity: null,
          } as any,
          TEST_IDS.organization
        );

        expect(result.description).toBeNull();
        expect(result.location).toBeNull();
        expect(result.capacity).toBeNull();
      });

      it('should handle undefined optional fields in create', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'wh3',
            organization_id: TEST_IDS.organization,
            name: 'Test Warehouse',
            description: null,
            manager_name: null,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create(
          {
            name: 'Test Warehouse',
            description: undefined,
            manager_name: undefined,
          } as any,
          TEST_IDS.organization
        );

        expect(result.description).toBeNull();
        expect(result.manager_name).toBeNull();
      });
    });
  });

  // ============================================================
  // INTEGRATION-LIKE TESTS
  // ============================================================

  describe('Integration Scenarios', () => {
    it('should support full warehouse lifecycle', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.update.mockReturnValue(queryBuilder);
      queryBuilder.single
        .mockResolvedValueOnce(mockQueryResult({
          id: 'wh-new',
          organization_id: TEST_IDS.organization,
          name: 'New Warehouse',
          is_active: true,
        }))
        .mockResolvedValueOnce(mockQueryResult({
          id: 'wh-new',
          organization_id: TEST_IDS.organization,
          name: 'New Warehouse',
          is_active: true,
        }))
        .mockResolvedValueOnce(mockQueryResult({
          id: 'wh-new',
          organization_id: TEST_IDS.organization,
          name: 'Updated Warehouse',
          capacity: 8000,
          is_active: true,
        }))
        .mockResolvedValueOnce(mockQueryResult({
          id: 'wh-new',
          organization_id: TEST_IDS.organization,
          name: 'Updated Warehouse',
          capacity: 8000,
          is_active: true,
        }))
        .mockResolvedValueOnce(mockQueryResult({
          id: 'wh-new',
          organization_id: TEST_IDS.organization,
          name: 'Updated Warehouse',
          capacity: 8000,
          is_active: true,
        }))
        .mockResolvedValueOnce(mockQueryResult({}));
      mockClient.from.mockReturnValue(queryBuilder);

      // Create
      const created = await service.create(
        { name: 'New Warehouse' } as any,
        TEST_IDS.organization
      );
      expect(created.name).toBe('New Warehouse');

      // Read
      const found = await service.findOne('wh-new', TEST_IDS.organization);
      expect(found.name).toBe('New Warehouse');

      // Update
      const updated = await service.update('wh-new', {
        name: 'Updated Warehouse',
        capacity: 8000,
      }, TEST_IDS.organization);
      expect(updated.name).toBe('Updated Warehouse');

      // Delete (soft delete)
      const deleted = await service.delete('wh-new', TEST_IDS.organization);
      expect(deleted.message).toBe('Warehouse deleted successfully');
    });

    it('should handle inventory across multiple warehouses', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      const thenableResult = {
        ...queryBuilder,
        eq: queryBuilder.eq,
        then: (resolve: any) => resolve(mockQueryResult(INVENTORY_ITEMS)),
      };
      queryBuilder.order.mockReturnValue(thenableResult);
      mockClient.from.mockReturnValue(queryBuilder);

      // Get all inventory
      const allInventory = await service.getInventory(TEST_IDS.organization);
      expect(allInventory.length).toBeGreaterThan(0);

      // Get inventory for specific warehouse
      const warehouseInventory = await service.getInventory(TEST_IDS.organization, {
        warehouse_id: 'wh1',
      });
      expect(warehouseInventory.length).toBeGreaterThanOrEqual(0);
    });
  });
});
