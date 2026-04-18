import { Test, TestingModule } from '@nestjs/testing';
import { PhenologyService } from './phenology.service';
import {
  MonitoringReferential,
  MonitoringReferentialService,
} from './monitoring-referential.service';

describe('PhenologyService', () => {
  let service: PhenologyService;
  let mockReferentialService: {
    getCropReferential: jest.Mock<Promise<MonitoringReferential>, [string]>;
  };

  beforeEach(async () => {
    mockReferentialService = {
      getCropReferential: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhenologyService,
        {
          provide: MonitoringReferentialService,
          useValue: mockReferentialService,
        },
      ],
    }).compile();

    service = module.get<PhenologyService>(PhenologyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('determinePhenology', () => {
    it('returns an unknown stage when no valid BBCH stages exist', async () => {
      mockReferentialService.getCropReferential.mockResolvedValue({
        stades_bbch: [{ code: '10', nom: 'Invalid without range' }],
      });

      const result = await service.determinePhenology('olivier', 12.3456);

      expect(result).toEqual({
        current_stage_bbch: '00',
        current_stage_name: 'Unknown stage',
        gdd_cumulative: 12.35,
        next_stage_bbch: null,
        next_stage_name: null,
        gdd_to_next: null,
      });
      expect(mockReferentialService.getCropReferential).toHaveBeenCalledWith('olivier');
    });

    it('selects the matching stage, sorts ranges, and exposes the next stage', async () => {
      mockReferentialService.getCropReferential.mockResolvedValue({
        stades_bbch: [
          { code: '50', nom: 'Inflorescence', gdd_cumul: [200, 350] },
          { code: '10', nom: 'Bud burst', gdd_cumul: [0, 149] },
          { code: '30', nom: 'Shoot growth', gdd_cumul: [150, 199] },
          { code: 'XX', nom: 'Invalid stage', gdd_cumul: ['bad', 'range'] },
        ],
      });

      const result = await service.determinePhenology('olivier', 160.126);

      expect(result).toEqual({
        current_stage_bbch: '30',
        current_stage_name: 'Shoot growth',
        gdd_cumulative: 160.13,
        next_stage_bbch: '50',
        next_stage_name: 'Inflorescence',
        gdd_to_next: 39.87,
      });
    });

    it('handles zero GDD on the first stage boundary', async () => {
      mockReferentialService.getCropReferential.mockResolvedValue({
        stades_bbch: [
          { code: '00', nom: 'Dormancy', gdd_cumul: [0, 0] },
          { code: '10', nom: 'Bud burst', gdd_cumul: [1, 50] },
        ],
      });

      const result = await service.determinePhenology('olivier', 0);

      expect(result).toEqual({
        current_stage_bbch: '00',
        current_stage_name: 'Dormancy',
        gdd_cumulative: 0,
        next_stage_bbch: '10',
        next_stage_name: 'Bud burst',
        gdd_to_next: 1,
      });
    });

    it('supports exact numeric GDD stages', async () => {
      mockReferentialService.getCropReferential.mockResolvedValue({
        stades_bbch: [
          { code: '10', nom: 'Bud burst', gdd_cumul: 100 },
          { code: '30', nom: 'Shoot growth', gdd_cumul: [101, 150] },
        ],
      });

      const result = await service.determinePhenology('agrumes', 100);

      expect(result).toEqual({
        current_stage_bbch: '10',
        current_stage_name: 'Bud burst',
        gdd_cumulative: 100,
        next_stage_bbch: '30',
        next_stage_name: 'Shoot growth',
        gdd_to_next: 1,
      });
    });

    it('returns the last known stage for very high GDD values', async () => {
      mockReferentialService.getCropReferential.mockResolvedValue({
        stades_bbch: [
          { code: '10', nom: 'Bud burst', gdd_cumul: [0, 120] },
          { code: '80', nom: 'Ripening', gdd_cumul: [121, 500] },
        ],
      });

      const result = await service.determinePhenology('avocatier', 9999.999);

      expect(result).toEqual({
        current_stage_bbch: '80',
        current_stage_name: 'Ripening',
        gdd_cumulative: 10000,
        next_stage_bbch: null,
        next_stage_name: null,
        gdd_to_next: null,
      });
    });
  });
});
