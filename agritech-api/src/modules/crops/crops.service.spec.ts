import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CropsService } from './crops.service';
import { DatabaseService } from '../database/database.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  MockSupabaseClient,
  MockQueryBuilder,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('CropsService', () => {
  let service: CropsService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: { getAdminClient: jest.Mock };

  const MOCK_CROPS = [
    {
      id: 'crop-1',
      name: 'Wheat',
      farm_id: TEST_IDS.farm,
      parcel_id: TEST_IDS.parcel,
      status: 'active',
      farms: { id: TEST_IDS.farm, name: 'Main Farm', organization_id: TEST_IDS.organization },
      parcels: { id: TEST_IDS.parcel, parcel_name: 'Parcel A' },
      crop_varieties: { id: 'var-1', name: 'Hard Red' },
    },
    {
      id: 'crop-2',
      name: 'Corn',
      farm_id: TEST_IDS.farm,
      parcel_id: 'parcel-2',
      status: 'harvested',
      farms: { id: TEST_IDS.farm, name: 'Main Farm', organization_id: TEST_IDS.organization },
      parcels: { id: 'parcel-2', parcel_name: 'Parcel B' },
      crop_varieties: null,
    },
  ];

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = {
      getAdminClient: jest.fn(() => mockClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CropsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<CropsService>(CropsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // findAll
  // ============================================================

  describe('findAll', () => {
    it('should return PaginatedResponse shape', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then.mockImplementation((resolve) => {
        const result = { data: MOCK_CROPS, error: null, count: 2 };
        resolve(result);
        return Promise.resolve(result);
      });
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.findAll(TEST_IDS.organization);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('pageSize');
      expect(result).toHaveProperty('totalPages');
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(50);
    });

    it('should handle empty results', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then.mockImplementation((resolve) => {
        const result = { data: [], error: null, count: 0 };
        resolve(result);
        return Promise.resolve(result);
      });
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.findAll(TEST_IDS.organization);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should throw on database error', async () => {
      const queryBuilder = createMockQueryBuilder();
      const dbError = { message: 'DB failure' };
      queryBuilder.then.mockImplementation((resolve) => {
        const result = { data: null, error: dbError, count: null };
        resolve(result);
        return Promise.resolve(result);
      });
      mockClient.from.mockReturnValue(queryBuilder);

      await expect(service.findAll(TEST_IDS.organization)).rejects.toBe(dbError);
    });

    it('should apply farm_id filter', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then.mockImplementation((resolve) => {
        const result = { data: [MOCK_CROPS[0]], error: null, count: 1 };
        resolve(result);
        return Promise.resolve(result);
      });
      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(TEST_IDS.organization, { farm_id: TEST_IDS.farm });

      expect(queryBuilder.eq).toHaveBeenCalledWith('farm_id', TEST_IDS.farm);
    });

    it('should apply parcel_id filter', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then.mockImplementation((resolve) => {
        const result = { data: [MOCK_CROPS[0]], error: null, count: 1 };
        resolve(result);
        return Promise.resolve(result);
      });
      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(TEST_IDS.organization, { parcel_id: TEST_IDS.parcel });

      expect(queryBuilder.eq).toHaveBeenCalledWith('parcel_id', TEST_IDS.parcel);
    });

    it('should apply status filter', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then.mockImplementation((resolve) => {
        const result = { data: [MOCK_CROPS[0]], error: null, count: 1 };
        resolve(result);
        return Promise.resolve(result);
      });
      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(TEST_IDS.organization, { status: 'active' });

      expect(queryBuilder.eq).toHaveBeenCalledWith('status', 'active');
    });

    it('should flatten joined fields in response', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then.mockImplementation((resolve) => {
        const result = { data: [MOCK_CROPS[0]], error: null, count: 1 };
        resolve(result);
        return Promise.resolve(result);
      });
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.findAll(TEST_IDS.organization);

      expect(result.data[0]).toHaveProperty('farm_name', 'Main Farm');
      expect(result.data[0]).toHaveProperty('parcel_name', 'Parcel A');
      expect(result.data[0]).toHaveProperty('variety_name', 'Hard Red');
    });
  });

  // ============================================================
  // findOne
  // ============================================================

  describe('findOne', () => {
    it('should return a single crop', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue(mockQueryResult(MOCK_CROPS[0]));
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.findOne('crop-1', TEST_IDS.organization);

      expect(result).toHaveProperty('farm_name', 'Main Farm');
      expect(mockClient.from).toHaveBeenCalledWith('crops');
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'crop-1');
    });

    it('should throw NotFoundException when crop not found', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue(
        mockQueryResult(null, { message: 'Not found', code: 'PGRST116' }),
      );
      mockClient.from.mockReturnValue(queryBuilder);

      await expect(service.findOne('non-existent', TEST_IDS.organization))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // create
  // ============================================================

  describe('create', () => {
    it('should insert and return a crop', async () => {
      const newCrop = {
        name: 'Barley',
        farm_id: TEST_IDS.farm,
        parcel_id: TEST_IDS.parcel,
      };

      // First call: verify farm, second call: insert crop
      const farmQueryBuilder = createMockQueryBuilder();
      farmQueryBuilder.single.mockResolvedValue(mockQueryResult({ id: TEST_IDS.farm }));

      const cropQueryBuilder = createMockQueryBuilder();
      cropQueryBuilder.insert.mockReturnValue(cropQueryBuilder);
      cropQueryBuilder.select.mockReturnValue(cropQueryBuilder);
      cropQueryBuilder.single.mockResolvedValue(
        mockQueryResult({
          id: 'crop-new',
          ...newCrop,
          farms: { id: TEST_IDS.farm, name: 'Main Farm', organization_id: TEST_IDS.organization },
          parcels: { id: TEST_IDS.parcel, parcel_name: 'Parcel A' },
          crop_varieties: null,
        }),
      );

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'farms') return farmQueryBuilder;
        return cropQueryBuilder;
      });

      const result = await service.create(TEST_IDS.organization, newCrop as any);

      expect(result).toHaveProperty('id', 'crop-new');
      expect(result).toHaveProperty('farm_name', 'Main Farm');
    });
  });

  // ============================================================
  // update
  // ============================================================

  describe('update', () => {
    it('should patch and return a crop', async () => {
      // findOne mock (for verification)
      const findOneBuilder = createMockQueryBuilder();
      findOneBuilder.single.mockResolvedValue(mockQueryResult(MOCK_CROPS[0]));

      // update mock
      const updateBuilder = createMockQueryBuilder();
      updateBuilder.update.mockReturnValue(updateBuilder);
      updateBuilder.select.mockReturnValue(updateBuilder);
      updateBuilder.single.mockResolvedValue(
        mockQueryResult({
          ...MOCK_CROPS[0],
          name: 'Updated Wheat',
        }),
      );

      mockClient.from.mockReturnValue(findOneBuilder);

      // After findOne succeeds, subsequent from() calls use updateBuilder
      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount <= 1) return findOneBuilder;
        return updateBuilder;
      });

      const result = await service.update('crop-1', TEST_IDS.organization, { name: 'Updated Wheat' } as any);

      expect(result).toHaveProperty('name', 'Updated Wheat');
    });
  });

  // ============================================================
  // remove
  // ============================================================

  describe('remove', () => {
    it('should delete and return the id', async () => {
      // findOne mock
      const findOneBuilder = createMockQueryBuilder();
      findOneBuilder.single.mockResolvedValue(mockQueryResult(MOCK_CROPS[0]));

      // delete mock
      const deleteBuilder = createMockQueryBuilder();
      deleteBuilder.delete.mockReturnValue(deleteBuilder);
      deleteBuilder.then.mockImplementation((resolve) => {
        const result = { data: null, error: null };
        resolve(result);
        return Promise.resolve(result);
      });

      let callCount = 0;
      mockClient.from.mockImplementation(() => {
        callCount++;
        if (callCount <= 1) return findOneBuilder;
        return deleteBuilder;
      });

      const result = await service.remove('crop-1', TEST_IDS.organization);

      expect(result).toEqual({ id: 'crop-1' });
    });
  });
});
