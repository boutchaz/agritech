import { AgromindiaContextService } from './agromindia-context.service';

describe('AgromindiaContextService', () => {
  let service: AgromindiaContextService;
  let mockDiagnosticsService: any;
  let mockRecommendationsService: any;
  let mockAnnualPlanService: any;
  let mockReferencesService: any;
  let mockCalibrationService: any;
  let mockDatabaseService: any;

  beforeEach(() => {
    mockDiagnosticsService = {
      getDiagnostics: jest.fn(),
    };
    mockRecommendationsService = {
      getRecommendations: jest.fn(),
    };
    mockAnnualPlanService = {
      getPlanOrNull: jest.fn(),
      getValidatedPlanOrNull: jest.fn(),
      getInterventions: jest.fn(),
      getSummary: jest.fn(),
    };
    mockReferencesService = {
      findByCropType: jest.fn(),
      findAlerts: jest.fn(),
      findNpkFormulas: jest.fn(),
      findBbchStages: jest.fn(),
    };
    mockCalibrationService = {
      getLatestCalibration: jest.fn(),
    };

    const mockClient = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        then: (resolve: any) => resolve({ data: [], error: null, count: 0 }),
      }),
    };
    mockDatabaseService = {
      getAdminClient: jest.fn().mockReturnValue(mockClient),
    };

    service = new AgromindiaContextService(
      mockDiagnosticsService,
      mockRecommendationsService,
      mockAnnualPlanService,
      mockReferencesService,
      mockCalibrationService,
      mockDatabaseService,
    );
  });

  describe('getParcelIntelligence', () => {
    it('should return AgromindiaParcelContext with all fields', async () => {
      mockDiagnosticsService.getDiagnostics.mockResolvedValue({
        scenario_code: 'B',
        scenario: 'Vegetation stress detected',
        confidence: 0.82,
        indicators: {
          ndvi_band: 'vigilance',
          ndvi_trend: 'declining',
          ndre_status: 'low',
          ndmi_trend: 'declining',
          water_balance: -15,
          weather_anomaly: false,
        },
      });

      mockRecommendationsService.getRecommendations.mockResolvedValue([
        {
          id: 'rec-1',
          status: 'validated',
          priority: 'high',
          constat: 'NDVI drop observed',
          diagnostic: 'Water stress',
          action: 'Increase irrigation',
          valid_from: '2026-03-20',
          valid_until: '2026-04-20',
        },
      ]);

      mockAnnualPlanService.getValidatedPlanOrNull.mockResolvedValue({
        id: 'plan-1',
        status: 'active',
        interventions: [
          {
            month: 3,
            week: 4,
            intervention_type: 'irrigation',
            description: 'Spring irrigation',
            product: null,
            dose: null,
            status: 'planned',
          },
        ],
      });

      mockCalibrationService.getLatestCalibration.mockResolvedValue({
        id: 'cal-1',
        status: 'completed',
        confidence_score: 0.9,
        zone_classification: 'normal',
        calibration_data: {
          baseline_ndvi: 0.55,
          baseline_ndre: 0.3,
          baseline_ndmi: 0.2,
        },
      });

      const result = await service.getParcelIntelligence('parcel-1', 'org-1', 'olivier');

      expect(result).toBeDefined();
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics!.scenario_code).toBe('B');
      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].priority).toBe('high');
      expect(result.annual_plan).toBeDefined();
      expect(result.calibration).toBeDefined();
      expect(result.calibration!.zone_classification).toBe('normal');
    });

    it('should return null diagnostics when service throws', async () => {
      mockDiagnosticsService.getDiagnostics.mockRejectedValue(new Error('No data'));
      mockRecommendationsService.getRecommendations.mockResolvedValue([]);
      mockAnnualPlanService.getValidatedPlanOrNull.mockResolvedValue(null);
      mockCalibrationService.getLatestCalibration.mockResolvedValue(null);

      const result = await service.getParcelIntelligence('parcel-1', 'org-1', 'olivier');

      expect(result.diagnostics).toBeNull();
      expect(result.recommendations).toEqual([]);
      expect(result.annual_plan).toBeNull();
      expect(result.calibration).toBeNull();
    });

    it('should return null calibration when no calibration exists', async () => {
      mockDiagnosticsService.getDiagnostics.mockRejectedValue(new Error('Not found'));
      mockRecommendationsService.getRecommendations.mockResolvedValue([]);
      mockAnnualPlanService.getValidatedPlanOrNull.mockResolvedValue(null);
      mockCalibrationService.getLatestCalibration.mockResolvedValue(null);

      const result = await service.getParcelIntelligence('parcel-1', 'org-1', 'olivier');

      expect(result.calibration).toBeNull();
    });

    it('should exclude pending AI recommendations from chat context', async () => {
      mockDiagnosticsService.getDiagnostics.mockRejectedValue(new Error('No data'));
      mockRecommendationsService.getRecommendations.mockResolvedValue([
        {
          id: 'rec-pending',
          status: 'pending',
          priority: 'high',
          constat: 'Test',
          diagnostic: 'Test',
          action: 'Do something',
          valid_from: null,
          valid_until: null,
        },
      ]);
      mockAnnualPlanService.getValidatedPlanOrNull.mockResolvedValue(null);
      mockCalibrationService.getLatestCalibration.mockResolvedValue(null);

      const result = await service.getParcelIntelligence('parcel-1', 'org-1', 'olivier');

      expect(result.recommendations).toEqual([]);
    });
  });

  describe('getOrgIntelligence', () => {
    it('should fetch intelligence for top parcels', async () => {
      // Mock the DB to return parcels
      const parcelChain: any = {};
      ['select', 'eq', 'order', 'limit'].forEach(m => {
        parcelChain[m] = jest.fn().mockReturnValue(parcelChain);
      });
      parcelChain.then = (resolve: any) => resolve({
        data: [
          { id: 'p-1', name: 'Parcelle A', crop_type: 'olivier' },
          { id: 'p-2', name: 'Parcelle B', crop_type: 'agrumes' },
        ],
        error: null,
      });

      mockDatabaseService.getAdminClient().from.mockReturnValue(parcelChain);

      // Mock all services to return empty/null
      mockDiagnosticsService.getDiagnostics.mockRejectedValue(new Error('No data'));
      mockRecommendationsService.getRecommendations.mockResolvedValue([]);
      mockAnnualPlanService.getValidatedPlanOrNull.mockResolvedValue(null);
      mockCalibrationService.getLatestCalibration.mockResolvedValue(null);

      const result = await service.getOrgIntelligence('org-1');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
