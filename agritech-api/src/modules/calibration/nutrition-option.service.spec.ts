import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { NutritionOptionService } from './nutrition-option.service';
import {
  createMockDatabaseService,
  createMockQueryBuilder,
  createMockSupabaseClient,
  mockQueryResult,
  setupThenableMock,
} from '../../../test/helpers/mock-database.helper';

describe('NutritionOptionService', () => {
  let service: NutritionOptionService;

  const parcelId = 'parcel-001';
  const organizationId = 'org-001';

  const baseParcel = {
    id: parcelId,
    crop_type: 'olivier',
    organization_id: organizationId,
    farms: { organization_id: organizationId },
  };

  beforeEach(async () => {
    const mockClient = createMockSupabaseClient();
    const mockDatabaseService = createMockDatabaseService(mockClient);

    const parcelQuery = createMockQueryBuilder();
    parcelQuery.select.mockReturnValue(parcelQuery);
    parcelQuery.eq.mockReturnValue(parcelQuery);
    parcelQuery.single.mockResolvedValue(mockQueryResult(baseParcel));

    const analysesQuery = createMockQueryBuilder();
    analysesQuery.select.mockReturnValue(analysesQuery);
    analysesQuery.eq.mockReturnValue(analysesQuery);
    analysesQuery.in.mockReturnValue(analysesQuery);
    analysesQuery.order.mockReturnValue(analysesQuery);
    setupThenableMock(analysesQuery, []);

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'parcels') return parcelQuery;
      if (table === 'analyses') return analysesQuery;
      return createMockQueryBuilder();
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NutritionOptionService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<NutritionOptionService>(NutritionOptionService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('suggests option C when water salinity exceeds threshold for olivier', async () => {
    const nowIso = new Date().toISOString().split('T')[0];
    jest.spyOn(service as never, 'fetchAnalyses' as never).mockResolvedValue([
      { analysis_type: 'water', analysis_date: nowIso, data: { ec_ds_per_m: 3.0 } },
      { analysis_type: 'soil', analysis_date: nowIso, data: { salinity_level: 1.2 } },
    ] as never);

    const result = await service.suggestNutritionOption(parcelId, organizationId);

    expect(result.suggested_option).toBe('C');
    expect(result.alternatives).toHaveLength(3);
  });

  it('suggests option A when recent soil and water analyses are available', async () => {
    const nowIso = new Date().toISOString().split('T')[0];
    jest.spyOn(service as never, 'fetchAnalyses' as never).mockResolvedValue([
      { analysis_type: 'soil', analysis_date: nowIso, data: { salinity_level: 1.0 } },
      { analysis_type: 'water', analysis_date: nowIso, data: { ec_ds_per_m: 1.0 } },
    ] as never);

    const result = await service.suggestNutritionOption(parcelId, organizationId);

    expect(result.suggested_option).toBe('A');
    expect(result.alternatives.find((item) => item.option === 'A')?.eligible).toBe(true);
  });

  it('suggests option B when soil analysis is missing', async () => {
    const nowIso = new Date().toISOString().split('T')[0];
    jest.spyOn(service as never, 'fetchAnalyses' as never).mockResolvedValue([
      { analysis_type: 'water', analysis_date: nowIso, data: { ec_ds_per_m: 1.0 } },
    ] as never);

    const result = await service.suggestNutritionOption(parcelId, organizationId);

    expect(result.suggested_option).toBe('B');
    expect(result.alternatives).toHaveLength(3);
  });
});
