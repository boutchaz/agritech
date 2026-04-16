import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { AnalysesService } from './analyses.service';
import { AnalysisType } from './dto';
import {
  createMockQueryBuilder,
  createMockSupabaseClient,
  mockQueryResult,
  setupTableMock,
  setupThenableMock,
  MockQueryBuilder,
  MockSupabaseClient,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('AnalysesService', () => {
  let service: AnalysesService;
  let mockClient: MockSupabaseClient;

  const analysisId = 'analysis-123';
  const recommendationId = 'recommendation-123';
  const secondParcelId = 'test-parcel-999';

  const analysisRecord = {
    id: analysisId,
    parcel_id: TEST_IDS.parcel,
    analysis_type: AnalysisType.SOIL,
    analysis_date: '2026-04-10',
    laboratory: 'AgriLab',
    data: { ph_level: 6.5 },
    notes: 'North field sample',
  };

  const createDto = {
    parcel_id: TEST_IDS.parcel,
    analysis_type: AnalysisType.SOIL,
    analysis_date: '2026-04-10',
    laboratory: 'AgriLab',
    data: { ph_level: 6.5 },
    notes: 'North field sample',
  };

  const configureFromMocks = (
    tableMap: Record<string, MockQueryBuilder | MockQueryBuilder[]>,
  ): void => {
    const callCounts = new Map<string, number>();

    mockClient.from.mockImplementation((table: string) => {
      const value = tableMap[table];

      if (Array.isArray(value)) {
        const nextIndex = callCounts.get(table) ?? 0;
        callCounts.set(table, nextIndex + 1);
        return value[nextIndex] ?? value[value.length - 1];
      }

      return value ?? createMockQueryBuilder();
    });
  };

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalysesService,
        { provide: DatabaseService, useValue: { getAdminClient: () => mockClient } },
      ],
    }).compile();

    service = module.get<AnalysesService>(AnalysesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns analyses for the organization and applies filters with pagination', async () => {
      const farmsBuilder = createMockQueryBuilder();
      const parcelsBuilder = createMockQueryBuilder();
      const analysesBuilder = createMockQueryBuilder();

      setupThenableMock(farmsBuilder, [{ id: TEST_IDS.farm }]);
      setupThenableMock(parcelsBuilder, [{ id: TEST_IDS.parcel }, { id: secondParcelId }]);
      analysesBuilder.then.mockImplementation(
        (resolve: (value: { data: typeof analysisRecord[]; error: null; count: number }) => void) => {
          const result = { data: [analysisRecord], error: null, count: 1 };
          resolve(result);
          return Promise.resolve(result);
        },
      );

      configureFromMocks({
        farms: farmsBuilder,
        parcels: parcelsBuilder,
        analyses: analysesBuilder,
      });

      const result = await service.findAll(TEST_IDS.organization, {
        analysis_type: AnalysisType.SOIL,
        date_from: '2026-04-01',
        date_to: '2026-04-30',
        page: 2,
        limit: 10,
      });

      expect(result).toEqual({ data: [analysisRecord], count: 1 });
      expect(farmsBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
      expect(parcelsBuilder.in).toHaveBeenCalledWith('farm_id', [TEST_IDS.farm]);
      expect(analysesBuilder.in).toHaveBeenCalledWith('parcel_id', [TEST_IDS.parcel, secondParcelId]);
      expect(analysesBuilder.eq).toHaveBeenCalledWith('analysis_type', AnalysisType.SOIL);
      expect(analysesBuilder.gte).toHaveBeenCalledWith('analysis_date', '2026-04-01');
      expect(analysesBuilder.lte).toHaveBeenCalledWith('analysis_date', '2026-04-30');
      expect(analysesBuilder.range).toHaveBeenCalledWith(10, 19);
      expect(analysesBuilder.order).toHaveBeenCalledWith('analysis_date', { ascending: false });
    });

    it('resolves parcel ids from the farm filter and returns empty results when the farm has no parcels', async () => {
      const parcelsBuilder = setupTableMock(mockClient, 'parcels');
      setupThenableMock(parcelsBuilder, []);

      const result = await service.findAll(TEST_IDS.organization, { farm_id: TEST_IDS.farm });

      expect(result).toEqual({ data: [], count: 0 });
      expect(parcelsBuilder.eq).toHaveBeenCalledWith('farm_id', TEST_IDS.farm);
    });

    it('returns empty results when the organization has no farms', async () => {
      const farmsBuilder = setupTableMock(mockClient, 'farms');
      setupThenableMock(farmsBuilder, []);

      const result = await service.findAll(TEST_IDS.organization, {});

      expect(result).toEqual({ data: [], count: 0 });
      expect(farmsBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
    });

    it('supports explicit parcel_ids filters without farm lookups', async () => {
      const analysesBuilder = setupTableMock(mockClient, 'analyses');
      analysesBuilder.then.mockImplementation(
        (resolve: (value: { data: typeof analysisRecord[]; error: null; count: number }) => void) => {
          const result = { data: [analysisRecord], error: null, count: 1 };
          resolve(result);
          return Promise.resolve(result);
        },
      );

      const result = await service.findAll(TEST_IDS.organization, {
        parcel_ids: `${TEST_IDS.parcel}, ${secondParcelId}`,
      });

      expect(result.data).toEqual([analysisRecord]);
      expect(analysesBuilder.in).toHaveBeenCalledWith('parcel_id', [TEST_IDS.parcel, secondParcelId]);
    });

    it('throws InternalServerErrorException when the analyses query fails', async () => {
      const analysesBuilder = setupTableMock(mockClient, 'analyses');
      analysesBuilder.then.mockImplementation(
        (resolve: (value: { data: null; error: { message: string }; count: null }) => void) => {
          const result = {
            data: null,
            error: { message: 'analyses failed' },
            count: null,
          };
          resolve(result);
          return Promise.resolve(result);
        },
      );

      await expect(
        service.findAll(TEST_IDS.organization, { parcel_id: TEST_IDS.parcel }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findOne', () => {
    it('returns one analysis scoped to the organization', async () => {
      const analysesBuilder = setupTableMock(mockClient, 'analyses');
      analysesBuilder.single.mockResolvedValue(
        mockQueryResult({
          ...analysisRecord,
          parcels: { id: TEST_IDS.parcel, name: 'Parcel Alpha', farms: { organization_id: TEST_IDS.organization } },
        }),
      );

      const result = await service.findOne(analysisId, TEST_IDS.organization);

      expect(result).toEqual(
        expect.objectContaining({ id: analysisId, parcel_id: TEST_IDS.parcel }),
      );
      expect(analysesBuilder.eq).toHaveBeenCalledWith('id', analysisId);
    });

    it('throws NotFoundException when the analysis belongs to another organization', async () => {
      const analysesBuilder = setupTableMock(mockClient, 'analyses');
      analysesBuilder.single.mockResolvedValue(
        mockQueryResult({
          ...analysisRecord,
          parcels: { farms: { organization_id: 'other-org' } },
        }),
      );

      await expect(service.findOne(analysisId, TEST_IDS.organization)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when the analysis does not exist', async () => {
      const analysesBuilder = setupTableMock(mockClient, 'analyses');
      analysesBuilder.single.mockResolvedValue(
        mockQueryResult(null, { message: 'missing' }),
      );

      await expect(service.findOne(analysisId, TEST_IDS.organization)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates an analysis after validating parcel organization access', async () => {
      const parcelBuilder = createMockQueryBuilder();
      const analysesBuilder = createMockQueryBuilder();

      parcelBuilder.single.mockResolvedValue(
        mockQueryResult({ id: TEST_IDS.parcel, farms: { organization_id: TEST_IDS.organization } }),
      );
      analysesBuilder.single.mockResolvedValue(mockQueryResult(analysisRecord));

      configureFromMocks({
        parcels: parcelBuilder,
        analyses: analysesBuilder,
      });

      const result = await service.create(createDto, TEST_IDS.organization);

      expect(result).toEqual(analysisRecord);
      expect(parcelBuilder.eq).toHaveBeenCalledWith('id', TEST_IDS.parcel);
      expect(analysesBuilder.insert).toHaveBeenCalledWith([createDto]);
    });

    it('throws BadRequestException when the parcel is invalid for the organization', async () => {
      const parcelBuilder = setupTableMock(mockClient, 'parcels');
      parcelBuilder.single.mockResolvedValue(mockQueryResult(null, { message: 'missing' }));

      await expect(service.create(createDto, TEST_IDS.organization)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws InternalServerErrorException when creation fails', async () => {
      const parcelBuilder = createMockQueryBuilder();
      const analysesBuilder = createMockQueryBuilder();

      parcelBuilder.single.mockResolvedValue(
        mockQueryResult({ id: TEST_IDS.parcel, farms: { organization_id: TEST_IDS.organization } }),
      );
      analysesBuilder.single.mockResolvedValue(
        mockQueryResult(null, { message: 'insert failed' }),
      );

      configureFromMocks({
        parcels: parcelBuilder,
        analyses: analysesBuilder,
      });

      await expect(service.create(createDto, TEST_IDS.organization)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('update', () => {
    it('updates an analysis after verifying organization access', async () => {
      const analysesLookupBuilder = createMockQueryBuilder();
      const analysesUpdateBuilder = createMockQueryBuilder();

      analysesLookupBuilder.single.mockResolvedValue(
        mockQueryResult({
          ...analysisRecord,
          parcels: { farms: { organization_id: TEST_IDS.organization } },
        }),
      );
      analysesUpdateBuilder.single.mockResolvedValue(
        mockQueryResult({ ...analysisRecord, laboratory: 'Updated Lab' }),
      );

      configureFromMocks({ analyses: [analysesLookupBuilder, analysesUpdateBuilder] });

      const result = await service.update(
        analysisId,
        TEST_IDS.organization,
        { laboratory: 'Updated Lab' },
      );

      expect(result).toEqual(expect.objectContaining({ laboratory: 'Updated Lab' }));
      expect(analysesUpdateBuilder.eq).toHaveBeenCalledWith('id', analysisId);
    });

    it('throws InternalServerErrorException when update fails', async () => {
      const analysesLookupBuilder = createMockQueryBuilder();
      const analysesUpdateBuilder = createMockQueryBuilder();

      analysesLookupBuilder.single.mockResolvedValue(
        mockQueryResult({
          ...analysisRecord,
          parcels: { farms: { organization_id: TEST_IDS.organization } },
        }),
      );
      analysesUpdateBuilder.single.mockResolvedValue(
        mockQueryResult(null, { message: 'update failed' }),
      );

      configureFromMocks({ analyses: [analysesLookupBuilder, analysesUpdateBuilder] });

      await expect(
        service.update(analysisId, TEST_IDS.organization, { laboratory: 'Updated Lab' }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('delete', () => {
    it('deletes an analysis after verifying organization access', async () => {
      const analysesLookupBuilder = createMockQueryBuilder();
      const analysesDeleteBuilder = createMockQueryBuilder();

      analysesLookupBuilder.single.mockResolvedValue(
        mockQueryResult({
          ...analysisRecord,
          parcels: { farms: { organization_id: TEST_IDS.organization } },
        }),
      );
      analysesDeleteBuilder.then.mockImplementation(
        (resolve: (value: { error: null }) => void) => {
          const result = { error: null };
          resolve(result);
          return Promise.resolve(result);
        },
      );

      configureFromMocks({ analyses: [analysesLookupBuilder, analysesDeleteBuilder] });

      const result = await service.delete(analysisId, TEST_IDS.organization);

      expect(result).toEqual({ message: 'Analysis deleted successfully' });
      expect(analysesDeleteBuilder.eq).toHaveBeenCalledWith('id', analysisId);
    });

    it('throws InternalServerErrorException when deletion fails', async () => {
      const analysesLookupBuilder = createMockQueryBuilder();
      const analysesDeleteBuilder = createMockQueryBuilder();

      analysesLookupBuilder.single.mockResolvedValue(
        mockQueryResult({
          ...analysisRecord,
          parcels: { farms: { organization_id: TEST_IDS.organization } },
        }),
      );
      analysesDeleteBuilder.then.mockImplementation(
        (resolve: (value: { error: { message: string } }) => void) => {
          const result = { error: { message: 'delete failed' } };
          resolve(result);
          return Promise.resolve(result);
        },
      );

      configureFromMocks({ analyses: [analysesLookupBuilder, analysesDeleteBuilder] });

      await expect(service.delete(analysisId, TEST_IDS.organization)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('recommendations', () => {
    it('updates a recommendation only when the parent analysis belongs to the organization', async () => {
      const recommendationsLookupBuilder = createMockQueryBuilder();
      const analysesLookupBuilder = createMockQueryBuilder();
      const recommendationsUpdateBuilder = createMockQueryBuilder();

      recommendationsLookupBuilder.single.mockResolvedValue(
        mockQueryResult({ analysis_id: analysisId }),
      );
      analysesLookupBuilder.single.mockResolvedValue(
        mockQueryResult({
          ...analysisRecord,
          parcels: { farms: { organization_id: TEST_IDS.organization } },
        }),
      );
      recommendationsUpdateBuilder.single.mockResolvedValue(
        mockQueryResult({ id: recommendationId, title: 'Apply gypsum' }),
      );

      configureFromMocks({
        analysis_recommendations: [recommendationsLookupBuilder, recommendationsUpdateBuilder],
        analyses: analysesLookupBuilder,
      });

      const result = await service.updateRecommendation(
        recommendationId,
        TEST_IDS.organization,
        { title: 'Apply gypsum' },
      );

      expect(result).toEqual({ id: recommendationId, title: 'Apply gypsum' });
      expect(recommendationsLookupBuilder.eq).toHaveBeenCalledWith('id', recommendationId);
    });
  });
});
