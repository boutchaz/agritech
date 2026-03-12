import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AiReferencesService } from './ai-references.service';
import { DatabaseService } from '../database/database.service';
import {
  createMockDatabaseService,
  createMockQueryBuilder,
  createMockSupabaseClient,
  mockQueryResult,
  MockDatabaseService,
  MockQueryBuilder,
  MockSupabaseClient,
} from '../../../test/helpers/mock-database.helper';

describe('AiReferencesService', () => {
  let service: AiReferencesService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: MockDatabaseService;

  const oliveReferenceData = {
    varietes: ['Arbequina', 'Picholine'],
    stades_bbch: [{ stage: '01', label: 'Bud development' }],
    alertes: [{ code: 'water_stress', severity: 'warning' }],
    fertilisation: [{ phase: 'spring', npk: '20-10-10' }],
  };

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = createMockDatabaseService(mockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiReferencesService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<AiReferencesService>(AiReferencesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function setupReferenceQuery(
    referenceData: Record<string, unknown> | null,
    error: { message: string } | null = null,
  ): MockQueryBuilder {
    const queryBuilder = createMockQueryBuilder();
    queryBuilder.select.mockReturnValue(queryBuilder);
    queryBuilder.eq.mockReturnValue(queryBuilder);
    queryBuilder.maybeSingle.mockResolvedValue(
      mockQueryResult(referenceData ? { reference_data: referenceData } : null, error),
    );
    mockClient.from.mockReturnValue(queryBuilder);

    return queryBuilder;
  }

  describe('findByCropType', () => {
    it('returns full reference data for a valid crop type', async () => {
      const queryBuilder = setupReferenceQuery(oliveReferenceData);

      const result = await service.findByCropType('olivier');

      expect(result).toEqual(oliveReferenceData);
      expect(mockDatabaseService.getAdminClient).toHaveBeenCalled();
      expect(mockClient.from).toHaveBeenCalledWith('crop_ai_references');
      expect(queryBuilder.select).toHaveBeenCalledWith('reference_data');
      expect(queryBuilder.eq).toHaveBeenCalledWith('crop_type', 'olivier');
    });

    it('throws BadRequestException for an invalid crop type', async () => {
      await expect(service.findByCropType('banana')).rejects.toThrow(BadRequestException);
      expect(mockDatabaseService.getAdminClient).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the crop type does not exist', async () => {
      setupReferenceQuery(null);

      await expect(service.findByCropType('olivier')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findVarieties', () => {
    it('returns varietes when present', async () => {
      setupReferenceQuery(oliveReferenceData);

      const result = await service.findVarieties('olivier');

      expect(result).toEqual(['Arbequina', 'Picholine']);
    });

    it('falls back to especes for agrumes references', async () => {
      setupReferenceQuery({ especes: ['Orange', 'Citron'] });

      const result = await service.findVarieties('agrumes');

      expect(result).toEqual(['Orange', 'Citron']);
    });
  });

  describe('findBbchStages', () => {
    it('returns BBCH stages', async () => {
      setupReferenceQuery(oliveReferenceData);

      const result = await service.findBbchStages('olivier');

      expect(result).toEqual([{ stage: '01', label: 'Bud development' }]);
    });
  });

  describe('findAlerts', () => {
    it('returns alert thresholds', async () => {
      setupReferenceQuery(oliveReferenceData);

      const result = await service.findAlerts('olivier');

      expect(result).toEqual([{ code: 'water_stress', severity: 'warning' }]);
    });
  });

  describe('findNpkFormulas', () => {
    it('returns fertilisation data', async () => {
      setupReferenceQuery(oliveReferenceData);

      const result = await service.findNpkFormulas('olivier');

      expect(result).toEqual([{ phase: 'spring', npk: '20-10-10' }]);
    });

    it('throws BadRequestException when the database query fails', async () => {
      setupReferenceQuery(null, { message: 'Database unavailable' });

      await expect(service.findNpkFormulas('olivier')).rejects.toThrow(BadRequestException);
    });
  });
});
