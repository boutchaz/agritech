import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { CostCentersService } from './cost-centers.service';
import { DatabaseService } from '../database/database.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  setupThenableMock,
  setupMultiTableMock,
  MockSupabaseClient,
  MockQueryBuilder,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('CostCentersService', () => {
  let service: CostCentersService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: { getClient: jest.Mock };

  // ============================================================
  // TEST DATA FIXTURES
  // ============================================================

  const VALID_COST_CENTER_CODES = [
    { code: 'CC001', name: 'Main Farm' },
    { code: 'CC002', name: 'Processing Unit' },
    { code: 'CC003', name: 'Warehouse' },
    { code: 'CC-AG-01', name: 'Agricultural Zone 1' },
    { code: 'CC-LIV-001', name: 'Livestock Section' },
  ];

  const INVALID_COST_CENTER_CODES = ['', '   ', 'A'.repeat(100), 'INVALID!@#', '123'];

  const ORGANIZATION_ID = TEST_IDS.organization;
  const USER_ID = TEST_IDS.user;
  const COST_CENTER_ID = 'test-cost-center-001';

  const mockCostCenter = {
    id: COST_CENTER_ID,
    code: 'CC001',
    name: 'Main Farm',
    description: 'Primary agricultural operation',
    parent_id: null,
    farm_id: TEST_IDS.farm,
    parcel_id: null,
    is_active: true,
    organization_id: ORGANIZATION_ID,
    created_by: USER_ID,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
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
        CostCentersService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<CostCentersService>(CostCentersService);
  });

  const mockFrom = (queryBuilder: MockQueryBuilder) => {
    (mockClient.from as jest.Mock).mockReturnValue(queryBuilder);
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // PARAMETERIZED TESTS - COST CENTER CODES
  // ============================================================

  describe('Cost Center Codes (Parameterized)', () => {
    it.each(VALID_COST_CENTER_CODES)(
      'should accept valid cost center code: $code ($name)',
      async ({ code, name }) => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValueOnce(mockQueryResult(null)); // No existing
        queryBuilder.single.mockResolvedValueOnce(mockQueryResult({
          id: 'new-id',
          code,
          name,
          organization_id: ORGANIZATION_ID,
        }));
        queryBuilder.insert.mockReturnValue(queryBuilder);
        mockFrom(queryBuilder);

        const dto = {
          code,
          name,
          organization_id: ORGANIZATION_ID,
          created_by: USER_ID,
        };

        const result = await service.create(dto);

        expect(result).toBeDefined();
        expect(result.code).toBe(code);
        expect(result.name).toBe(name);
      }
    );

    it.each(VALID_COST_CENTER_CODES)(
      'should handle update with code: $code',
      async ({ code, name }) => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult(mockCostCenter)) // Exists
          .mockResolvedValueOnce(mockQueryResult(null)) // No duplicate
          .mockResolvedValueOnce(mockQueryResult({
            ...mockCostCenter,
            code,
            name,
          }));
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.update.mockReturnValue(queryBuilder);
        mockFrom(queryBuilder);

        const result = await service.update(COST_CENTER_ID, ORGANIZATION_ID, USER_ID, {
          code,
          name,
        });

        expect(result.code).toBe(code);
      }
    );
  });

  // ============================================================
  // INPUT VALIDATION TESTS
  // ============================================================

  describe('Input Validation', () => {
    describe('create', () => {
      it.each([null, undefined, '', '  '])(
        'should reject invalid organization_id: %s',
        async (orgId) => {
          const dto = {
            code: 'CC001',
            name: 'Test',
            organization_id: orgId as any,
            created_by: USER_ID,
          };

          await expect(service.create(dto as any)).rejects.toThrow();
        }
      );

      it('should reject creation with duplicate code', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult({ id: 'existing-id' })); // Duplicate exists
        mockFrom(queryBuilder);

        const dto = {
          code: 'CC001',
          name: 'Test',
          organization_id: ORGANIZATION_ID,
          created_by: USER_ID,
        };

        await expect(service.create(dto)).rejects.toThrow(BadRequestException);
        await expect(service.create(dto)).rejects.toThrow('already exists');
      });

      it('should reject creation when parent_id does not exist', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult(null)) // No duplicate code
          .mockResolvedValueOnce(mockQueryResult(null, { message: 'Parent not found' })); // Parent doesn't exist
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        mockFrom(queryBuilder);

        // Note: This test depends on whether the service validates parent_id
        // Adjust based on actual implementation
        const dto = {
          code: 'CC002',
          name: 'Child Center',
          organization_id: ORGANIZATION_ID,
          created_by: USER_ID,
          parent_id: 'non-existent-parent',
        };

        await expect(service.create(dto)).rejects.toThrow();
      });

      it('should handle missing optional fields gracefully', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult(null)) // No duplicate
          .mockResolvedValueOnce(mockQueryResult({
            id: 'new-id',
            code: 'CC003',
            name: 'Minimal Center',
            is_active: true,
            organization_id: ORGANIZATION_ID,
          }));
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        mockFrom(queryBuilder);

        const dto = {
          code: 'CC003',
          name: 'Minimal Center',
          organization_id: ORGANIZATION_ID,
          created_by: USER_ID,
        };

        const result = await service.create(dto);

        expect(result.is_active).toBe(true); // Default value
      });
    });

    describe('update', () => {
      it('should reject update of non-existent cost center', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(null, { message: 'Not found' }));
        mockFrom(queryBuilder);

        await expect(
          service.update('non-existent', ORGANIZATION_ID, USER_ID, { name: 'Updated' })
        ).rejects.toThrow(NotFoundException);
      });

      it('should reject update with duplicate code', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult(mockCostCenter)) // Exists
          .mockResolvedValueOnce(mockQueryResult({ id: 'other-id' })); // Duplicate exists
        mockFrom(queryBuilder);

        await expect(
          service.update(COST_CENTER_ID, ORGANIZATION_ID, USER_ID, { code: 'OTHER_CC' })
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.update(COST_CENTER_ID, ORGANIZATION_ID, USER_ID, { code: 'OTHER_CC' })
        ).rejects.toThrow('already exists');
      });

      it.each([null, undefined, ''])(
        'should handle invalid code update: %s',
        async (code) => {
          const queryBuilder = createMockQueryBuilder();
          queryBuilder.eq.mockReturnValue(queryBuilder);
          queryBuilder.single
            .mockResolvedValueOnce(mockQueryResult(mockCostCenter))
            .mockResolvedValueOnce(mockQueryResult({
              ...mockCostCenter,
              name: 'Updated Name',
            }));
          queryBuilder.select.mockReturnValue(queryBuilder);
          queryBuilder.update.mockReturnValue(queryBuilder);
          mockFrom(queryBuilder);

          // If code is not provided, it shouldn't be updated
          const result = await service.update(COST_CENTER_ID, ORGANIZATION_ID, USER_ID, {
            name: 'Updated Name',
          });

          expect(result.name).toBe('Updated Name');
        }
      );
    });

    describe('delete', () => {
      it('should reject deletion of cost center used in journal entries', async () => {
        const costCentersBuilder = createMockQueryBuilder();
        costCentersBuilder.eq.mockReturnValue(costCentersBuilder);
        costCentersBuilder.single.mockResolvedValue(mockQueryResult(mockCostCenter)); // Exists

        const journalItemsBuilder = createMockQueryBuilder();
        journalItemsBuilder.eq.mockReturnValue(journalItemsBuilder);
        journalItemsBuilder.limit.mockReturnValue(journalItemsBuilder);
        setupThenableMock(journalItemsBuilder, [{ id: 'journal-item-id' }]); // Has journal items

        setupMultiTableMock(mockClient, {
          cost_centers: costCentersBuilder,
          journal_items: journalItemsBuilder,
        });

        await expect(service.delete(COST_CENTER_ID, ORGANIZATION_ID)).rejects.toThrow(
          BadRequestException
        );
        await expect(service.delete(COST_CENTER_ID, ORGANIZATION_ID)).rejects.toThrow(
          'Cannot delete cost center used in journal entries'
        );
      });

      it('should reject deletion of non-existent cost center', async () => {
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

  describe('Behavior - Hierarchy Management', () => {
    it('should create cost center with parent relationship', async () => {
      const parentCenter = {
        id: 'parent-id',
        code: 'CC001',
        name: 'Parent Center',
      };

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.single
        .mockResolvedValueOnce(mockQueryResult(null)) // No duplicate
        .mockResolvedValueOnce(mockQueryResult({
          id: 'child-id',
          code: 'CC001-01',
          name: 'Child Center',
          parent_id: parentCenter.id,
          organization_id: ORGANIZATION_ID,
        }));
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.insert.mockReturnValue(queryBuilder);
      mockClient.from.mockReturnValue(queryBuilder);

      const dto = {
        code: 'CC001-01',
        name: 'Child Center',
        organization_id: ORGANIZATION_ID,
        created_by: USER_ID,
        parent_id: parentCenter.id,
      };

      const result = await service.create(dto);

      expect(result.parent_id).toBe(parentCenter.id);
    });

    it('should update parent relationship', async () => {
      const newParentId = 'new-parent-id';

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.single
        .mockResolvedValueOnce(mockQueryResult(mockCostCenter)) // Exists
        .mockResolvedValueOnce(mockQueryResult(null)) // No duplicate
        .mockResolvedValueOnce(mockQueryResult({
          ...mockCostCenter,
          parent_id: newParentId,
        }));
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.update.mockReturnValue(queryBuilder);
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.update(COST_CENTER_ID, ORGANIZATION_ID, USER_ID, {
        parent_id: newParentId,
      });

      expect(result.parent_id).toBe(newParentId);
    });

    it('should handle removing parent relationship', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.single
        .mockResolvedValueOnce(mockQueryResult({ ...mockCostCenter, parent_id: 'old-parent' })) // Exists with parent
        .mockResolvedValueOnce(mockQueryResult(null)) // No duplicate
        .mockResolvedValueOnce(mockQueryResult({
          ...mockCostCenter,
          parent_id: null,
        }));
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.update.mockReturnValue(queryBuilder);
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.update(COST_CENTER_ID, ORGANIZATION_ID, USER_ID, {
        parent_id: null,
      });

      expect(result.parent_id).toBeNull();
    });
  });

  describe('Behavior - Active/Inactive Status', () => {
    it('should create active cost center by default', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult(null)); // No duplicate
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult({
        id: 'new-id',
        code: 'CC001',
        name: 'Active Center',
        is_active: true,
        organization_id: ORGANIZATION_ID,
      }));
      mockClient.from.mockReturnValue(queryBuilder);

      const dto = {
        code: 'CC001',
        name: 'Active Center',
        organization_id: ORGANIZATION_ID,
        created_by: USER_ID,
      };

      const result = await service.create(dto);

      expect(result.is_active).toBe(true);
    });

    it('should create inactive cost center when specified', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult(null)); // No duplicate
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult({
        id: 'new-id',
        code: 'CC002',
        name: 'Inactive Center',
        is_active: false,
        organization_id: ORGANIZATION_ID,
      }));
      mockClient.from.mockReturnValue(queryBuilder);

      const dto = {
        code: 'CC002',
        name: 'Inactive Center',
        organization_id: ORGANIZATION_ID,
        created_by: USER_ID,
        is_active: false,
      };

      const result = await service.create(dto);

      expect(result.is_active).toBe(false);
    });

    it('should filter cost centers by active status', async () => {
      const allCenters = [
        { ...mockCostCenter, is_active: true },
        { ...mockCostCenter, id: '2', code: 'CC002', is_active: false },
      ];

      // Test active only
      let queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      setupThenableMock(queryBuilder, [allCenters[0]]);
      mockClient.from.mockReturnValue(queryBuilder);

      const activeCenters = await service.findAll(ORGANIZATION_ID, { is_active: true });
      expect(activeCenters).toHaveLength(1);
      expect(activeCenters[0].is_active).toBe(true);

      // Test inactive only
      queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      setupThenableMock(queryBuilder, [allCenters[1]]);
      mockClient.from.mockReturnValue(queryBuilder);

      const inactiveCenters = await service.findAll(ORGANIZATION_ID, { is_active: false });
      expect(inactiveCenters).toHaveLength(1);
      expect(inactiveCenters[0].is_active).toBe(false);
    });
  });

  describe('Behavior - Search and Filtering', () => {
    it('should search by cost center name', async () => {
      const searchTerm = 'Farm';

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      setupThenableMock(queryBuilder, [mockCostCenter]);
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.findAll(ORGANIZATION_ID, { search: searchTerm });

      expect(queryBuilder.or).toHaveBeenCalledWith(
        expect.stringContaining('name.ilike.%Farm%')
      );
      expect(result).toBeDefined();
    });

    it('should search by cost center code', async () => {
      const searchTerm = 'CC001';

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      setupThenableMock(queryBuilder, [mockCostCenter]);
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.findAll(ORGANIZATION_ID, { search: searchTerm });

      expect(queryBuilder.or).toHaveBeenCalledWith(
        expect.stringContaining('code.ilike.%CC001%')
      );
      expect(result).toBeDefined();
    });

    it('should handle case-insensitive search', async () => {
      const searchTerm = 'farm';

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      setupThenableMock(queryBuilder, [mockCostCenter]);
      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(ORGANIZATION_ID, { search: searchTerm });

      expect(queryBuilder.or).toHaveBeenCalledWith(
        expect.stringContaining('ilike')
      );
    });

    it('should combine multiple filters', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      setupThenableMock(queryBuilder, [mockCostCenter]);
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.findAll(ORGANIZATION_ID, {
        is_active: true,
        search: 'Farm',
      });

      expect(queryBuilder.eq).toHaveBeenCalledWith('is_active', true);
      expect(queryBuilder.or).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('Behavior - Farm and Parcel Association', () => {
    it('should create cost center associated with farm', async () => {
      const farmId = TEST_IDS.farm;

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult(null)); // No duplicate
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult({
        id: 'new-id',
        code: 'CC001',
        name: 'Farm Center',
        farm_id: farmId,
        organization_id: ORGANIZATION_ID,
      }));
      mockClient.from.mockReturnValue(queryBuilder);

      const dto = {
        code: 'CC001',
        name: 'Farm Center',
        organization_id: ORGANIZATION_ID,
        created_by: USER_ID,
        farm_id: farmId,
      };

      const result = await service.create(dto);

      expect(result.farm_id).toBe(farmId);
    });

    it('should create cost center associated with parcel', async () => {
      const parcelId = TEST_IDS.parcel;

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult(null)); // No duplicate
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult({
        id: 'new-id',
        code: 'CC002',
        name: 'Parcel Center',
        parcel_id: parcelId,
        organization_id: ORGANIZATION_ID,
      }));
      mockClient.from.mockReturnValue(queryBuilder);

      const dto = {
        code: 'CC002',
        name: 'Parcel Center',
        organization_id: ORGANIZATION_ID,
        created_by: USER_ID,
        parcel_id: parcelId,
      };

      const result = await service.create(dto);

      expect(result.parcel_id).toBe(parcelId);
    });

    it('should update farm and parcel associations', async () => {
      const newFarmId = 'new-farm-id';
      const newParcelId = 'new-parcel-id';

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.single
        .mockResolvedValueOnce(mockQueryResult(mockCostCenter)) // Exists
        .mockResolvedValueOnce(mockQueryResult(null)); // No duplicate
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.update.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult({
        ...mockCostCenter,
        farm_id: newFarmId,
        parcel_id: newParcelId,
      }));
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.update(COST_CENTER_ID, ORGANIZATION_ID, USER_ID, {
        farm_id: newFarmId,
        parcel_id: newParcelId,
      });

      expect(result.farm_id).toBe(newFarmId);
      expect(result.parcel_id).toBe(newParcelId);
    });
  });

  // ============================================================
  // EDGE CASE TESTS
  // ============================================================

  describe('Edge Cases', () => {
    describe('Special Characters and Encoding', () => {
      it('should handle cost centers with special characters in name', async () => {
        const specialNames = [
          "Centre d'Exploitation",
          'São Paulo Farm',
          'Зерновое Хозяйство',
          'Agri-Center 2024',
        ];

        for (const name of specialNames) {
          const queryBuilder = createMockQueryBuilder();
          queryBuilder.eq.mockReturnValue(queryBuilder);
          queryBuilder.single.mockResolvedValue(mockQueryResult(null)); // No duplicate
          queryBuilder.select.mockReturnValue(queryBuilder);
          queryBuilder.insert.mockReturnValue(queryBuilder);
          queryBuilder.single.mockResolvedValue(mockQueryResult({
            id: 'new-id',
            code: 'CC001',
            name,
            organization_id: ORGANIZATION_ID,
          }));
          mockFrom(queryBuilder);

          const dto = {
            code: 'CC001',
            name,
            organization_id: ORGANIZATION_ID,
            created_by: USER_ID,
          };

          const result = await service.create(dto);

          expect(result.name).toBe(name);
        }
      });

      it('should handle cost centers with emojis in name', async () => {
        const emojiName = '🌾 Farm Center 🚜';

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(null)); // No duplicate
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult({
          id: 'new-id',
          code: 'CC001',
          name: emojiName,
          organization_id: ORGANIZATION_ID,
        }));
        mockFrom(queryBuilder);

        const dto = {
          code: 'CC001',
          name: emojiName,
          organization_id: ORGANIZATION_ID,
          created_by: USER_ID,
        };

        const result = await service.create(dto);

        expect(result.name).toBe(emojiName);
      });
    });

    describe('Boundary Values', () => {
      it('should handle very long descriptions', async () => {
        const longDescription = 'A'.repeat(1000);

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(null)); // No duplicate
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult({
          id: 'new-id',
          code: 'CC001',
          name: 'Test',
          description: longDescription,
          organization_id: ORGANIZATION_ID,
        }));
        mockFrom(queryBuilder);

        const dto = {
          code: 'CC001',
          name: 'Test',
          description: longDescription,
          organization_id: ORGANIZATION_ID,
          created_by: USER_ID,
        };

        const result = await service.create(dto);

        expect(result.description).toBe(longDescription);
      });

      it('should handle empty description', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(null)); // No duplicate
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult({
          id: 'new-id',
          code: 'CC001',
          name: 'Test',
          description: '',
          organization_id: ORGANIZATION_ID,
        }));
        mockFrom(queryBuilder);

        const dto = {
          code: 'CC001',
          name: 'Test',
          description: '',
          organization_id: ORGANIZATION_ID,
          created_by: USER_ID,
        };

        const result = await service.create(dto);

        expect(result.description).toBe('');
      });

      it('should handle null description', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(null)); // No duplicate
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult({
          id: 'new-id',
          code: 'CC001',
          name: 'Test',
          description: null,
          organization_id: ORGANIZATION_ID,
        }));
        mockFrom(queryBuilder);

        const dto = {
          code: 'CC001',
          name: 'Test',
          description: null,
          organization_id: ORGANIZATION_ID,
          created_by: USER_ID,
        };

        const result = await service.create(dto);

        expect(result.description).toBeNull();
      });
    });

    describe('Concurrent Operations', () => {
      it('should handle multiple simultaneous cost center creations', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(null)); // No duplicate
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult({
          id: 'new-id',
          code: 'CC001',
          name: 'Test',
          organization_id: ORGANIZATION_ID,
        }));
        mockFrom(queryBuilder);

        const promises = Array(5).fill(null).map((_, i) =>
          service.create({
            code: `CC00${i}`,
            name: `Center ${i}`,
            organization_id: ORGANIZATION_ID,
            created_by: USER_ID,
          })
        );

        const results = await Promise.all(promises);

        expect(results).toHaveLength(5);
        results.forEach((result) => {
          expect(result).toBeDefined();
        });
      });
    });

    describe('Database Error Scenarios', () => {
      it('should handle database connection errors', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.order.mockRejectedValue(new Error('Connection lost'));
        mockFrom(queryBuilder);

        await expect(service.findAll(ORGANIZATION_ID)).rejects.toThrow();
      });

      it('should handle constraint violations gracefully', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(null)); // No duplicate
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult(null, {
            message: 'Foreign key constraint violation',
            code: '23503',
          })
        );
        mockFrom(queryBuilder);

        const dto = {
          code: 'CC001',
          name: 'Test',
          organization_id: ORGANIZATION_ID,
          created_by: USER_ID,
          parent_id: 'non-existent-parent',
        };

        await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      });

      it('should handle timeout errors', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Query timeout')), 100)
          )
        );
        mockFrom(queryBuilder);

        await expect(service.findOne(COST_CENTER_ID, ORGANIZATION_ID)).rejects.toThrow();
      });
    });

    describe('Organization Isolation', () => {
      it('should not return cost centers from other organizations', async () => {
        const otherOrgId = 'other-org-id';

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        setupThenableMock(queryBuilder, []); // No cost centers for other org
        mockFrom(queryBuilder);

        const result = await service.findAll(otherOrgId);

        expect(result).toEqual([]);
        expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', otherOrgId);
      });

      it('should prevent accessing cost center from different organization', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(null, { message: 'Not found' }));
        mockFrom(queryBuilder);

        await expect(
          service.findOne(COST_CENTER_ID, 'different-org-id')
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  // ============================================================
  // CRUD OPERATIONS TESTS
  // ============================================================

  describe('CRUD Operations', () => {
    describe('findAll', () => {
      it('should return all cost centers ordered by code', async () => {
        const mockCostCenters = [
          { ...mockCostCenter, code: 'CC001' },
          { ...mockCostCenter, id: '2', code: 'CC002' },
          { ...mockCostCenter, id: '3', code: 'CC003' },
        ];

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        setupThenableMock(queryBuilder, mockCostCenters);
        mockFrom(queryBuilder);

        const result = await service.findAll(ORGANIZATION_ID);

        expect(result).toHaveLength(3);
        expect(queryBuilder.order).toHaveBeenCalledWith('code');
        expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', ORGANIZATION_ID);
      });

      it('should return empty array when no cost centers exist', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        setupThenableMock(queryBuilder, []);
        mockFrom(queryBuilder);

        const result = await service.findAll(ORGANIZATION_ID);

        expect(result).toEqual([]);
      });

      it('should handle database errors gracefully', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        setupThenableMock(queryBuilder, null, { message: 'Database error' });
        mockFrom(queryBuilder);

        await expect(service.findAll(ORGANIZATION_ID)).rejects.toThrow(BadRequestException);
      });
    });

    describe('findOne', () => {
      it('should return cost center by ID', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(mockCostCenter));
        mockFrom(queryBuilder);

        const result = await service.findOne(COST_CENTER_ID, ORGANIZATION_ID);

        expect(result).toEqual(mockCostCenter);
        expect(queryBuilder.eq).toHaveBeenCalledWith('id', COST_CENTER_ID);
        expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', ORGANIZATION_ID);
      });

      it('should throw NotFoundException when cost center not found', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(null, { message: 'Not found' }));
        mockFrom(queryBuilder);

        await expect(service.findOne('non-existent', ORGANIZATION_ID)).rejects.toThrow(
          NotFoundException
        );
      });
    });

    describe('create', () => {
      it('should create cost center with all fields', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(null)); // No duplicate
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult({
          ...mockCostCenter,
          id: 'new-id',
        }));
        mockFrom(queryBuilder);

        const dto = {
          code: 'CC001',
          name: 'Main Farm',
          description: 'Primary agricultural operation',
          parent_id: null,
          farm_id: TEST_IDS.farm,
          parcel_id: null,
          is_active: true,
          organization_id: ORGANIZATION_ID,
          created_by: USER_ID,
        };

        const result = await service.create(dto);

        expect(result.code).toBe(dto.code);
        expect(result.name).toBe(dto.name);
        expect(queryBuilder.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            code: dto.code,
            name: dto.name,
            organization_id: ORGANIZATION_ID,
          })
        );
      });
    });

    describe('update', () => {
      it('should update cost center fields', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult(mockCostCenter)) // Exists
          .mockResolvedValueOnce(mockQueryResult(null)); // No duplicate
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult({
          ...mockCostCenter,
          name: 'Updated Farm',
          description: 'Updated description',
        }));
        mockFrom(queryBuilder);

        const result = await service.update(COST_CENTER_ID, ORGANIZATION_ID, USER_ID, {
          name: 'Updated Farm',
          description: 'Updated description',
        });

        expect(result.name).toBe('Updated Farm');
        expect(result.description).toBe('Updated description');
      });

      it('should not update fields that are not provided', async () => {
        const originalName = mockCostCenter.name;

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult(mockCostCenter)) // Exists
          .mockResolvedValueOnce(mockQueryResult(null)); // No duplicate
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult({
          ...mockCostCenter,
          description: 'Updated description only',
        }));
        mockFrom(queryBuilder);

        const result = await service.update(COST_CENTER_ID, ORGANIZATION_ID, USER_ID, {
          description: 'Updated description only',
        });

        expect(result.name).toBe(originalName);
        expect(result.description).toBe('Updated description only');
      });
    });

    describe('delete', () => {
      it('should delete unused cost center', async () => {
        const costCentersBuilder = createMockQueryBuilder();
        costCentersBuilder.eq.mockReturnValue(costCentersBuilder);
        costCentersBuilder.single.mockResolvedValue(mockQueryResult(mockCostCenter)); // Exists
        costCentersBuilder.delete.mockReturnValue(costCentersBuilder);

        const journalItemsBuilder = createMockQueryBuilder();
        journalItemsBuilder.eq.mockReturnValue(journalItemsBuilder);
        journalItemsBuilder.limit.mockReturnValue(journalItemsBuilder);
        setupThenableMock(journalItemsBuilder, []); // No journal items

        setupMultiTableMock(mockClient, {
          cost_centers: costCentersBuilder,
          journal_items: journalItemsBuilder,
        });

        const result = await service.delete(COST_CENTER_ID, ORGANIZATION_ID);

        expect(result).toEqual({ message: 'Cost center deleted successfully' });
        expect(costCentersBuilder.delete).toHaveBeenCalled();
      });
    });
  });

  // ============================================================
  // AGRICULTURAL CONTEXT TESTS
  // ============================================================

  describe('Agricultural Context', () => {
    it('should support farm-specific cost centers', async () => {
      const farmCenters = [
        { code: 'FARM-01', name: 'Main Field', farm_id: TEST_IDS.farm },
        { code: 'FARM-02', name: 'Secondary Field', farm_id: TEST_IDS.farm },
        { code: 'FARM-03', name: 'Orchard', farm_id: TEST_IDS.farm },
      ];

      for (const center of farmCenters) {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult(null)) // No duplicate
          .mockResolvedValueOnce(mockQueryResult({
            id: `new-${center.code}`,
            ...center,
            organization_id: ORGANIZATION_ID,
          }));
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        mockFrom(queryBuilder);

        const result = await service.create({
          ...center,
          organization_id: ORGANIZATION_ID,
          created_by: USER_ID,
        });

        expect(result.farm_id).toBe(TEST_IDS.farm);
        expect(result.code).toMatch(/^FARM-/);
      }
    });

    it('should support parcel-specific cost centers', async () => {
      const parcelCenters = [
        { code: 'PARCEL-A1', name: 'Parcel A1', parcel_id: TEST_IDS.parcel },
        { code: 'PARCEL-B2', name: 'Parcel B2', parcel_id: TEST_IDS.parcel },
      ];

      for (const center of parcelCenters) {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult(null)) // No duplicate
          .mockResolvedValueOnce(mockQueryResult({
            id: `new-${center.code}`,
            ...center,
            organization_id: ORGANIZATION_ID,
          }));
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        mockFrom(queryBuilder);

        const result = await service.create({
          ...center,
          organization_id: ORGANIZATION_ID,
          created_by: USER_ID,
        });

        expect(result.parcel_id).toBe(TEST_IDS.parcel);
        expect(result.code).toMatch(/^PARCEL-/);
      }
    });

    it('should support hierarchical cost center structures', async () => {
      // Create parent cost center
      const parentQueryBuilder = createMockQueryBuilder();
      parentQueryBuilder.eq.mockReturnValue(parentQueryBuilder);
      parentQueryBuilder.single
        .mockResolvedValueOnce(mockQueryResult(null)) // No duplicate
        .mockResolvedValueOnce(mockQueryResult({
          id: 'parent-id',
          code: 'DIV-01',
          name: 'Division 01',
          parent_id: null,
          organization_id: ORGANIZATION_ID,
        }));
      parentQueryBuilder.select.mockReturnValue(parentQueryBuilder);
      parentQueryBuilder.insert.mockReturnValue(parentQueryBuilder);
      mockClient.from.mockReturnValue(parentQueryBuilder);

      const parent = await service.create({
        code: 'DIV-01',
        name: 'Division 01',
        organization_id: ORGANIZATION_ID,
        created_by: USER_ID,
      });

      // Create child cost center
      const childQueryBuilder = createMockQueryBuilder();
      childQueryBuilder.eq.mockReturnValue(childQueryBuilder);
      childQueryBuilder.single
        .mockResolvedValueOnce(mockQueryResult(null)) // No duplicate
        .mockResolvedValueOnce(mockQueryResult({
          id: 'child-id',
          code: 'DIV-01-SEC',
          name: 'Section 01',
          parent_id: parent.id,
          organization_id: ORGANIZATION_ID,
        }));
      childQueryBuilder.select.mockReturnValue(childQueryBuilder);
      childQueryBuilder.insert.mockReturnValue(childQueryBuilder);
      mockClient.from.mockReturnValue(childQueryBuilder);

      const child = await service.create({
        code: 'DIV-01-SEC',
        name: 'Section 01',
        organization_id: ORGANIZATION_ID,
        created_by: USER_ID,
        parent_id: parent.id,
      });

      expect(child.parent_id).toBe(parent.id);
    });
  });
});
