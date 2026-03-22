import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SoilAnalysesService } from './soil-analyses.service';
import { DatabaseService } from '../database/database.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  MockSupabaseClient,
  MockQueryBuilder,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('SoilAnalysesService', () => {
  let service: SoilAnalysesService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: { getAdminClient: jest.Mock };

  const MOCK_SOIL_ANALYSES = [
    {
      id: 'sa-1',
      parcel_id: TEST_IDS.parcel,
      analysis_date: '2024-06-01',
      test_type_id: 'tt-1',
      physical: { texture: 'clay' },
      chemical: { ph: 6.5 },
      biological: {},
      notes: 'Test analysis',
    },
    {
      id: 'sa-2',
      parcel_id: TEST_IDS.parcel,
      analysis_date: '2024-07-01',
      test_type_id: 'tt-2',
      physical: { texture: 'sandy' },
      chemical: { ph: 7.0 },
      biological: {},
      notes: null,
    },
  ];

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = {
      getAdminClient: jest.fn(() => mockClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SoilAnalysesService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<SoilAnalysesService>(SoilAnalysesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper: mock parcel ownership verification chain
  function setupParcelOwnershipMock() {
    const parcelBuilder = createMockQueryBuilder();
    parcelBuilder.maybeSingle.mockResolvedValue(
      mockQueryResult({ farm_id: TEST_IDS.farm }),
    );

    const farmBuilder = createMockQueryBuilder();
    farmBuilder.maybeSingle.mockResolvedValue(
      mockQueryResult({ organization_id: TEST_IDS.organization }),
    );

    return { parcelBuilder, farmBuilder };
  }

  // ============================================================
  // findAll — uses paginatedResponse directly
  // ============================================================

  describe('findAll', () => {
    it('should return PaginatedResponse shape', async () => {
      // soil_analyses query
      const saBuilder = createMockQueryBuilder();
      saBuilder.then.mockImplementation((resolve) => {
        const result = { data: MOCK_SOIL_ANALYSES, error: null };
        resolve(result);
        return Promise.resolve(result);
      });

      // parcels verification
      const parcelsBuilder = createMockQueryBuilder();
      parcelsBuilder.then.mockImplementation((resolve) => {
        const result = { data: [{ id: TEST_IDS.parcel, farm_id: TEST_IDS.farm }], error: null };
        resolve(result);
        return Promise.resolve(result);
      });

      // farms verification
      const farmsBuilder = createMockQueryBuilder();
      farmsBuilder.then.mockImplementation((resolve) => {
        const result = { data: [{ id: TEST_IDS.farm }], error: null };
        resolve(result);
        return Promise.resolve(result);
      });

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'soil_analyses') return saBuilder;
        if (table === 'parcels') return parcelsBuilder;
        if (table === 'farms') return farmsBuilder;
        return createMockQueryBuilder();
      });

      const result = await service.findAll(TEST_IDS.organization);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('pageSize');
      expect(result).toHaveProperty('totalPages');
      expect(result.data).toHaveLength(2);
    });

    it('should handle empty results', async () => {
      const saBuilder = createMockQueryBuilder();
      saBuilder.then.mockImplementation((resolve) => {
        const result = { data: [], error: null };
        resolve(result);
        return Promise.resolve(result);
      });

      mockClient.from.mockReturnValue(saBuilder);

      const result = await service.findAll(TEST_IDS.organization);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should throw on database error', async () => {
      const saBuilder = createMockQueryBuilder();
      saBuilder.then.mockImplementation((resolve) => {
        const result = { data: null, error: { message: 'DB failure' } };
        resolve(result);
        return Promise.resolve(result);
      });
      mockClient.from.mockReturnValue(saBuilder);

      await expect(service.findAll(TEST_IDS.organization)).rejects.toThrow(BadRequestException);
    });

    it('should apply parcel_id filter', async () => {
      const saBuilder = createMockQueryBuilder();
      saBuilder.then.mockImplementation((resolve) => {
        const result = { data: [], error: null };
        resolve(result);
        return Promise.resolve(result);
      });
      mockClient.from.mockReturnValue(saBuilder);

      await service.findAll(TEST_IDS.organization, { parcel_id: TEST_IDS.parcel } as any);

      expect(saBuilder.eq).toHaveBeenCalledWith('parcel_id', TEST_IDS.parcel);
    });

    it('should apply test_type_id filter', async () => {
      const saBuilder = createMockQueryBuilder();
      saBuilder.then.mockImplementation((resolve) => {
        const result = { data: [], error: null };
        resolve(result);
        return Promise.resolve(result);
      });
      mockClient.from.mockReturnValue(saBuilder);

      await service.findAll(TEST_IDS.organization, { test_type_id: 'tt-1' } as any);

      expect(saBuilder.eq).toHaveBeenCalledWith('test_type_id', 'tt-1');
    });

    it('should apply date_from filter', async () => {
      const saBuilder = createMockQueryBuilder();
      saBuilder.then.mockImplementation((resolve) => {
        const result = { data: [], error: null };
        resolve(result);
        return Promise.resolve(result);
      });
      mockClient.from.mockReturnValue(saBuilder);

      await service.findAll(TEST_IDS.organization, { date_from: '2024-06-01' } as any);

      expect(saBuilder.gte).toHaveBeenCalledWith('analysis_date', '2024-06-01');
    });

    it('should apply date_to filter', async () => {
      const saBuilder = createMockQueryBuilder();
      saBuilder.then.mockImplementation((resolve) => {
        const result = { data: [], error: null };
        resolve(result);
        return Promise.resolve(result);
      });
      mockClient.from.mockReturnValue(saBuilder);

      await service.findAll(TEST_IDS.organization, { date_to: '2024-12-31' } as any);

      expect(saBuilder.lte).toHaveBeenCalledWith('analysis_date', '2024-12-31');
    });
  });

  // ============================================================
  // findOne
  // ============================================================

  describe('findOne', () => {
    it('should return a single soil analysis', async () => {
      const saBuilder = createMockQueryBuilder();
      saBuilder.maybeSingle.mockResolvedValue(mockQueryResult(MOCK_SOIL_ANALYSES[0]));

      const { parcelBuilder, farmBuilder } = setupParcelOwnershipMock();

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'soil_analyses') return saBuilder;
        if (table === 'parcels') return parcelBuilder;
        if (table === 'farms') return farmBuilder;
        return createMockQueryBuilder();
      });

      const result = await service.findOne('sa-1', TEST_IDS.organization);

      expect(result).toEqual(MOCK_SOIL_ANALYSES[0]);
      expect(saBuilder.eq).toHaveBeenCalledWith('id', 'sa-1');
    });

    it('should throw NotFoundException when not found', async () => {
      const saBuilder = createMockQueryBuilder();
      saBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null));
      mockClient.from.mockReturnValue(saBuilder);

      await expect(service.findOne('non-existent', TEST_IDS.organization))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // create
  // ============================================================

  describe('create', () => {
    it('should insert and return a soil analysis', async () => {
      const { parcelBuilder, farmBuilder } = setupParcelOwnershipMock();

      const insertBuilder = createMockQueryBuilder();
      insertBuilder.insert.mockReturnValue(insertBuilder);
      insertBuilder.select.mockReturnValue(insertBuilder);
      insertBuilder.single.mockResolvedValue(
        mockQueryResult({
          id: 'sa-new',
          parcel_id: TEST_IDS.parcel,
          analysis_date: '2024-08-01',
        }),
      );

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'parcels') return parcelBuilder;
        if (table === 'farms') return farmBuilder;
        return insertBuilder;
      });

      const result = await service.create(
        {
          parcel_id: TEST_IDS.parcel,
          analysis_date: '2024-08-01',
        } as any,
        TEST_IDS.organization,
      );

      expect(result).toHaveProperty('id', 'sa-new');
    });
  });

  // ============================================================
  // update
  // ============================================================

  describe('update', () => {
    it('should patch and return a soil analysis', async () => {
      // findOne mocks
      const saFindBuilder = createMockQueryBuilder();
      saFindBuilder.maybeSingle.mockResolvedValue(mockQueryResult(MOCK_SOIL_ANALYSES[0]));

      const { parcelBuilder, farmBuilder } = setupParcelOwnershipMock();

      // update mock
      const updateBuilder = createMockQueryBuilder();
      updateBuilder.update.mockReturnValue(updateBuilder);
      updateBuilder.select.mockReturnValue(updateBuilder);
      updateBuilder.single.mockResolvedValue(
        mockQueryResult({ ...MOCK_SOIL_ANALYSES[0], notes: 'Updated notes' }),
      );

      let saCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'parcels') return parcelBuilder;
        if (table === 'farms') return farmBuilder;
        if (table === 'soil_analyses') {
          saCallCount++;
          if (saCallCount <= 1) return saFindBuilder;
          return updateBuilder;
        }
        return createMockQueryBuilder();
      });

      const result = await service.update('sa-1', TEST_IDS.organization, { notes: 'Updated notes' } as any);

      expect(result).toHaveProperty('notes', 'Updated notes');
    });
  });

  // ============================================================
  // delete
  // ============================================================

  describe('delete', () => {
    it('should delete and return success message', async () => {
      // findOne mocks
      const saFindBuilder = createMockQueryBuilder();
      saFindBuilder.maybeSingle.mockResolvedValue(mockQueryResult(MOCK_SOIL_ANALYSES[0]));

      const { parcelBuilder, farmBuilder } = setupParcelOwnershipMock();

      // delete mock
      const deleteBuilder = createMockQueryBuilder();
      deleteBuilder.delete.mockReturnValue(deleteBuilder);
      deleteBuilder.then.mockImplementation((resolve) => {
        const result = { data: null, error: null };
        resolve(result);
        return Promise.resolve(result);
      });

      let saCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'parcels') return parcelBuilder;
        if (table === 'farms') return farmBuilder;
        if (table === 'soil_analyses') {
          saCallCount++;
          if (saCallCount <= 1) return saFindBuilder;
          return deleteBuilder;
        }
        return createMockQueryBuilder();
      });

      const result = await service.delete('sa-1', TEST_IDS.organization);

      expect(result).toEqual({ message: 'Soil analysis deleted successfully' });
    });
  });
});
