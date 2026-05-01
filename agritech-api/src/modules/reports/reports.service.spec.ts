import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { DatabaseService } from '../database/database.service';
import { AdoptionService, MilestoneType } from '../adoption/adoption.service';
import { ReportType } from './dto/report-filters.dto';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  createMockDatabaseService,
  setupThenableMock,
  MockSupabaseClient,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('ReportsService', () => {
  let service: ReportsService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: ReturnType<typeof createMockDatabaseService>;
  let mockAdoptionService: { recordMilestone: jest.Mock };

  type ReportsPrivateMethods = {
    getAnalysesSoilOnly: (supabase: MockSupabaseClient, organizationId: string, filters: { start_date?: string; end_date?: string; parcel_id?: string }) => Promise<unknown>;
    getStockInventory: (supabase: MockSupabaseClient, organizationId: string) => Promise<unknown>;
    getInfrastructureComplete: (supabase: MockSupabaseClient, organizationId: string) => Promise<unknown>;
    getEmployees: (supabase: MockSupabaseClient, organizationId: string) => Promise<unknown>;
    getDayLaborers: (supabase: MockSupabaseClient, organizationId: string) => Promise<unknown>;
    getFruitTreesFertilization: (supabase: MockSupabaseClient, organizationId: string, filters: { start_date?: string; end_date?: string; parcel_id?: string }) => Promise<unknown>;
    getFruitTreesPruning: (supabase: MockSupabaseClient, organizationId: string, filters: { start_date?: string; end_date?: string; parcel_id?: string }) => Promise<unknown>;
  };

  const organizationId = TEST_IDS.organization;
  const userId = TEST_IDS.user;

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = createMockDatabaseService(mockClient);
    mockAdoptionService = {
      recordMilestone: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: AdoptionService, useValue: mockAdoptionService },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('generateReport', () => {
    it('generates analyses complete reports with organization and date filters', async () => {
      const analysesBuilder = createMockQueryBuilder();
      setupThenableMock(analysesBuilder, [
        {
          analysis_date: '2026-04-15',
          analysis_type: 'soil',
          laboratory: 'Lab A',
          notes: 'Stable',
          parcels: { name: 'Parcel A' },
        },
      ]);
      mockClient.from.mockReturnValue(analysesBuilder);

      const result = await service.generateReport(
        organizationId,
        {
          report_type: ReportType.ANALYSES_COMPLETE,
          start_date: '2026-04-01',
          end_date: '2026-04-30',
          parcel_id: 'parcel-1',
        },
        userId,
      );

      expect(analysesBuilder.eq).toHaveBeenCalledWith('parcels.farms.organization_id', organizationId);
      expect(analysesBuilder.gte).toHaveBeenCalledWith('analysis_date', '2026-04-01');
      expect(analysesBuilder.lte).toHaveBeenCalledWith('analysis_date', '2026-04-30');
      expect(analysesBuilder.eq).toHaveBeenCalledWith('parcel_id', 'parcel-1');
      expect(result.columns).toEqual(['Date', 'Parcelle', 'Type', 'Laboratoire', 'Notes']);
      expect(result.data[0]).toEqual(
        expect.objectContaining({ Parcelle: 'Parcel A', Type: 'Sol', Laboratoire: 'Lab A' }),
      );
      expect(mockAdoptionService.recordMilestone).toHaveBeenCalledWith(
        userId,
        MilestoneType.FIRST_REPORT_GENERATED,
        organizationId,
        { report_type: ReportType.ANALYSES_COMPLETE },
      );
    });

    it('generates stock movement export-shaped data scoped to the organization', async () => {
      const movementsBuilder = createMockQueryBuilder();
      setupThenableMock(movementsBuilder, [
        {
          application_date: '2026-04-16',
          quantity_used: 5,
          cost: 200,
          items: { item_name: 'Nitrogen', default_unit: 'kg' },
        },
      ]);
      mockClient.from.mockReturnValue(movementsBuilder);

      const result = await service.generateReport(organizationId, {
        report_type: ReportType.STOCK_MOVEMENTS,
        start_date: '2026-04-01',
        end_date: '2026-04-30',
      });

      expect(movementsBuilder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(movementsBuilder.gte).toHaveBeenCalledWith('application_date', '2026-04-01');
      expect(movementsBuilder.lte).toHaveBeenCalledWith('application_date', '2026-04-30');
      expect(result.columns).toEqual(['Date', 'Produit', 'Type', 'Quantité', 'Valeur']);
      expect(result.data).toEqual([
        expect.objectContaining({ Produit: 'Nitrogen', Type: 'Sortie', Quantité: '5 kg', Valeur: 200 }),
      ]);
    });

    it('wraps unexpected data errors in an internal server exception', async () => {
      const inventoryBuilder = createMockQueryBuilder();
      setupThenableMock(inventoryBuilder, null, { message: 'db down' });
      mockClient.from.mockReturnValue(inventoryBuilder);

      await expect(
        service.generateReport(organizationId, { report_type: ReportType.STOCK_INVENTORY }),
      ).rejects.toThrow(new InternalServerErrorException('Failed to generate report'));
    });

    it('throws a bad request for unsupported report types', async () => {
      await expect(
        service.generateReport(organizationId, {
          report_type: ReportType.MUSHROOMS_PRODUCTION,
        }),
      ).rejects.toThrow(
        new BadRequestException(
          `Report type ${ReportType.MUSHROOMS_PRODUCTION} not yet implemented`,
        ),
      );
    });
  });

  describe('getAvailableReports', () => {
    it('returns base reports and module-specific reports for active modules', async () => {
      const modulesBuilder = createMockQueryBuilder();
      setupThenableMock(modulesBuilder, [{ module_id: 'fruit-trees' }]);
      mockClient.from.mockReturnValue(modulesBuilder);

      const result = await service.getAvailableReports(organizationId);

      expect(modulesBuilder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(result.baseReports).toHaveLength(4);
      expect(result.moduleReports).toEqual([
        expect.objectContaining({ id: 'fruit-trees' }),
      ]);
    });

    it('throws when active modules cannot be fetched', async () => {
      const modulesBuilder = createMockQueryBuilder();
      setupThenableMock(modulesBuilder, null, { message: 'modules failed' });
      mockClient.from.mockReturnValue(modulesBuilder);

      await expect(service.getAvailableReports(organizationId)).rejects.toThrow(
        new InternalServerErrorException('Failed to fetch active modules'),
      );
    });
  });

  describe('private report helpers', () => {
    it('getAnalysesSoilOnly maps soil-specific columns and applies filters', async () => {
      const privateService = service as unknown as ReportsPrivateMethods;
      const analysesBuilder = createMockQueryBuilder();
      setupThenableMock(analysesBuilder, [
        {
          analysis_date: '2026-04-15',
          data: {
            ph_level: 7.4,
            texture: 'Clay loam',
            nitrogen_ppm: 12,
            phosphorus_ppm: 8,
            potassium_ppm: 20,
          },
          notes: 'Balanced soil',
          parcels: { name: 'Parcel Soil' },
        },
      ]);
      mockClient.from.mockReturnValue(analysesBuilder);

      const result = await privateService.getAnalysesSoilOnly(mockClient, organizationId, {
        start_date: '2026-04-01',
        end_date: '2026-04-30',
        parcel_id: TEST_IDS.parcel,
      }) as { columns: string[]; data: Array<Record<string, unknown>> };

      expect(analysesBuilder.eq).toHaveBeenCalledWith('analysis_type', 'soil');
      expect(analysesBuilder.eq).toHaveBeenCalledWith('parcels.farms.organization_id', organizationId);
      expect(analysesBuilder.eq).toHaveBeenCalledWith('parcel_id', TEST_IDS.parcel);
      expect(result.columns).toEqual(['Date', 'Parcelle', 'pH', 'Texture', 'N-P-K (ppm)', 'Notes']);
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          Parcelle: 'Parcel Soil',
          pH: 7.4,
          Texture: 'Clay loam',
          'N-P-K (ppm)': '12-8-20',
          Notes: 'Balanced soil',
        }),
      );
    });

    it('getStockInventory formats inventory quantities and values', async () => {
      const privateService = service as unknown as ReportsPrivateMethods;
      const inventoryBuilder = createMockQueryBuilder();
      setupThenableMock(inventoryBuilder, [
        { name: 'Compost', quantity: 3, unit: 'bags', cost_per_unit: 50, category: 'Fertilizer' },
        { name: 'Twine', quantity: 2, unit: 'rolls', cost_per_unit: null, category: null },
      ]);
      mockClient.from.mockReturnValue(inventoryBuilder);

      const result = await privateService.getStockInventory(mockClient, organizationId) as {
        columns: string[];
        data: Array<Record<string, unknown>>;
      };

      expect(result.columns).toEqual(['Produit', 'Catégorie', 'Quantité', 'Valeur']);
      expect(result.data).toEqual([
        { Produit: 'Compost', Catégorie: 'Fertilizer', Quantité: '3 bags', Valeur: 150 },
        { Produit: 'Twine', Catégorie: '-', Quantité: '2 rolls', Valeur: 0 },
      ]);
    });

    it('getInfrastructureComplete formats infrastructure and maintenance history', async () => {
      const privateService = service as unknown as ReportsPrivateMethods;
      const infrastructureBuilder = createMockQueryBuilder();
      setupThenableMock(infrastructureBuilder, [
        {
          name: 'Pump Station',
          type: 'Irrigation',
          condition: 'Good',
          installation_date: '2024-02-01',
          maintenance_history: [{ maintenance_date: '2026-03-10' }],
        },
        {
          name: 'Reservoir',
          type: 'Water storage',
          condition: 'Fair',
          installation_date: '2022-08-15',
          maintenance_history: [],
        },
      ]);
      mockClient.from.mockReturnValue(infrastructureBuilder);

      const result = await privateService.getInfrastructureComplete(mockClient, organizationId) as {
        columns: string[];
        data: Array<Record<string, unknown>>;
      };

      expect(infrastructureBuilder.eq).toHaveBeenCalledWith('farms.organization_id', organizationId);
      expect(result.columns).toEqual(['Structure', 'Type', 'État', 'Installation', 'Dernière maintenance']);
      expect(result.data[0]).toEqual(expect.objectContaining({ Structure: 'Pump Station', 'Dernière maintenance': expect.any(String) }));
      expect(result.data[1]).toEqual(expect.objectContaining({ Structure: 'Reservoir', 'Dernière maintenance': '-' }));
    });

    it('getEmployees maps employee data for export', async () => {
      const privateService = service as unknown as ReportsPrivateMethods;
      const employeesBuilder = createMockQueryBuilder();
      setupThenableMock(employeesBuilder, [
        {
          last_name: 'Alaoui',
          first_name: 'Sara',
          cin: 'AB123',
          position: 'Manager',
          hire_date: '2025-01-15',
          salary: 8000,
        },
      ]);
      mockClient.from.mockReturnValue(employeesBuilder);

      const result = await privateService.getEmployees(mockClient, organizationId) as {
        columns: string[];
        data: Array<Record<string, unknown>>;
      };

      expect(employeesBuilder.order).toHaveBeenCalledWith('last_name');
      expect(result.columns).toEqual(['Nom', 'Prénom', 'CIN', 'Poste', 'Date d\'embauche', 'Salaire']);
      expect(result.data[0]).toEqual(expect.objectContaining({ Nom: 'Alaoui', Prénom: 'Sara', Poste: 'Manager', Salaire: 8000 }));
    });

    it('getDayLaborers maps specialties and fallback values', async () => {
      const privateService = service as unknown as ReportsPrivateMethods;
      const laborersBuilder = createMockQueryBuilder();
      setupThenableMock(laborersBuilder, [
        {
          last_name: 'Bennani',
          first_name: 'Omar',
          cin: 'CD456',
          daily_rate: 180,
          specialties: ['pruning', 'harvest'],
        },
        {
          last_name: 'Idrissi',
          first_name: 'Nadia',
          cin: 'EF789',
          daily_rate: 150,
          specialties: [],
        },
      ]);
      mockClient.from.mockReturnValue(laborersBuilder);

      const result = await privateService.getDayLaborers(mockClient, organizationId) as {
        columns: string[];
        data: Array<Record<string, unknown>>;
      };

      expect(result.columns).toEqual(['Nom', 'Prénom', 'CIN', 'Taux journalier', 'Spécialités']);
      expect(result.data).toEqual([
        { Nom: 'Bennani', Prénom: 'Omar', CIN: 'CD456', 'Taux journalier': 180, Spécialités: 'pruning, harvest' },
        { Nom: 'Idrissi', Prénom: 'Nadia', CIN: 'EF789', 'Taux journalier': 150, Spécialités: '-' },
      ]);
    });

    it('getFruitTreesFertilization formats fertilization applications', async () => {
      const privateService = service as unknown as ReportsPrivateMethods;
      const fertilizationBuilder = createMockQueryBuilder();
      setupThenableMock(fertilizationBuilder, [
        {
          application_date: '2026-04-11',
          quantity_used: 15,
          notes: 'Before irrigation',
          items: { item_name: 'NPK 15-15-15', default_unit: 'kg' },
          parcels: { name: 'Parcel Fert' },
        },
      ]);
      mockClient.from.mockReturnValue(fertilizationBuilder);

      const result = await privateService.getFruitTreesFertilization(mockClient, organizationId, {
        start_date: '2026-04-01',
        end_date: '2026-04-30',
        parcel_id: TEST_IDS.parcel,
      }) as { columns: string[]; data: Array<Record<string, unknown>> };

      expect(fertilizationBuilder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(fertilizationBuilder.eq).toHaveBeenCalledWith('parcel_id', TEST_IDS.parcel);
      expect(result.columns).toEqual(['Date', 'Parcelle', 'Produit', 'Quantité', 'Notes']);
      expect(result.data[0]).toEqual(
        expect.objectContaining({ Parcelle: 'Parcel Fert', Produit: 'NPK 15-15-15', Quantité: '15 kg', Notes: 'Before irrigation' }),
      );
    });

    it('getFruitTreesPruning formats pruning work records', async () => {
      const privateService = service as unknown as ReportsPrivateMethods;
      const pruningBuilder = createMockQueryBuilder();
      setupThenableMock(pruningBuilder, [
        {
          work_date: '2026-04-09',
          task_description: 'Taille de formation',
          notes: 'Completed row 3',
          parcels: { name: 'Parcel Prune' },
          day_laborers: { first_name: 'Ali', last_name: 'Karim' },
        },
      ]);
      mockClient.from.mockReturnValue(pruningBuilder);

      const result = await privateService.getFruitTreesPruning(mockClient, organizationId, {
        start_date: '2026-04-01',
        end_date: '2026-04-30',
        parcel_id: TEST_IDS.parcel,
      }) as { columns: string[]; data: Array<Record<string, unknown>> };

      expect(pruningBuilder.eq).toHaveBeenCalledWith('task_category', 'pruning');
      expect(pruningBuilder.eq).toHaveBeenCalledWith('parcels.farms.organization_id', organizationId);
      expect(pruningBuilder.eq).toHaveBeenCalledWith('parcel_id', TEST_IDS.parcel);
      expect(result.columns).toEqual(['Date', 'Parcelle', 'Type de taille', 'Équipe', 'Observations']);
      expect(result.data[0]).toEqual(
        expect.objectContaining({ Parcelle: 'Parcel Prune', 'Type de taille': 'Taille de formation', Équipe: 'Ali Karim', Observations: 'Completed row 3' }),
      );
    });
  });

  describe('generateReport switch coverage', () => {
    it.each([
      [ReportType.ANALYSES_SOIL_ONLY, 'getAnalysesSoilOnly'],
      [ReportType.STOCK_INVENTORY, 'getStockInventory'],
      [ReportType.INFRASTRUCTURE_COMPLETE, 'getInfrastructureComplete'],
      [ReportType.EMPLOYEES, 'getEmployees'],
      [ReportType.DAY_LABORERS, 'getDayLaborers'],
      [ReportType.FRUIT_TREES_FERTILIZATION, 'getFruitTreesFertilization'],
      [ReportType.FRUIT_TREES_PRUNING, 'getFruitTreesPruning'],
    ])('routes %s through %s', async (reportType, methodName) => {
      const privateService = service as unknown as ReportsPrivateMethods;
      const expected = { columns: ['ok'], data: [{ id: reportType }] };
      const method = jest
        .spyOn(privateService, methodName as keyof ReportsPrivateMethods)
        .mockResolvedValue(expected);

      const result = await service.generateReport(organizationId, { report_type: reportType }, userId);

      expect(method).toHaveBeenCalled();
      expect(result).toEqual(expected);
      expect(mockAdoptionService.recordMilestone).toHaveBeenCalledWith(
        userId,
        MilestoneType.FIRST_REPORT_GENERATED,
        organizationId,
        { report_type: reportType },
      );
    });
  });
});
