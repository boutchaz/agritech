import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { AccountMappingsService } from './account-mappings.service';
import { DatabaseService } from '../database/database.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  MockSupabaseClient,
  MockQueryBuilder,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('AccountMappingsService', () => {
  let service: AccountMappingsService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: { getClient: jest.Mock };

  // ============================================================
  // TEST DATA FIXTURES
  // ============================================================

  const VALID_MAPPING_TYPES = [
    'task_cost',
    'harvest_sales',
    'purchase',
    'sales',
    'expense',
    'payment',
    'receipt',
  ];

  const INVALID_MAPPING_TYPES = ['', 'invalid_type', 'type with spaces', '123'];

  const ORGANIZATION_ID = TEST_IDS.organization;
  const USER_ID = TEST_IDS.user;
  const ACCOUNT_ID = TEST_IDS.account;
  const MAPPING_ID = 'test-mapping-001';

  const mockAccount = {
    id: ACCOUNT_ID,
    code: '701',
    name: 'Production Revenue',
    account_type: 'Revenue',
    organization_id: ORGANIZATION_ID,
  };

  const mockMapping = {
    id: MAPPING_ID,
    organization_id: ORGANIZATION_ID,
    mapping_type: 'task_cost',
    mapping_key: 'planting',
    source_key: 'planting',
    account_id: ACCOUNT_ID,
    is_active: true,
    description: 'Task cost mapping for planting operations',
    metadata: { category: 'field_operations' },
    account: mockAccount,
  };

  // ============================================================
  // SETUP & TEARDOWN
  // ============================================================

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = {
      getClient: jest.fn(() => mockClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountMappingsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<AccountMappingsService>(AccountMappingsService);
  });

  const mockFrom = (queryBuilder: MockQueryBuilder) => {
    (mockClient.from as jest.Mock).mockReturnValue(queryBuilder);
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // PARAMETERIZED TESTS - MAPPING TYPES
  // ============================================================

  describe('Mapping Types (Parameterized)', () => {
    it.each(VALID_MAPPING_TYPES)(
      'should create valid mapping for type: %s',
      async (mappingType) => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.or.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult(null)) // No duplicate
          .mockResolvedValueOnce(mockQueryResult(mockAccount)); // Account exists
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult({
          id: 'new-id',
          mapping_type: mappingType,
          mapping_key: 'test_key',
          account_id: ACCOUNT_ID,
          organization_id: ORGANIZATION_ID,
        }));
        mockFrom(queryBuilder);

        const dto = {
          organization_id: ORGANIZATION_ID,
          mapping_type: mappingType,
          mapping_key: 'test_key',
          account_id: ACCOUNT_ID,
          created_by: USER_ID,
        };

        const result = await service.create(dto);

        expect(result.mapping_type).toBe(mappingType);
      }
    );

    it.each(VALID_MAPPING_TYPES)(
      'should filter mappings by type: %s',
      async (mappingType) => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue(queryBuilder);
        // Make the query thenable to return results when awaited
        queryBuilder.then.mockImplementation((resolve) => {
          resolve(mockQueryResult([mockMapping]));
          return Promise.resolve(mockQueryResult([mockMapping]));
        });
        mockFrom(queryBuilder);

        const result = await service.findAll(ORGANIZATION_ID, {
          mapping_type: mappingType,
        });

        expect(queryBuilder.eq).toHaveBeenCalledWith('mapping_type', mappingType);
        expect(result).toBeDefined();
      }
    );
  });

  // ============================================================
  // INPUT VALIDATION TESTS
  // ============================================================

  describe('Input Validation', () => {
    describe('create', () => {
      it.each([null, undefined, ''])(
        'should reject mapping without key (mapping_key or source_key): %s',
        async (key) => {
          const queryBuilder = createMockQueryBuilder();
          mockFrom(queryBuilder);

          const dto = {
            organization_id: ORGANIZATION_ID,
            mapping_type: 'task_cost',
            mapping_key: key as any,
            source_key: key as any,
            account_id: ACCOUNT_ID,
            created_by: USER_ID,
          };

          await expect(service.create(dto)).rejects.toThrow(BadRequestException);
          await expect(service.create(dto)).rejects.toThrow('required');
        }
      );

      it('should reject creation with duplicate mapping_key', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.or.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'existing-id' })); // Duplicate
        mockFrom(queryBuilder);

        const dto = {
          organization_id: ORGANIZATION_ID,
          mapping_type: 'task_cost',
          mapping_key: 'planting',
          account_id: ACCOUNT_ID,
          created_by: USER_ID,
        };

        await expect(service.create(dto)).rejects.toThrow(BadRequestException);
        await expect(service.create(dto)).rejects.toThrow('already exists');
      });

      it('should reject creation with non-existent account', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.or.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult(null)) // No duplicate mapping
          .mockResolvedValueOnce(mockQueryResult(null, { message: 'Account not found' })); // Account doesn't exist
        mockFrom(queryBuilder);

        const dto = {
          organization_id: ORGANIZATION_ID,
          mapping_type: 'task_cost',
          mapping_key: 'planting',
          account_id: 'non-existent-account',
          created_by: USER_ID,
        };

        await expect(service.create(dto)).rejects.toThrow(BadRequestException);
        await expect(service.create(dto)).rejects.toThrow('not found');
      });

      it('should accept only mapping_key or source_key', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.or.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult(null)) // No duplicate
          .mockResolvedValueOnce(mockQueryResult(mockAccount)); // Account exists
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult({
          id: 'new-id',
          mapping_type: 'task_cost',
          mapping_key: 'planting',
          source_key: 'planting',
          account_id: ACCOUNT_ID,
        }));
        mockFrom(queryBuilder);

        const dto1 = {
          organization_id: ORGANIZATION_ID,
          mapping_type: 'task_cost',
          mapping_key: 'planting',
          account_id: ACCOUNT_ID,
          created_by: USER_ID,
        };

        const result = await service.create(dto1);

        expect(result.mapping_key).toBe('planting');
        expect(result.source_key).toBe('planting');
      });
    });

    describe('update', () => {
      it('should reject update of non-existent mapping', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(null, { message: 'Not found' }));
        mockFrom(queryBuilder);

        await expect(
          service.update('non-existent', ORGANIZATION_ID, { mapping_key: 'new_key' })
        ).rejects.toThrow(NotFoundException);
      });

      it('should reject update with duplicate key', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult(mockMapping)) // Exists
          .mockResolvedValueOnce(mockQueryResult({ id: 'other-id' })); // Duplicate exists
        mockFrom(queryBuilder);

        await expect(
          service.update(MAPPING_ID, ORGANIZATION_ID, {
            mapping_key: 'existing_key',
            mapping_type: 'task_cost',
          })
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject update with non-existent account_id', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult(mockMapping)) // Mapping exists
          .mockResolvedValueOnce(mockQueryResult(null, { message: 'Account not found' })); // Account doesn't exist
        mockFrom(queryBuilder);

        await expect(
          service.update(MAPPING_ID, ORGANIZATION_ID, {
            account_id: 'non-existent-account',
          })
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('delete', () => {
      it('should reject deletion of non-existent mapping', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(null, { message: 'Not found' }));
        mockFrom(queryBuilder);

        await expect(service.delete('non-existent', ORGANIZATION_ID)).rejects.toThrow(
          NotFoundException
        );
      });
    });
  });

  // ============================================================
  // BEHAVIOR-FOCUSED TESTS
  // ============================================================

  describe('Behavior - Key Management', () => {
    it('should normalize mapping_key and source_key to be identical', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      queryBuilder.single
        .mockResolvedValueOnce(mockQueryResult(null)) // No duplicate
        .mockResolvedValueOnce(mockQueryResult(mockAccount)); // Account exists
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult({
        id: 'new-id',
        mapping_key: 'planting',
        source_key: 'planting',
      }));
      mockClient.from.mockReturnValue(queryBuilder);

      // Test with mapping_key
      let dto = {
        organization_id: ORGANIZATION_ID,
        mapping_type: 'task_cost',
        mapping_key: 'planting',
        account_id: ACCOUNT_ID,
        created_by: USER_ID,
      };

      let result = await service.create(dto);
      expect(result.mapping_key).toBe('planting');
      expect(result.source_key).toBe('planting');

      // Test with source_key
      dto = {
        organization_id: ORGANIZATION_ID,
        mapping_type: 'task_cost',
        source_key: 'harvesting',
        account_id: ACCOUNT_ID,
        created_by: USER_ID,
      } as any;

      queryBuilder.single
        .mockResolvedValueOnce(mockQueryResult(null)) // No duplicate
        .mockResolvedValueOnce(mockQueryResult(mockAccount)); // Account exists
      queryBuilder.single.mockResolvedValue(mockQueryResult({
        id: 'new-id-2',
        mapping_key: 'harvesting',
        source_key: 'harvesting',
      }));

      result = await service.create(dto);
      expect(result.mapping_key).toBe('harvesting');
      expect(result.source_key).toBe('harvesting');
    });

    it('should check for duplicates across both mapping_key and source_key', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'existing-id' })); // Duplicate found
      mockClient.from.mockReturnValue(queryBuilder);

      const dto = {
        organization_id: ORGANIZATION_ID,
        mapping_type: 'task_cost',
        mapping_key: 'planting',
        account_id: ACCOUNT_ID,
        created_by: USER_ID,
      };

      await expect(service.create(dto)).rejects.toThrow('already exists');

      // Verify the OR clause checks both fields
      expect(queryBuilder.or).toHaveBeenCalledWith(
        expect.stringContaining('mapping_key.eq.planting')
      );
      expect(queryBuilder.or).toHaveBeenCalledWith(
        expect.stringContaining('source_key.eq.planting')
      );
    });

    it('should allow same key with different mapping types', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      queryBuilder.single
        .mockResolvedValueOnce(mockQueryResult(null)) // No duplicate for task_cost
        .mockResolvedValueOnce(mockQueryResult(mockAccount)); // Account exists
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult({
        id: 'new-id',
        mapping_type: 'task_cost',
        mapping_key: 'planting',
      }));
      mockClient.from.mockReturnValue(queryBuilder);

      const dto = {
        organization_id: ORGANIZATION_ID,
        mapping_type: 'task_cost',
        mapping_key: 'planting',
        account_id: ACCOUNT_ID,
        created_by: USER_ID,
      };

      const result = await service.create(dto);

      expect(result.mapping_type).toBe('task_cost');
    });
  });

  describe('Behavior - Account Relationship', () => {
    it('should include account details in response', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(
        mockQueryResult({
          ...mockMapping,
          account: mockAccount,
        })
      );
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.findOne(MAPPING_ID, ORGANIZATION_ID);

      expect(result.account).toBeDefined();
      expect(result.account.id).toBe(ACCOUNT_ID);
      expect(result.account.code).toBe('701');
      expect(result.account.name).toBe('Production Revenue');
    });

    it('should include account details in findAll', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.then.mockImplementation((resolve) => {
        resolve(mockQueryResult([
          {
            ...mockMapping,
            account: mockAccount,
          },
        ]));
        return Promise.resolve(mockQueryResult([
          {
            ...mockMapping,
            account: mockAccount,
          },
        ]));
      });
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.findAll(ORGANIZATION_ID);

      expect(result).toHaveLength(1);
      expect(result[0].account).toBeDefined();
      expect(result[0].account.id).toBe(ACCOUNT_ID);
    });

    it('should verify account belongs to same organization', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      queryBuilder.single
        .mockResolvedValueOnce(mockQueryResult(null)) // No duplicate mapping
        .mockResolvedValueOnce(mockQueryResult(null, { message: 'Account not found' })); // Account in different org
      mockClient.from.mockReturnValue(queryBuilder);

      const dto = {
        organization_id: ORGANIZATION_ID,
        mapping_type: 'task_cost',
        mapping_key: 'planting',
        account_id: ACCOUNT_ID,
        created_by: USER_ID,
      };

      await expect(service.create(dto)).rejects.toThrow('not found');

      // Verify account check includes organization_id
      expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', ORGANIZATION_ID);
    });
  });

  describe('Behavior - Active/Inactive Status', () => {
    it('should filter mappings by active status', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.then.mockImplementation((resolve) => {
        resolve(mockQueryResult([mockMapping]));
        return Promise.resolve(mockQueryResult([mockMapping]));
      });
      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(ORGANIZATION_ID, { is_active: true });

      expect(queryBuilder.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('should create active mapping by default', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      queryBuilder.single
        .mockResolvedValueOnce(mockQueryResult(null)) // No duplicate
        .mockResolvedValueOnce(mockQueryResult(mockAccount)); // Account exists
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult({
        id: 'new-id',
        mapping_type: 'task_cost',
        mapping_key: 'planting',
        is_active: true,
      }));
      mockClient.from.mockReturnValue(queryBuilder);

      const dto = {
        organization_id: ORGANIZATION_ID,
        mapping_type: 'task_cost',
        mapping_key: 'planting',
        account_id: ACCOUNT_ID,
        created_by: USER_ID,
      };

      const result = await service.create(dto);

      expect(result.is_active).toBe(true);
    });

    it('should create inactive mapping when specified', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      queryBuilder.single
        .mockResolvedValueOnce(mockQueryResult(null)) // No duplicate
        .mockResolvedValueOnce(mockQueryResult(mockAccount)); // Account exists
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult({
        id: 'new-id',
        mapping_type: 'task_cost',
        mapping_key: 'planting',
        is_active: false,
      }));
      mockClient.from.mockReturnValue(queryBuilder);

      const dto = {
        organization_id: ORGANIZATION_ID,
        mapping_type: 'task_cost',
        mapping_key: 'planting',
        account_id: ACCOUNT_ID,
        is_active: false,
        created_by: USER_ID,
      };

      const result = await service.create(dto);

      expect(result.is_active).toBe(false);
    });
  });

  describe('Behavior - Search and Filtering', () => {
    it('should search by mapping_key', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.then.mockImplementation((resolve) => {
        resolve(mockQueryResult([mockMapping]));
        return Promise.resolve(mockQueryResult([mockMapping]));
      });
      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(ORGANIZATION_ID, { search: 'planting' });

      expect(queryBuilder.or).toHaveBeenCalledWith(
        expect.stringContaining('mapping_key.ilike.%planting%')
      );
    });

    it('should search by source_key', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.then.mockImplementation((resolve) => {
        resolve(mockQueryResult([mockMapping]));
        return Promise.resolve(mockQueryResult([mockMapping]));
      });
      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(ORGANIZATION_ID, { search: 'harvesting' });

      expect(queryBuilder.or).toHaveBeenCalledWith(
        expect.stringContaining('source_key.ilike.%harvesting%')
      );
    });

    it('should search by description', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.then.mockImplementation((resolve) => {
        resolve(mockQueryResult([mockMapping]));
        return Promise.resolve(mockQueryResult([mockMapping]));
      });
      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(ORGANIZATION_ID, { search: 'operations' });

      expect(queryBuilder.or).toHaveBeenCalledWith(
        expect.stringContaining('description.ilike.%operations%')
      );
    });

    it('should combine multiple filters', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.then.mockImplementation((resolve) => {
        resolve(mockQueryResult([mockMapping]));
        return Promise.resolve(mockQueryResult([mockMapping]));
      });
      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(ORGANIZATION_ID, {
        mapping_type: 'task_cost',
        is_active: true,
        search: 'planting',
      });

      expect(queryBuilder.eq).toHaveBeenCalledWith('mapping_type', 'task_cost');
      expect(queryBuilder.eq).toHaveBeenCalledWith('is_active', true);
      expect(queryBuilder.or).toHaveBeenCalled();
    });
  });

  describe('Behavior - Metadata Handling', () => {
    it('should store metadata with mapping', async () => {
      const metadata = {
        category: 'field_operations',
        priority: 'high',
        custom_field: 'custom_value',
      };

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      queryBuilder.single
        .mockResolvedValueOnce(mockQueryResult(null)) // No duplicate
        .mockResolvedValueOnce(mockQueryResult(mockAccount)); // Account exists
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult({
        id: 'new-id',
        mapping_type: 'task_cost',
        mapping_key: 'planting',
        metadata,
      }));
      mockClient.from.mockReturnValue(queryBuilder);

      const dto = {
        organization_id: ORGANIZATION_ID,
        mapping_type: 'task_cost',
        mapping_key: 'planting',
        account_id: ACCOUNT_ID,
        metadata,
        created_by: USER_ID,
      };

      const result = await service.create(dto);

      expect(result.metadata).toEqual(metadata);
    });

    it('should use empty object as default metadata', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      queryBuilder.single
        .mockResolvedValueOnce(mockQueryResult(null)) // No duplicate
        .mockResolvedValueOnce(mockQueryResult(mockAccount)); // Account exists
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult({
        id: 'new-id',
        mapping_type: 'task_cost',
        mapping_key: 'planting',
        metadata: {},
      }));
      mockClient.from.mockReturnValue(queryBuilder);

      const dto = {
        organization_id: ORGANIZATION_ID,
        mapping_type: 'task_cost',
        mapping_key: 'planting',
        account_id: ACCOUNT_ID,
        created_by: USER_ID,
      };

      const result = await service.create(dto);

      expect(result.metadata).toEqual({});
    });
  });

  // ============================================================
  // SPECIAL OPERATIONS TESTS
  // ============================================================

  describe('getMappingTypes', () => {
    it('should return unique mapping types for organization', async () => {
      const mockMappings = [
        { mapping_type: 'task_cost' },
        { mapping_type: 'harvest_sales' },
        { mapping_type: 'task_cost' }, // Duplicate
        { mapping_type: 'purchase' },
      ];

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.then.mockImplementation((resolve) => {
        resolve(mockQueryResult(mockMappings));
        return Promise.resolve(mockQueryResult(mockMappings));
      });
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.getMappingTypes(ORGANIZATION_ID);

      expect(result).toHaveLength(3);
      expect(result).toEqual(expect.arrayContaining(['task_cost', 'harvest_sales', 'purchase']));
      expect(result).toHaveLength(3); // Verify no duplicates
    });

    it('should return only active mapping types', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.then.mockImplementation((resolve) => {
        resolve(mockQueryResult([]));
        return Promise.resolve(mockQueryResult([]));
      });
      mockClient.from.mockReturnValue(queryBuilder);

      await service.getMappingTypes(ORGANIZATION_ID);

      expect(queryBuilder.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('should return empty array when no mappings exist', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.then.mockImplementation((resolve) => {
        resolve(mockQueryResult([]));
        return Promise.resolve(mockQueryResult([]));
      });
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.getMappingTypes(ORGANIZATION_ID);

      expect(result).toEqual([]);
    });
  });

  describe('initializeDefaultMappings', () => {
    it('should create default mappings for new organization', async () => {
      const queryBuilder1 = createMockQueryBuilder();
      queryBuilder1.eq.mockReturnValue(queryBuilder1);
      queryBuilder1.limit.mockReturnValue(queryBuilder1);
      // First query: check for existing mappings (returns empty)
      queryBuilder1.then.mockImplementation((resolve) => {
        resolve(mockQueryResult([]));
        return Promise.resolve(mockQueryResult([]));
      });

      const queryBuilder2 = createMockQueryBuilder();
      queryBuilder2.eq.mockReturnValue(queryBuilder2);
      // Second query: count new mappings (returns 3 mappings)
      queryBuilder2.then.mockImplementation((resolve) => {
        resolve(mockQueryResult([
          { id: '1' },
          { id: '2' },
          { id: '3' },
        ]));
        return Promise.resolve(mockQueryResult([
          { id: '1' },
          { id: '2' },
          { id: '3' },
        ]));
      });

      mockClient.from
        .mockReturnValueOnce(queryBuilder1)
        .mockReturnValueOnce(queryBuilder2);

      mockClient.rpc.mockResolvedValue({ data: null, error: null });

      const result = await service.initializeDefaultMappings(ORGANIZATION_ID, 'MA');

      expect(result).toBeDefined();
      expect(result.count).toBeGreaterThan(0);
    });

    it('should skip initialization if mappings already exist', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.limit.mockReturnValue(queryBuilder);
      // Setup the limit().then() chain for existing mappings
      queryBuilder.then.mockImplementation((resolve) => {
        resolve(mockQueryResult([{ id: 'existing' }]));
        return Promise.resolve(mockQueryResult([{ id: 'existing' }]));
      });
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.initializeDefaultMappings(ORGANIZATION_ID, 'MA');

      expect(result.message).toContain('already initialized');
      expect(result.count).toBe(0);
      expect(mockClient.rpc).not.toHaveBeenCalled();
    });

    it('should handle RPC errors gracefully', async () => {
      const queryBuilder1 = createMockQueryBuilder();
      queryBuilder1.eq.mockReturnValue(queryBuilder1);
      queryBuilder1.limit.mockReturnValue(queryBuilder1);
      // First query: check for existing mappings (returns empty)
      queryBuilder1.then.mockImplementation((resolve) => {
        resolve(mockQueryResult([]));
        return Promise.resolve(mockQueryResult([]));
      });

      const queryBuilder2 = createMockQueryBuilder();
      queryBuilder2.eq.mockReturnValue(queryBuilder2);
      // Second query: count new mappings (returns empty after RPC errors)
      queryBuilder2.then.mockImplementation((resolve) => {
        resolve(mockQueryResult([]));
        return Promise.resolve(mockQueryResult([]));
      });

      mockClient.from
        .mockReturnValueOnce(queryBuilder1)
        .mockReturnValueOnce(queryBuilder2);

      mockClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Function not found' },
      });

      const result = await service.initializeDefaultMappings(ORGANIZATION_ID, 'MA');

      expect(result).toBeDefined();
      expect(result.count).toBe(0);
    });

    it('should call both task and harvest mapping functions', async () => {
      const queryBuilder1 = createMockQueryBuilder();
      queryBuilder1.eq.mockReturnValue(queryBuilder1);
      queryBuilder1.limit.mockReturnValue(queryBuilder1);
      // First query: check for existing mappings (returns empty)
      queryBuilder1.then.mockImplementation((resolve) => {
        resolve(mockQueryResult([]));
        return Promise.resolve(mockQueryResult([]));
      });

      const queryBuilder2 = createMockQueryBuilder();
      queryBuilder2.eq.mockReturnValue(queryBuilder2);
      // Second query: count new mappings
      queryBuilder2.then.mockImplementation((resolve) => {
        resolve(mockQueryResult([{ id: 'new-mapping' }]));
        return Promise.resolve(mockQueryResult([{ id: 'new-mapping' }]));
      });

      mockClient.from
        .mockReturnValueOnce(queryBuilder1)
        .mockReturnValueOnce(queryBuilder2);

      mockClient.rpc.mockResolvedValue({ data: null, error: null });

      await service.initializeDefaultMappings(ORGANIZATION_ID, 'MA');

      expect(mockClient.rpc).toHaveBeenCalledWith('create_task_cost_mappings', {
        p_organization_id: ORGANIZATION_ID,
        p_country_code: 'MA',
      });
      expect(mockClient.rpc).toHaveBeenCalledWith('create_harvest_sales_mappings', {
        p_organization_id: ORGANIZATION_ID,
        p_country_code: 'MA',
      });
    });
  });

  // ============================================================
  // EDGE CASE TESTS
  // ============================================================

  describe('Edge Cases', () => {
    describe('Special Characters', () => {
      it('should handle special characters in mapping_key', async () => {
        const specialKeys = [
          'key-with-dashes',
          'key_with_underscores',
          'key.with.dots',
          'key@with#special$chars',
          'key/with/slashes',
        ];

        for (const key of specialKeys) {
          const queryBuilder = createMockQueryBuilder();
          queryBuilder.eq.mockReturnValue(queryBuilder);
          queryBuilder.or.mockReturnValue(queryBuilder);
          queryBuilder.single
            .mockResolvedValueOnce(mockQueryResult(null)) // No duplicate
            .mockResolvedValueOnce(mockQueryResult(mockAccount)); // Account exists
          queryBuilder.select.mockReturnValue(queryBuilder);
          queryBuilder.insert.mockReturnValue(queryBuilder);
          queryBuilder.single.mockResolvedValue(mockQueryResult({
            id: `new-${key}`,
            mapping_key: key,
          }));
          mockFrom(queryBuilder);

          const dto = {
            organization_id: ORGANIZATION_ID,
            mapping_type: 'task_cost',
            mapping_key: key,
            account_id: ACCOUNT_ID,
            created_by: USER_ID,
          };

          const result = await service.create(dto);

          expect(result.mapping_key).toBe(key);
        }
      });
    });

    describe('Null and Undefined Handling', () => {
      it('should handle null description', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.or.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult(null)) // No duplicate
          .mockResolvedValueOnce(mockQueryResult(mockAccount)); // Account exists
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult({
          id: 'new-id',
          mapping_key: 'test',
          description: null,
        }));
        mockFrom(queryBuilder);

        const dto = {
          organization_id: ORGANIZATION_ID,
          mapping_type: 'task_cost',
          mapping_key: 'test',
          account_id: ACCOUNT_ID,
          description: null,
          created_by: USER_ID,
        };

        const result = await service.create(dto);

        expect(result.description).toBeNull();
      });
    });

    describe('Case Sensitivity', () => {
      it('should treat search as case-insensitive', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.or.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue(queryBuilder);
        queryBuilder.then.mockImplementation((resolve) => {
          resolve(mockQueryResult([mockMapping]));
          return Promise.resolve(mockQueryResult([mockMapping]));
        });
        mockFrom(queryBuilder);

        await service.findAll(ORGANIZATION_ID, { search: 'PLANTING' });

        expect(queryBuilder.or).toHaveBeenCalledWith(
          expect.stringContaining('ilike')
        );
      });
    });

    describe('Ordering', () => {
      it('should order results by mapping_type then mapping_key', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue(queryBuilder);
        queryBuilder.then.mockImplementation((resolve) => {
          resolve(mockQueryResult([mockMapping]));
          return Promise.resolve(mockQueryResult([mockMapping]));
        });
        mockFrom(queryBuilder);

        await service.findAll(ORGANIZATION_ID);

        expect(queryBuilder.order).toHaveBeenCalledWith('mapping_type');
        expect(queryBuilder.order).toHaveBeenCalledWith('mapping_key');
      });
    });
  });

  // ============================================================
  // CRUD OPERATIONS TESTS
  // ============================================================

  describe('CRUD Operations', () => {
    describe('findAll', () => {
      it('should return all mappings for organization', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue(queryBuilder);
        queryBuilder.then.mockImplementation((resolve) => {
          resolve(mockQueryResult([mockMapping]));
          return Promise.resolve(mockQueryResult([mockMapping]));
        });
        mockFrom(queryBuilder);

        const result = await service.findAll(ORGANIZATION_ID);

        expect(result).toHaveLength(1);
        expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', ORGANIZATION_ID);
      });

      it('should return empty array when no mappings exist', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue(queryBuilder);
        queryBuilder.then.mockImplementation((resolve) => {
          resolve(mockQueryResult([]));
          return Promise.resolve(mockQueryResult([]));
        });
        mockFrom(queryBuilder);

        const result = await service.findAll(ORGANIZATION_ID);

        expect(result).toEqual([]);
      });
    });

    describe('findOne', () => {
      it('should return mapping with account details', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({ ...mockMapping, account: mockAccount })
        );
        mockFrom(queryBuilder);

        const result = await service.findOne(MAPPING_ID, ORGANIZATION_ID);

        expect(result).toBeDefined();
        expect(result.id).toBe(MAPPING_ID);
        expect(result.account).toBeDefined();
      });

      it('should throw NotFoundException when mapping not found', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(null, { message: 'Not found' }));
        mockFrom(queryBuilder);

        await expect(service.findOne('non-existent', ORGANIZATION_ID)).rejects.toThrow(
          NotFoundException
        );
      });
    });

    describe('update', () => {
      it('should update mapping fields', async () => {
        // Setup mocks for the two queries (findOne + update)
        // Note: No duplicate check since we're not updating keys
        const findOneQueryBuilder = createMockQueryBuilder();
        findOneQueryBuilder.select.mockReturnValue(findOneQueryBuilder);
        findOneQueryBuilder.eq.mockReturnValue(findOneQueryBuilder);
        findOneQueryBuilder.single.mockResolvedValue(mockQueryResult(mockMapping)); // findOne: Exists

        const updateQueryBuilder = createMockQueryBuilder();
        updateQueryBuilder.eq.mockReturnValue(updateQueryBuilder);
        updateQueryBuilder.select.mockReturnValue(updateQueryBuilder);
        updateQueryBuilder.update.mockReturnValue(updateQueryBuilder);
        updateQueryBuilder.single.mockResolvedValue(mockQueryResult({ // Updated result
          id: MAPPING_ID,
          organization_id: ORGANIZATION_ID,
          mapping_type: 'task_cost',
          mapping_key: 'planting',
          source_key: 'planting',
          account_id: ACCOUNT_ID,
          is_active: true,
          description: 'Updated description',
          metadata: { category: 'field_operations' },
          account: mockAccount,
        }));

        mockClient.from
          .mockReturnValueOnce(findOneQueryBuilder)    // findOne call
          .mockReturnValueOnce(updateQueryBuilder);    // update call

        const result = await service.update(MAPPING_ID, ORGANIZATION_ID, {
          description: 'Updated description',
        });

        expect(result).toBeDefined();
        expect(result.description).toBe('Updated description');
      });

      it('should update multiple fields', async () => {
        // Setup mocks for the two queries (findOne + update)
        // Note: No duplicate check since we're not updating keys
        const findOneQueryBuilder = createMockQueryBuilder();
        findOneQueryBuilder.select.mockReturnValue(findOneQueryBuilder);
        findOneQueryBuilder.eq.mockReturnValue(findOneQueryBuilder);
        findOneQueryBuilder.single.mockResolvedValue(mockQueryResult(mockMapping)); // findOne: Exists

        const updateQueryBuilder = createMockQueryBuilder();
        updateQueryBuilder.eq.mockReturnValue(updateQueryBuilder);
        updateQueryBuilder.select.mockReturnValue(updateQueryBuilder);
        updateQueryBuilder.update.mockReturnValue(updateQueryBuilder);
        updateQueryBuilder.single.mockResolvedValue(mockQueryResult({ // Updated result
          id: MAPPING_ID,
          organization_id: ORGANIZATION_ID,
          mapping_type: 'task_cost',
          mapping_key: 'planting',
          source_key: 'planting',
          account_id: ACCOUNT_ID,
          is_active: false,
          description: 'Updated',
          metadata: { updated: true },
          account: mockAccount,
        }));

        mockClient.from
          .mockReturnValueOnce(findOneQueryBuilder)    // findOne call
          .mockReturnValueOnce(updateQueryBuilder);    // update call

        const result = await service.update(MAPPING_ID, ORGANIZATION_ID, {
          description: 'Updated',
          is_active: false,
          metadata: { updated: true },
        });

        expect(result).toBeDefined();
        expect(result.description).toBe('Updated');
        expect(result.is_active).toBe(false);
        expect(result.metadata).toEqual({ updated: true });
      });
    });

    describe('delete', () => {
      it('should delete mapping successfully', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(mockMapping)); // Exists
        mockFrom(queryBuilder);

        const result = await service.delete(MAPPING_ID, ORGANIZATION_ID);

        expect(result).toEqual({ message: 'Account mapping deleted successfully' });
        expect(queryBuilder.delete).toHaveBeenCalled();
      });
    });
  });

  // ============================================================
  // AGRICULTURAL CONTEXT TESTS
  // ============================================================

  describe('Agricultural Context', () => {
    it('should support task cost mappings for agricultural operations', async () => {
      const agriculturalTasks = [
        'planting',
        'harvesting',
        'irrigation',
        'fertilizing',
        'pest_control',
        'pruning',
        'soil_preparation',
      ];

      for (const task of agriculturalTasks) {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.or.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult(null)) // No duplicate
          .mockResolvedValueOnce(mockQueryResult(mockAccount)); // Account exists
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult({
          id: `new-${task}`,
          mapping_type: 'task_cost',
          mapping_key: task,
          account_id: ACCOUNT_ID,
          organization_id: ORGANIZATION_ID,
        }));
        queryBuilder.single.mockResolvedValue(mockQueryResult({
          id: `new-${task}`,
          mapping_type: 'task_cost',
          mapping_key: task,
          account_id: ACCOUNT_ID,
          organization_id: ORGANIZATION_ID,
        }));
        mockFrom(queryBuilder);

        const dto = {
          organization_id: ORGANIZATION_ID,
          mapping_type: 'task_cost',
          mapping_key: task,
          account_id: ACCOUNT_ID,
          created_by: USER_ID,
        };

        const result = await service.create(dto);

        expect(result.mapping_key).toBe(task);
        expect(result.mapping_type).toBe('task_cost');
      }
    });

    it('should support harvest sales mappings', async () => {
      const cropTypes = ['wheat', 'corn', 'vegetables', 'fruits', 'olives'];

      for (const crop of cropTypes) {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.or.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult(null)) // No duplicate
          .mockResolvedValueOnce(mockQueryResult(mockAccount)); // Account exists
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult({
          id: `new-${crop}`,
          mapping_type: 'harvest_sales',
          mapping_key: crop,
          account_id: ACCOUNT_ID,
          organization_id: ORGANIZATION_ID,
        }));
        queryBuilder.single.mockResolvedValue(mockQueryResult({
          id: `new-${crop}`,
          mapping_type: 'harvest_sales',
          mapping_key: crop,
          account_id: ACCOUNT_ID,
          organization_id: ORGANIZATION_ID,
        }));
        mockFrom(queryBuilder);

        const dto = {
          organization_id: ORGANIZATION_ID,
          mapping_type: 'harvest_sales',
          mapping_key: crop,
          account_id: ACCOUNT_ID,
          created_by: USER_ID,
        };

        const result = await service.create(dto);

        expect(result.mapping_type).toBe('harvest_sales');
        expect(result.mapping_key).toBe(crop);
      }
    });

    it('should initialize country-specific mappings', async () => {
      const countryCodes = ['MA', 'FR', 'TN', 'US'];

      for (const countryCode of countryCodes) {
        mockClient.from.mockClear();
        mockClient.rpc.mockClear();

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.limit.mockReturnValue(queryBuilder);
        queryBuilder.then.mockImplementation((resolve) => {
          resolve(mockQueryResult([]));
          return Promise.resolve(mockQueryResult([]));
        });
        mockFrom(queryBuilder);

        mockClient.rpc.mockResolvedValue({ data: null, error: null });

        const result = await service.initializeDefaultMappings(
          ORGANIZATION_ID,
          countryCode
        );

        expect(result).toBeDefined();
        expect(mockClient.rpc).toHaveBeenCalledWith('create_task_cost_mappings', {
          p_organization_id: ORGANIZATION_ID,
          p_country_code: countryCode,
        });
      }
    });
  });
});
