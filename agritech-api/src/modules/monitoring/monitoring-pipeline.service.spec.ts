import { Test, TestingModule } from '@nestjs/testing';
import {
  MonitoringReadinessInput,
  MonitoringPipelineService,
} from './monitoring-pipeline.service';
import { InterventionWindowsService } from './intervention-windows.service';
import { PhenologyService } from './phenology.service';
import { WeatherGateService } from './weather-gate.service';

describe('MonitoringPipelineService', () => {
  let service: MonitoringPipelineService;
  let mockPhenologyService: {
    determinePhenology: jest.Mock;
  };
  let mockInterventionWindowsService: {
    checkInterventionWindow: jest.Mock;
  };
  let mockWeatherGateService: {
    checkWeatherCompatibility: jest.Mock;
  };

  const baseInput: MonitoringReadinessInput = {
    cropType: 'olivier',
    gddCumulative: 145,
    currentBbch: '57',
    interventionType: 'foliar spray',
    weatherForecast: [],
  };

  beforeEach(async () => {
    mockPhenologyService = {
      determinePhenology: jest.fn(),
    };
    mockInterventionWindowsService = {
      checkInterventionWindow: jest.fn(),
    };
    mockWeatherGateService = {
      checkWeatherCompatibility: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringPipelineService,
        { provide: PhenologyService, useValue: mockPhenologyService },
        {
          provide: InterventionWindowsService,
          useValue: mockInterventionWindowsService,
        },
        { provide: WeatherGateService, useValue: mockWeatherGateService },
      ],
    }).compile();

    service = module.get<MonitoringPipelineService>(MonitoringPipelineService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('evaluateRecommendationReadiness', () => {
    it('combines phenology, intervention, and weather results into an executable recommendation', async () => {
      const phenology = {
        current_stage_bbch: '55',
        current_stage_name: 'Inflorescence visible',
        gdd_cumulative: 145,
        next_stage_bbch: '60',
        next_stage_name: 'Flowering',
        gdd_to_next: 20,
      };
      const interventionWindow = {
        status: 'effective',
        reason: 'Intervention is compatible with current BBCH stage',
      };
      const weatherGate = { can_proceed: true };

      mockPhenologyService.determinePhenology.mockResolvedValue(phenology);
      mockInterventionWindowsService.checkInterventionWindow.mockReturnValue(interventionWindow);
      mockWeatherGateService.checkWeatherCompatibility.mockReturnValue(weatherGate);

      const result = await service.evaluateRecommendationReadiness(baseInput);

      expect(mockPhenologyService.determinePhenology).toHaveBeenCalledWith('olivier', 145);
      expect(mockInterventionWindowsService.checkInterventionWindow).toHaveBeenCalledWith(
        'foliar spray',
        '57',
      );
      expect(mockWeatherGateService.checkWeatherCompatibility).toHaveBeenCalledWith(
        'foliar spray',
        [],
      );
      expect(result).toEqual({
        phenology,
        intervention_window: interventionWindow,
        weather_gate: weatherGate,
        can_execute: true,
      });
    });

    it('falls back to the phenology BBCH stage when the input stage is null', async () => {
      mockPhenologyService.determinePhenology.mockResolvedValue({
        current_stage_bbch: '61',
        current_stage_name: 'Flowering',
        gdd_cumulative: 220,
        next_stage_bbch: '71',
        next_stage_name: 'Fruit set',
        gdd_to_next: 40,
      });
      mockInterventionWindowsService.checkInterventionWindow.mockReturnValue({
        status: 'forbidden',
        reason: 'Foliar treatments are forbidden during flowering (BBCH 60-69)',
      });
      mockWeatherGateService.checkWeatherCompatibility.mockReturnValue({
        can_proceed: true,
      });

      await service.evaluateRecommendationReadiness({
        ...baseInput,
        currentBbch: null,
      });

      expect(mockInterventionWindowsService.checkInterventionWindow).toHaveBeenCalledWith(
        'foliar spray',
        '61',
      );
    });

    it('returns can_execute false when the intervention window is forbidden', async () => {
      mockPhenologyService.determinePhenology.mockResolvedValue({
        current_stage_bbch: '61',
        current_stage_name: 'Flowering',
        gdd_cumulative: 220,
        next_stage_bbch: null,
        next_stage_name: null,
        gdd_to_next: null,
      });
      mockInterventionWindowsService.checkInterventionWindow.mockReturnValue({
        status: 'forbidden',
        reason: 'Foliar treatments are forbidden during flowering (BBCH 60-69)',
      });
      mockWeatherGateService.checkWeatherCompatibility.mockReturnValue({
        can_proceed: true,
      });

      const result = await service.evaluateRecommendationReadiness(baseInput);

      expect(result.can_execute).toBe(false);
    });

    it('returns can_execute false when the intervention window is critical', async () => {
      mockPhenologyService.determinePhenology.mockResolvedValue({
        current_stage_bbch: '80',
        current_stage_name: 'Veraison',
        gdd_cumulative: 480,
        next_stage_bbch: null,
        next_stage_name: null,
        gdd_to_next: null,
      });
      mockInterventionWindowsService.checkInterventionWindow.mockReturnValue({
        status: 'critical',
        reason: 'Nitrogen fertigation after veraison is strongly discouraged',
      });
      mockWeatherGateService.checkWeatherCompatibility.mockReturnValue({
        can_proceed: true,
      });

      const result = await service.evaluateRecommendationReadiness({
        ...baseInput,
        interventionType: 'nitrogen fertigation',
      });

      expect(result.can_execute).toBe(false);
    });

    it('returns can_execute false when weather blocks the intervention', async () => {
      mockPhenologyService.determinePhenology.mockResolvedValue({
        current_stage_bbch: '55',
        current_stage_name: 'Inflorescence visible',
        gdd_cumulative: 145,
        next_stage_bbch: '60',
        next_stage_name: 'Flowering',
        gdd_to_next: 20,
      });
      mockInterventionWindowsService.checkInterventionWindow.mockReturnValue({
        status: 'effective',
        reason: 'Intervention is compatible with current BBCH stage',
      });
      mockWeatherGateService.checkWeatherCompatibility.mockReturnValue({
        can_proceed: false,
        blocked_reason: 'Rain is expected too soon after foliar application',
      });

      const result = await service.evaluateRecommendationReadiness(baseInput);

      expect(result.can_execute).toBe(false);
    });
  });
});
