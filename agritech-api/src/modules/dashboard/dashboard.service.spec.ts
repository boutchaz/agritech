import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DatabaseService } from '../database/database.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  createMockDatabaseService,
  mockQueryResult,
  setupThenableMock,
  MockSupabaseClient,
} from '../../../test/helpers/mock-database.helper';
import {
  TEST_IDS,
  createMockConfigService,
} from '../../../test/helpers/test-utils';

describe('DashboardService', () => {
  let service: DashboardService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: ReturnType<typeof createMockDatabaseService>;

  type DashboardPrivateMethods = {
    verifyOrganizationMembership: (userId: string, organizationId: string) => Promise<void>;
    getParcelsSummary: (organizationId: string, farmId?: string) => Promise<unknown>;
    getTasksSummary: (organizationId: string) => Promise<unknown>;
    getWorkersSummary: (organizationId: string) => Promise<unknown>;
    getHarvestsSummary: (organizationId: string) => Promise<unknown>;
    getInventorySummary: (organizationId: string) => Promise<unknown>;
    getConcurrentUsers: (organizationId: string) => Promise<unknown>;
    getActiveOperations: (organizationId: string) => Promise<unknown>;
    getRecentFarmActivities: (organizationId: string) => Promise<unknown>;
    getFeatureUsage: (organizationId: string) => Promise<unknown>;
    extractLatLng: (coordinates: unknown) => { lat: number; lng: number } | null;
    mercatorToLatLng: (x: number, y: number) => { lat: number; lng: number } | null;
    geocodeLocation: (query: string) => Promise<{ lat: number; lng: number } | null>;
    calculatePeakUsageTime: () => string;
  };

  const organizationId = TEST_IDS.organization;
  const userId = TEST_IDS.user;

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = createMockDatabaseService(mockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: ConfigService, useValue: createMockConfigService() },
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  const allowMembership = () => {
    const orgUsersBuilder = createMockQueryBuilder();
    orgUsersBuilder.maybeSingle.mockResolvedValue(
      mockQueryResult({ user_id: userId, organization_id: organizationId, is_active: true }),
    );
    return orgUsersBuilder;
  };

  describe('getDashboardSummary', () => {
    it('returns aggregated dashboard metrics scoped to the organization', async () => {
      const orgUsersBuilder = allowMembership();
      const farmsBuilder = createMockQueryBuilder();
      const parcelsBuilder = createMockQueryBuilder();
      const tasksBuilder = createMockQueryBuilder();
      const workersBuilder = createMockQueryBuilder();
      const todayTasksBuilder = createMockQueryBuilder();
      const harvestsBuilder = createMockQueryBuilder();
      const inventoryBuilder = createMockQueryBuilder();

      setupThenableMock(farmsBuilder, [{ id: 'farm-1' }, { id: 'farm-2' }]);
      setupThenableMock(parcelsBuilder, [
        { id: 'parcel-1', area: 10, calculated_area: null, crop_type: 'Olive' },
        { id: 'parcel-2', area: 0, calculated_area: 12, crop_type: null },
      ]);
      setupThenableMock(tasksBuilder, [
        { id: 'task-1', status: 'in_progress', scheduled_start: new Date().toISOString() },
        { id: 'task-2', status: 'completed', scheduled_start: new Date().toISOString() },
      ]);
      setupThenableMock(workersBuilder, [
        { id: 'worker-1', is_active: true, user_id: 'worker-user-1' },
        { id: 'worker-2', is_active: false, user_id: 'worker-user-2' },
      ]);
      setupThenableMock(todayTasksBuilder, [
        { assigned_to: 'worker-user-1' },
        { assigned_to: 'worker-user-1' },
        { assigned_to: 'worker-user-2' },
      ]);
      setupThenableMock(harvestsBuilder, [
        { id: 'harvest-1', harvest_date: new Date().toISOString(), quantity: 25 },
        { id: 'harvest-2', harvest_date: '2025-01-01', quantity: 10 },
      ]);
      setupThenableMock(inventoryBuilder, [
        { id: 'inventory-1', quantity: 3, min_stock_level: 5 },
        { id: 'inventory-2', quantity: 10, min_stock_level: 5 },
      ]);

      let taskCalls = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgUsersBuilder;
        if (table === 'farms') return farmsBuilder;
        if (table === 'parcels') return parcelsBuilder;
        if (table === 'tasks') {
          taskCalls += 1;
          return taskCalls === 1 ? tasksBuilder : todayTasksBuilder;
        }
        if (table === 'workers') return workersBuilder;
        if (table === 'harvest_records') return harvestsBuilder;
        if (table === 'inventory') return inventoryBuilder;
        return createMockQueryBuilder();
      });

      const result = await service.getDashboardSummary(userId, organizationId);

      expect(orgUsersBuilder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(farmsBuilder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(tasksBuilder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(workersBuilder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(harvestsBuilder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(inventoryBuilder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(result).toEqual({
        parcels: { total: 2, totalArea: 22, byCrop: { Olive: 1, Unspecified: 1 } },
        tasks: { total: 2, inProgress: 1, completed: 1, upcoming: 2 },
        workers: { total: 2, active: 1, workingToday: 2 },
        harvests: { total: 2, thisMonth: 1, thisMonthQuantity: 25 },
        inventory: { total: 2, lowStock: 1 },
      });
    });

    it('throws when the requesting user is not an organization member', async () => {
      const orgUsersBuilder = createMockQueryBuilder();
      orgUsersBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null, { message: 'missing' }));
      mockClient.from.mockReturnValue(orgUsersBuilder);

      await expect(service.getDashboardSummary(userId, organizationId)).rejects.toThrow(
        new ForbiddenException('You do not have access to this organization'),
      );
    });
  });

  describe('getWidgetData', () => {
    it('returns a single widget payload after membership verification', async () => {
      const membershipSpy = jest
        .spyOn(service as unknown as { verifyOrganizationMembership: (...args: unknown[]) => Promise<void> }, 'verifyOrganizationMembership')
        .mockResolvedValue(undefined);
      const parcelsSpy = jest
        .spyOn(service as unknown as { getParcelsSummary: (...args: unknown[]) => Promise<unknown> }, 'getParcelsSummary')
        .mockResolvedValue({ total: 2, totalArea: 20, byCrop: { Olive: 2 } });

      const result = await service.getWidgetData(userId, organizationId, 'parcels');

      expect(membershipSpy).toHaveBeenCalledWith(userId, organizationId);
      expect(parcelsSpy).toHaveBeenCalledWith(organizationId);
      expect(result).toEqual({
        type: 'parcels',
        data: { total: 2, totalArea: 20, byCrop: { Olive: 2 } },
      });
    });

    it('throws for unknown widget types', async () => {
      jest
        .spyOn(service as unknown as { verifyOrganizationMembership: (...args: unknown[]) => Promise<void> }, 'verifyOrganizationMembership')
        .mockResolvedValue(undefined);

      await expect(service.getWidgetData(userId, organizationId, 'unknown')).rejects.toThrow(
        new Error('Unknown widget type: unknown'),
      );
    });
  });

  describe('getDashboardSettings', () => {
    it('returns null-equivalent data when settings are not found', async () => {
      const orgUsersBuilder = allowMembership();
      const settingsBuilder = createMockQueryBuilder();
      settingsBuilder.single.mockResolvedValue(mockQueryResult(null, { code: 'PGRST116' }));
      mockClient.from
        .mockReturnValueOnce(orgUsersBuilder)
        .mockReturnValueOnce(settingsBuilder);

      const result = await service.getDashboardSettings(userId, organizationId, userId);

      expect(settingsBuilder.eq).toHaveBeenCalledWith('user_id', userId);
      expect(settingsBuilder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(result).toBeNull();
    });

    it('throws unexpected settings query errors', async () => {
      const orgUsersBuilder = allowMembership();
      const settingsBuilder = createMockQueryBuilder();
      const error = { code: 'XX000', message: 'boom' };
      settingsBuilder.single.mockResolvedValue(mockQueryResult(null, error));
      mockClient.from
        .mockReturnValueOnce(orgUsersBuilder)
        .mockReturnValueOnce(settingsBuilder);

      await expect(service.getDashboardSettings(userId, organizationId, userId)).rejects.toEqual(error);
    });
  });

  describe('upsertDashboardSettings', () => {
    it('upserts settings using the user and organization key', async () => {
      const orgUsersBuilder = allowMembership();
      const settingsBuilder = createMockQueryBuilder();
      settingsBuilder.single.mockResolvedValue(
        mockQueryResult({ user_id: userId, organization_id: organizationId, layout: ['tasks'] }),
      );
      mockClient.from
        .mockReturnValueOnce(orgUsersBuilder)
        .mockReturnValueOnce(settingsBuilder);

      const result = await service.upsertDashboardSettings(
        userId,
        organizationId,
        userId,
        { layout: ['tasks'] },
      );

      expect(settingsBuilder.upsert).toHaveBeenCalledWith(
        { user_id: userId, organization_id: organizationId, layout: ['tasks'] },
        { onConflict: 'user_id,organization_id' },
      );
      expect(result).toEqual({ user_id: userId, organization_id: organizationId, layout: ['tasks'] });
    });
  });

  describe('getLiveMetrics', () => {
    it('combines live dashboard sections and timestamps the response', async () => {
      jest
        .spyOn(service as unknown as { verifyOrganizationMembership: (...args: unknown[]) => Promise<void> }, 'verifyOrganizationMembership')
        .mockResolvedValue(undefined);
      jest
        .spyOn(service as unknown as { getConcurrentUsers: (...args: unknown[]) => Promise<unknown> }, 'getConcurrentUsers')
        .mockResolvedValue({ total: 1, users: [{ id: userId }] });
      jest
        .spyOn(service as unknown as { getActiveOperations: (...args: unknown[]) => Promise<unknown> }, 'getActiveOperations')
        .mockResolvedValue({ total: 1, byType: { task: 1 }, operations: [{ id: 'task-1' }] });
      jest
        .spyOn(service as unknown as { getRecentFarmActivities: (...args: unknown[]) => Promise<unknown> }, 'getRecentFarmActivities')
        .mockResolvedValue({ total: 1, activities: [{ id: 'activity-1' }] });
      jest.spyOn(service, 'getActivityHeatmap').mockResolvedValue([{ lat: 1, lng: 2, intensity: 1, activityType: 'task', count: 1 }]);
      jest
        .spyOn(service as unknown as { getFeatureUsage: (...args: unknown[]) => Promise<unknown> }, 'getFeatureUsage')
        .mockResolvedValue([{ feature: 'Tasks', count: 4, percentage: 80, trend: 'up' }]);

      const result = await service.getLiveMetrics(userId, organizationId);

      expect(result.concurrentUsers.total).toBe(1);
      expect(result.activeOperations.byType).toEqual({ task: 1 });
      expect(result.heatmapData).toHaveLength(1);
      expect(result.featureUsage[0].feature).toBe('Tasks');
      expect(result.lastUpdated).toEqual(expect.any(String));
    });
  });

  describe('getLiveSummary', () => {
    it('returns live summary counters, peak usage, and top feature', async () => {
      jest
        .spyOn(service as unknown as { verifyOrganizationMembership: (...args: unknown[]) => Promise<void> }, 'verifyOrganizationMembership')
        .mockResolvedValue(undefined);
      jest
        .spyOn(service as unknown as { getConcurrentUsersCount: (...args: unknown[]) => Promise<number> }, 'getConcurrentUsersCount')
        .mockResolvedValue(3);
      jest
        .spyOn(service as unknown as { getActiveOperationsCount: (...args: unknown[]) => Promise<number> }, 'getActiveOperationsCount')
        .mockResolvedValue(5);
      jest
        .spyOn(service as unknown as { getActiveFarmsCount: (...args: unknown[]) => Promise<number> }, 'getActiveFarmsCount')
        .mockResolvedValue(2);
      jest
        .spyOn(service as unknown as { getActivitiesLast24h: (...args: unknown[]) => Promise<number> }, 'getActivitiesLast24h')
        .mockResolvedValue(11);
      jest
        .spyOn(service as unknown as { calculatePeakUsageTime: () => string }, 'calculatePeakUsageTime')
        .mockReturnValue('08:00 - 12:00');
      jest
        .spyOn(service as unknown as { getFeatureUsage: (...args: unknown[]) => Promise<Array<{ feature: string }>> }, 'getFeatureUsage')
        .mockResolvedValue([{ feature: 'Tasks' }]);

      const result = await service.getLiveSummary(userId, organizationId);

      expect(result).toEqual({
        concurrentUsersCount: 3,
        activeOperationsCount: 5,
        activeFarmsCount: 2,
        totalActivitiesLast24h: 11,
        peakUsageTime: '08:00 - 12:00',
        mostActiveFeature: 'Tasks',
      });
    });
  });

  describe('getActivityHeatmap', () => {
    it('returns parcel heatmap points with organization filtering and idle state', async () => {
      const orgUsersBuilder = allowMembership();
      const farmsBuilder = createMockQueryBuilder();
      const parcelsBuilder = createMockQueryBuilder();
      const tasksBuilder = createMockQueryBuilder();

      setupThenableMock(farmsBuilder, [{ id: 'farm-1', name: 'Farm One', coordinates: null, is_active: true }]);
      setupThenableMock(parcelsBuilder, [
        {
          id: 'parcel-1',
          name: 'Parcel One',
          farm_id: 'farm-1',
          boundary: { type: 'Point', coordinates: [-6.8, 34.0] },
        },
      ]);
      setupThenableMock(tasksBuilder, [
        { farm_id: 'farm-1', parcel_id: 'parcel-1', task_type: 'spraying', status: 'in_progress' },
      ]);

      mockClient.from
        .mockReturnValueOnce(orgUsersBuilder)
        .mockReturnValueOnce(farmsBuilder)
        .mockReturnValueOnce(parcelsBuilder)
        .mockReturnValueOnce(tasksBuilder);

      const result = await service.getActivityHeatmap(userId, organizationId);

      expect(farmsBuilder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(tasksBuilder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(parcelsBuilder.in).toHaveBeenCalledWith('farm_id', ['farm-1']);
      expect(result).toEqual([
        expect.objectContaining({
          farmId: 'farm-1',
          parcelName: 'Parcel One',
          activityType: 'spraying',
          status: 'in_progress',
          isIdle: false,
        }),
      ]);
    });

    it('falls back to an empty heatmap when no farms are available', async () => {
      const orgUsersBuilder = allowMembership();
      const farmsBuilder = createMockQueryBuilder();
      setupThenableMock(farmsBuilder, []);
      mockClient.from
        .mockReturnValueOnce(orgUsersBuilder)
        .mockReturnValueOnce(farmsBuilder);

      const result = await service.getActivityHeatmap(userId, organizationId);

      expect(result).toEqual([]);
    });
  });

  describe('private summary helpers', () => {
    it('getParcelsSummary calculates totals and groups crops when a farm is provided', async () => {
      const privateService = service as unknown as DashboardPrivateMethods;
      const parcelsBuilder = createMockQueryBuilder();
      setupThenableMock(parcelsBuilder, [
        { id: 'parcel-1', area: 8, calculated_area: 12, crop_type: 'Olive' },
        { id: 'parcel-2', area: 5, calculated_area: null, crop_type: 'Olive' },
        { id: 'parcel-3', area: 0, calculated_area: null, crop_type: null },
      ]);
      mockClient.from.mockReturnValue(parcelsBuilder);

      const result = await privateService.getParcelsSummary(organizationId, TEST_IDS.farm);

      expect(parcelsBuilder.eq).toHaveBeenCalledWith('farm_id', TEST_IDS.farm);
      expect(result).toEqual({
        total: 3,
        totalArea: 17,
        byCrop: { Olive: 2, Unspecified: 1 },
      });
    });

    it('getParcelsSummary returns an empty response when the organization has no farms', async () => {
      const privateService = service as unknown as DashboardPrivateMethods;
      const farmsBuilder = createMockQueryBuilder();
      setupThenableMock(farmsBuilder, []);
      mockClient.from.mockReturnValue(farmsBuilder);

      const result = await privateService.getParcelsSummary(organizationId);

      expect(result).toEqual({ total: 0, totalArea: 0, byCrop: {} });
    });

    it('getParcelsSummary propagates parcel query errors', async () => {
      const privateService = service as unknown as DashboardPrivateMethods;
      const farmsBuilder = createMockQueryBuilder();
      const parcelsBuilder = createMockQueryBuilder();
      const error = { message: 'parcel query failed' };
      setupThenableMock(farmsBuilder, [{ id: TEST_IDS.farm }]);
      setupThenableMock(parcelsBuilder, null, error);
      mockClient.from
        .mockReturnValueOnce(farmsBuilder)
        .mockReturnValueOnce(parcelsBuilder);

      await expect(privateService.getParcelsSummary(organizationId)).rejects.toEqual(error);
    });

    it('getTasksSummary counts in-progress, completed, and upcoming tasks', async () => {
      const privateService = service as unknown as DashboardPrivateMethods;
      const tasksBuilder = createMockQueryBuilder();
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      setupThenableMock(tasksBuilder, [
        { id: 'task-1', status: 'in_progress', scheduled_start: now.toISOString() },
        { id: 'task-2', status: 'completed', scheduled_start: tomorrow },
        { id: 'task-3', status: 'pending', scheduled_start: yesterday },
        { id: 'task-4', status: 'pending', scheduled_start: null },
      ]);
      mockClient.from.mockReturnValue(tasksBuilder);

      const result = await privateService.getTasksSummary(organizationId);

      expect(result).toEqual({ total: 4, inProgress: 1, completed: 1, upcoming: 2 });
    });

    it('getTasksSummary returns zeros for an empty task list', async () => {
      const privateService = service as unknown as DashboardPrivateMethods;
      const tasksBuilder = createMockQueryBuilder();
      setupThenableMock(tasksBuilder, []);
      mockClient.from.mockReturnValue(tasksBuilder);

      await expect(privateService.getTasksSummary(organizationId)).resolves.toEqual({
        total: 0,
        inProgress: 0,
        completed: 0,
        upcoming: 0,
      });
    });

    it('getTasksSummary propagates query errors', async () => {
      const privateService = service as unknown as DashboardPrivateMethods;
      const tasksBuilder = createMockQueryBuilder();
      const error = { message: 'tasks failed' };
      setupThenableMock(tasksBuilder, null, error);
      mockClient.from.mockReturnValue(tasksBuilder);

      await expect(privateService.getTasksSummary(organizationId)).rejects.toEqual(error);
    });

    it('getWorkersSummary counts active workers and unique workers scheduled today', async () => {
      const privateService = service as unknown as DashboardPrivateMethods;
      const workersBuilder = createMockQueryBuilder();
      const todayTasksBuilder = createMockQueryBuilder();
      setupThenableMock(workersBuilder, [
        { id: 'worker-1', is_active: true, user_id: 'user-1' },
        { id: 'worker-2', is_active: true, user_id: 'user-2' },
        { id: 'worker-3', is_active: false, user_id: 'user-3' },
      ]);
      setupThenableMock(todayTasksBuilder, [
        { assigned_to: 'user-1' },
        { assigned_to: 'user-1' },
        { assigned_to: 'user-3' },
        { assigned_to: null },
      ]);
      mockClient.from
        .mockReturnValueOnce(workersBuilder)
        .mockReturnValueOnce(todayTasksBuilder);

      const result = await privateService.getWorkersSummary(organizationId);

      expect(result).toEqual({ total: 3, active: 2, workingToday: 2 });
    });

    it('getWorkersSummary returns zeros for empty worker and task lists', async () => {
      const privateService = service as unknown as DashboardPrivateMethods;
      const workersBuilder = createMockQueryBuilder();
      const todayTasksBuilder = createMockQueryBuilder();
      setupThenableMock(workersBuilder, []);
      setupThenableMock(todayTasksBuilder, []);
      mockClient.from
        .mockReturnValueOnce(workersBuilder)
        .mockReturnValueOnce(todayTasksBuilder);

      await expect(privateService.getWorkersSummary(organizationId)).resolves.toEqual({
        total: 0,
        active: 0,
        workingToday: 0,
      });
    });

    it('getWorkersSummary propagates worker query errors', async () => {
      const privateService = service as unknown as DashboardPrivateMethods;
      const workersBuilder = createMockQueryBuilder();
      const error = { message: 'workers failed' };
      setupThenableMock(workersBuilder, null, error);
      mockClient.from.mockReturnValue(workersBuilder);

      await expect(privateService.getWorkersSummary(organizationId)).rejects.toEqual(error);
    });

    it('getHarvestsSummary filters records to the current month and sums quantities', async () => {
      const privateService = service as unknown as DashboardPrivateMethods;
      const harvestsBuilder = createMockQueryBuilder();
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 5).toISOString();
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 20).toISOString();
      setupThenableMock(harvestsBuilder, [
        { id: 'harvest-1', harvest_date: thisMonth, quantity: 25 },
        { id: 'harvest-2', harvest_date: new Date(now.getFullYear(), now.getMonth(), 12).toISOString(), quantity: 5 },
        { id: 'harvest-3', harvest_date: previousMonth, quantity: 9 },
      ]);
      mockClient.from.mockReturnValue(harvestsBuilder);

      const result = await privateService.getHarvestsSummary(organizationId);

      expect(result).toEqual({ total: 3, thisMonth: 2, thisMonthQuantity: 30 });
    });

    it('getHarvestsSummary returns zeros when there are no harvests', async () => {
      const privateService = service as unknown as DashboardPrivateMethods;
      const harvestsBuilder = createMockQueryBuilder();
      setupThenableMock(harvestsBuilder, []);
      mockClient.from.mockReturnValue(harvestsBuilder);

      await expect(privateService.getHarvestsSummary(organizationId)).resolves.toEqual({
        total: 0,
        thisMonth: 0,
        thisMonthQuantity: 0,
      });
    });

    it('getInventorySummary detects low stock items and handles empty inventory', async () => {
      const privateService = service as unknown as DashboardPrivateMethods;
      const inventoryBuilder = createMockQueryBuilder();
      setupThenableMock(inventoryBuilder, [
        { id: 'item-1', quantity: 2, min_stock_level: 5 },
        { id: 'item-2', quantity: 5, min_stock_level: 5 },
        { id: 'item-3', quantity: 8, min_stock_level: 5 },
        { id: 'item-4', quantity: 0, min_stock_level: null },
      ]);
      mockClient.from.mockReturnValue(inventoryBuilder);

      await expect(privateService.getInventorySummary(organizationId)).resolves.toEqual({
        total: 4,
        lowStock: 2,
      });

      setupThenableMock(inventoryBuilder, []);
      await expect(privateService.getInventorySummary(organizationId)).resolves.toEqual({
        total: 0,
        lowStock: 0,
      });
    });
  });

  describe('live dashboard helpers', () => {
    it('getConcurrentUsers maps organization users, sorts by last activity, and counts users active in the last 24 hours', async () => {
      const privateService = service as unknown as DashboardPrivateMethods;
      const orgUsersBuilder = createMockQueryBuilder();
      const now = Date.now();
      setupThenableMock(orgUsersBuilder, [
        {
          user_id: 'user-1',
          role: 'admin',
          last_login: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
          profiles: {
            full_name: 'User One',
            email: 'one@example.com',
            avatar_url: 'avatar-1',
            updated_at: new Date(now - 60 * 60 * 1000).toISOString(),
          },
        },
        {
          user_id: 'user-2',
          role: null,
          last_login: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
          profiles: {
            full_name: 'User Two',
            email: 'two@example.com',
            avatar_url: null,
            updated_at: null,
          },
        },
        {
          user_id: 'user-3',
          role: 'viewer',
          last_login: new Date(now - 48 * 60 * 60 * 1000).toISOString(),
          profiles: {
            full_name: 'User Three',
            email: 'three@example.com',
            avatar_url: null,
            updated_at: new Date(now - 48 * 60 * 60 * 1000).toISOString(),
          },
        },
      ]);
      mockClient.from.mockReturnValue(orgUsersBuilder);

      const result = await privateService.getConcurrentUsers(organizationId) as {
        total: number;
        users: Array<{ id: string; role: string; lastActivity: string; currentPage: string }>;
      };

      expect(result.total).toBe(2);
      expect(result.users.map((user) => user.id)).toEqual(['user-1', 'user-2', 'user-3']);
      expect(result.users[1]).toEqual(
        expect.objectContaining({ role: 'member', currentPage: '/dashboard' }),
      );
    });

    it('getActiveOperations maps active tasks and harvests and aggregates counts by type', async () => {
      const privateService = service as unknown as DashboardPrivateMethods;
      const tasksBuilder = createMockQueryBuilder();
      const harvestsBuilder = createMockQueryBuilder();
      setupThenableMock(tasksBuilder, [
        {
          id: 'task-1',
          title: 'Spray north block',
          status: 'in_progress',
          scheduled_start: '2026-04-16T08:00:00.000Z',
          assigned_to: 'worker-1',
          parcels: { name: 'North Parcel' },
          farms: { name: 'Main Farm' },
        },
      ]);
      setupThenableMock(harvestsBuilder, [
        {
          id: 'harvest-1',
          harvest_date: '2026-04-16T10:00:00.000Z',
          parcels: { name: 'South Parcel' },
          farms: { name: 'Main Farm' },
        },
      ]);
      mockClient.from
        .mockReturnValueOnce(tasksBuilder)
        .mockReturnValueOnce(harvestsBuilder);

      const result = await privateService.getActiveOperations(organizationId) as {
        total: number;
        byType: Record<string, number>;
        operations: Array<{ id: string; type: string; progress: number; name: string; parcelName?: string }>;
      };

      expect(result.total).toBe(2);
      expect(result.byType).toEqual({ task: 1, harvest: 1 });
      expect(result.operations).toEqual([
        expect.objectContaining({
          id: 'task-1',
          type: 'task',
          progress: 50,
          name: 'Spray north block',
          parcelName: 'North Parcel',
        }),
        expect.objectContaining({
          id: 'harvest-1',
          type: 'harvest',
          progress: 100,
          name: 'Harvest - South Parcel',
        }),
      ]);
    });

    it('getRecentFarmActivities combines task and harvest activities, sorts by timestamp, and extracts locations', async () => {
      const privateService = service as unknown as DashboardPrivateMethods;
      const tasksBuilder = createMockQueryBuilder();
      const harvestsBuilder = createMockQueryBuilder();
      setupThenableMock(tasksBuilder, [
        {
          id: 'task-1',
          title: 'Irrigation completed',
          status: 'completed',
          updated_at: '2026-04-16T08:00:00.000Z',
          farm_id: 'farm-1',
          farms: {
            id: 'farm-1',
            name: 'Farm One',
            coordinates: { type: 'Point', coordinates: [-6.8, 34.1] },
          },
        },
      ]);
      setupThenableMock(harvestsBuilder, [
        {
          id: 'harvest-1',
          quantity: 120,
          created_at: '2026-04-16T09:30:00.000Z',
          farm_id: 'farm-2',
          farms: {
            id: 'farm-2',
            name: 'Farm Two',
            coordinates: { type: 'Polygon', coordinates: [[[-7, 33], [-6, 33], [-6, 34], [-7, 34]]] },
          },
        },
      ]);
      mockClient.from
        .mockReturnValueOnce(tasksBuilder)
        .mockReturnValueOnce(harvestsBuilder);

      const result = await privateService.getRecentFarmActivities(organizationId) as {
        total: number;
        activities: Array<{ id: string; activityType: string; timestamp: string; location?: { lat: number; lng: number } }>;
      };

      expect(result.total).toBe(2);
      expect(result.activities.map((activity) => activity.id)).toEqual(['harvest-1', 'task-1']);
      expect(result.activities[0]).toEqual(
        expect.objectContaining({
          activityType: 'Harvest Recorded',
          location: { lat: 33.5, lng: -6.5 },
        }),
      );
      expect(result.activities[1]).toEqual(
        expect.objectContaining({
          activityType: 'Task Completed',
          location: { lat: 34.1, lng: -6.8 },
        }),
      );
    });

    it('getFeatureUsage calculates percentages and upward trend from feature counts', async () => {
      const privateService = service as unknown as DashboardPrivateMethods;
      const createCountBuilder = (count: number) => {
        const builder = createMockQueryBuilder();
        builder.then.mockImplementation((resolve: (value: { count: number; error: null }) => void) => {
          const result = { count, error: null };
          resolve(result);
          return Promise.resolve(result);
        });
        return builder;
      };
      mockClient.from
        .mockReturnValueOnce(createCountBuilder(12))
        .mockReturnValueOnce(createCountBuilder(6))
        .mockReturnValueOnce(createCountBuilder(3))
        .mockReturnValueOnce(createCountBuilder(3))
        .mockReturnValueOnce(createCountBuilder(2))
        .mockReturnValueOnce(createCountBuilder(2))
        .mockReturnValueOnce(createCountBuilder(2))
        .mockReturnValueOnce(createCountBuilder(10))
        .mockReturnValueOnce(createCountBuilder(4));

      const result = await privateService.getFeatureUsage(organizationId) as Array<{
        feature: string;
        count: number;
        percentage: number;
        trend: string;
      }>;

      expect(result[0]).toEqual(expect.objectContaining({ feature: 'Tasks', count: 12, percentage: 40, trend: 'up' }));
      expect(result.find((item) => item.feature === 'Harvests')).toEqual(
        expect.objectContaining({ count: 6, percentage: 20, trend: 'stable' }),
      );
    });

    it('getFeatureUsage reports downward and stable task trends', async () => {
      const privateService = service as unknown as DashboardPrivateMethods;
      const createCountBuilder = (count: number) => {
        const builder = createMockQueryBuilder();
        builder.then.mockImplementation((resolve: (value: { count: number; error: null }) => void) => {
          const result = { count, error: null };
          resolve(result);
          return Promise.resolve(result);
        });
        return builder;
      };

      mockClient.from
        .mockReturnValueOnce(createCountBuilder(5))
        .mockReturnValueOnce(createCountBuilder(1))
        .mockReturnValueOnce(createCountBuilder(1))
        .mockReturnValueOnce(createCountBuilder(1))
        .mockReturnValueOnce(createCountBuilder(1))
        .mockReturnValueOnce(createCountBuilder(1))
        .mockReturnValueOnce(createCountBuilder(1))
        .mockReturnValueOnce(createCountBuilder(2))
        .mockReturnValueOnce(createCountBuilder(8));
      const downResult = await privateService.getFeatureUsage(organizationId) as Array<{ feature: string; trend: string }>;
      expect(downResult.find((item) => item.feature === 'Tasks')).toEqual(
        expect.objectContaining({ trend: 'down' }),
      );

      mockClient.from
        .mockReturnValueOnce(createCountBuilder(5))
        .mockReturnValueOnce(createCountBuilder(1))
        .mockReturnValueOnce(createCountBuilder(1))
        .mockReturnValueOnce(createCountBuilder(1))
        .mockReturnValueOnce(createCountBuilder(1))
        .mockReturnValueOnce(createCountBuilder(1))
        .mockReturnValueOnce(createCountBuilder(1))
        .mockReturnValueOnce(createCountBuilder(10))
        .mockReturnValueOnce(createCountBuilder(10));
      const stableResult = await privateService.getFeatureUsage(organizationId) as Array<{ feature: string; trend: string }>;
      expect(stableResult.find((item) => item.feature === 'Tasks')).toEqual(
        expect.objectContaining({ trend: 'stable' }),
      );
    });
  });

  describe('coordinate and geocoding helpers', () => {
    it('extractLatLng handles GeoJSON Point and Polygon geometries', () => {
      const privateService = service as unknown as DashboardPrivateMethods;

      expect(privateService.extractLatLng({ type: 'Point', coordinates: [-6.8, 34.1] })).toEqual({
        lat: 34.1,
        lng: -6.8,
      });
      expect(
        privateService.extractLatLng({
          type: 'Polygon',
          coordinates: [[[-7, 33], [-6, 33], [-6, 34], [-7, 34]]],
        }),
      ).toEqual({ lat: 33.5, lng: -6.5 });
    });

    it('extractLatLng returns null for MultiPolygon, null, and undefined inputs', () => {
      const privateService = service as unknown as DashboardPrivateMethods;

      expect(
        privateService.extractLatLng({
          type: 'MultiPolygon',
          coordinates: [[[[1, 2], [3, 4], [5, 6]]]],
        }),
      ).toBeNull();
      expect(privateService.extractLatLng(null)).toBeNull();
      expect(privateService.extractLatLng(undefined)).toBeNull();
    });

    it('mercatorToLatLng converts Web Mercator coordinates to WGS84', () => {
      const privateService = service as unknown as DashboardPrivateMethods;

      expect(privateService.mercatorToLatLng(0, 0)).toEqual({ lat: 0, lng: 0 });
    });

    it('geocodeLocation caches successful fetches', async () => {
      const privateService = service as unknown as DashboardPrivateMethods;
      const fetchSpy = jest
        .spyOn(global, 'fetch')
        .mockResolvedValue(new Response(JSON.stringify([{ lat: '34.02', lon: '-6.83' }]), { status: 200 }));

      const first = await privateService.geocodeLocation('Rabat, Maroc');
      const second = await privateService.geocodeLocation('Rabat, Maroc');

      expect(first).toEqual({ lat: 34.02, lng: -6.83 });
      expect(second).toEqual(first);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('geocodeLocation returns null on timeout-like aborts and other fetch errors', async () => {
      const privateService = service as unknown as DashboardPrivateMethods;
      jest.useFakeTimers();
      const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(
        (_input: string | URL | Request, init?: RequestInit) => new Promise((_, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
      );

      const timeoutPromise = privateService.geocodeLocation('Casablanca, Maroc');
      jest.advanceTimersByTime(3001);
      await expect(timeoutPromise).resolves.toBeNull();

      fetchSpy.mockRejectedValueOnce(new Error('network failed'));
      await expect(privateService.geocodeLocation('Meknes, Maroc')).resolves.toBeNull();
      jest.useRealTimers();
    });
  });

  describe('time-based helper', () => {
    it('calculatePeakUsageTime returns morning, afternoon, and fallback windows', () => {
      const privateService = service as unknown as DashboardPrivateMethods;

      jest.useFakeTimers().setSystemTime(new Date('2026-04-16T09:00:00.000Z'));
      expect(privateService.calculatePeakUsageTime()).toBe('08:00 - 12:00');

      jest.setSystemTime(new Date('2026-04-16T14:00:00.000Z'));
      expect(privateService.calculatePeakUsageTime()).toBe('12:00 - 18:00');

      jest.setSystemTime(new Date('2026-04-16T06:00:00.000Z'));
      expect(privateService.calculatePeakUsageTime()).toBe('09:00 - 11:00');

      jest.useRealTimers();
    });
  });
});
