import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { getLocalCropReference } from '../calibration/crop-reference-loader';
import { MonitoringReferentialService } from './monitoring-referential.service';
import {
  createMockDatabaseService,
  createMockQueryBuilder,
  createMockSupabaseClient,
  mockQueryResult,
  setupTableMock,
} from '../../../test/helpers/mock-database.helper';

jest.mock('../calibration/crop-reference-loader', () => ({
  getLocalCropReference: jest.fn(),
}));

describe('MonitoringReferentialService', () => {
  let service: MonitoringReferentialService;
  const mockClient = createMockSupabaseClient();
  const mockDatabaseService = createMockDatabaseService(mockClient);
  const mockedGetLocalCropReference = jest.mocked(getLocalCropReference);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringReferentialService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<MonitoringReferentialService>(MonitoringReferentialService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCropReferential', () => {
    it('returns the referential from the database when valid data exists', async () => {
      const dbReference = {
        source: 'db',
        stades_bbch: [{ code: '10', nom: 'Bud burst', gdd_cumul: [0, 100] }],
      };
      const queryBuilder = createMockQueryBuilder();

      setupTableMock(mockClient, 'crop_ai_references', queryBuilder);
      queryBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({ reference_data: dbReference }),
      );

      const result = await service.getCropReferential(' Olivier ');

      expect(mockDatabaseService.getAdminClient).toHaveBeenCalled();
      expect(queryBuilder.select).toHaveBeenCalledWith('reference_data');
      expect(queryBuilder.eq).toHaveBeenCalledWith('crop_type', 'olivier');
      expect(result).toEqual(dbReference);
      expect(mockedGetLocalCropReference).not.toHaveBeenCalled();
    });

    it('falls back to the local referential when the database returns no usable object', async () => {
      const localReference = {
        source: 'local',
        stades_bbch: [{ code: '30', nom: 'Growth', gdd_cumul: [101, 200] }],
      };
      const queryBuilder = createMockQueryBuilder();

      setupTableMock(mockClient, 'crop_ai_references', queryBuilder);
      queryBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({ reference_data: null }),
      );
      mockedGetLocalCropReference.mockReturnValue(localReference);

      const result = await service.getCropReferential('Agrumes');

      expect(mockedGetLocalCropReference).toHaveBeenCalledWith('agrumes');
      expect(result).toEqual(localReference);
    });

    it('falls back to the local referential when the database query errors', async () => {
      const localReference = {
        source: 'local',
        seuils_satellite: { ndvi: 0.45 },
      };
      const queryBuilder = createMockQueryBuilder();

      setupTableMock(mockClient, 'crop_ai_references', queryBuilder);
      queryBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult(null, { message: 'database unavailable' }),
      );
      mockedGetLocalCropReference.mockReturnValue(localReference);

      const result = await service.getCropReferential('avocatier');

      expect(result).toEqual(localReference);
    });

    it('returns an empty object when neither database nor local referentials are usable', async () => {
      const queryBuilder = createMockQueryBuilder();

      setupTableMock(mockClient, 'crop_ai_references', queryBuilder);
      queryBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({ reference_data: ['invalid'] }),
      );
      mockedGetLocalCropReference.mockReturnValue(null);

      const result = await service.getCropReferential('unknown_crop');

      expect(result).toEqual({});
    });
  });

  describe('getTbase', () => {
    it.each([
      ['olivier', 10],
      [' agrumes ', 12],
      ['avocatier', 10],
      ['palmier_dattier', 12],
    ])('returns %d as Tbase for %s', (cropType, expected) => {
      expect(service.getTbase(cropType)).toBe(expected);
    });

    it('returns the default Tbase for unknown crops', () => {
      expect(service.getTbase('bananier')).toBe(10);
    });
  });
});
