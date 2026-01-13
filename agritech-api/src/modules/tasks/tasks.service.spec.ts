import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { DatabaseService } from '../database/database.service';
import { AccountingAutomationService } from '../journal-entries/accounting-automation.service';
import { ReceptionBatchesService } from '../reception-batches/reception-batches.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  setupThenableMock,
  MockSupabaseClient,
  MockQueryBuilder,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('TasksService', () => {
  let service: TasksService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: { getAdminClient: jest.Mock };
  let mockAccountingService: { createJournalEntryFromCost: jest.Mock };
  let mockReceptionBatchesService: { create: jest.Mock };

  // ============================================================
  // TEST DATA FIXTURES
  // ============================================================

  const MOCK_TASKS = [
    {
      id: 'task-1',
      organization_id: TEST_IDS.organization,
      farm_id: 'farm-1',
      parcel_id: 'parcel-1',
      title: 'Plant tomatoes',
      description: 'Plant Roma tomatoes in sector A',
      task_type: 'planting',
      status: 'pending',
      priority: 'high',
      assigned_to: 'worker-1',
      assigned_user_id: TEST_IDS.user,
      scheduled_start: '2024-03-01T08:00:00Z',
      scheduled_end: '2024-03-01T17:00:00Z',
      actual_start: null,
      actual_end: null,
      completion_percentage: 0,
      estimated_cost: 500,
      actual_cost: null,
      weather_dependency: true,
      created_at: '2024-02-20T00:00:00Z',
      worker: {
        first_name: 'John',
        last_name: 'Doe',
        user_id: TEST_IDS.user,
      },
      farm: { name: 'Main Farm' },
      parcel: { name: 'Sector A' },
    },
    {
      id: 'task-2',
      organization_id: TEST_IDS.organization,
      farm_id: 'farm-1',
      parcel_id: 'parcel-1',
      title: 'Harvest corn',
      description: 'Harvest sweet corn from field B',
      task_type: 'harvesting',
      status: 'in_progress',
      priority: 'medium',
      assigned_to: 'worker-2',
      assigned_user_id: null,
      scheduled_start: '2024-06-15T06:00:00Z',
      scheduled_end: '2024-06-15T18:00:00Z',
      actual_start: '2024-06-15T06:30:00Z',
      actual_end: null,
      completion_percentage: 45,
      estimated_cost: 800,
      actual_cost: null,
      weather_dependency: true,
      created_at: '2024-06-10T00:00:00Z',
      worker: {
        first_name: 'Jane',
        last_name: 'Smith',
        user_id: 'user-2',
      },
      farm: { name: 'Main Farm' },
      parcel: { name: 'Field B' },
    },
  ];

  const VALID_TASK_TYPES = [
    'planting',
    'harvesting',
    'irrigation',
    'fertilizing',
    'pest_control',
    'pruning',
    'weeding',
    'maintenance',
    'other',
  ];

  const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
  const VALID_STATUSES = [
    'pending',
    'assigned',
    'in_progress',
    'completed',
    'cancelled',
    'overdue',
  ];

  const QUALITY_RATINGS = [1, 2, 3, 4, 5];

  // ============================================================
  // SETUP & TEARDOWN
  // ============================================================

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockAccountingService = {
      createJournalEntryFromCost: jest.fn(),
    };
    mockReceptionBatchesService = {
      create: jest.fn(),
    };

    mockDatabaseService = {
      getAdminClient: jest.fn(() => mockClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        {
          provide: AccountingAutomationService,
          useValue: mockAccountingService,
        },
        {
          provide: ReceptionBatchesService,
          useValue: mockReceptionBatchesService,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  function setupOrganizationAccessMock(organizationId: string, userId: string, hasAccess = true) {
    const queryBuilder = createMockQueryBuilder();
    queryBuilder.eq.mockReturnValue(queryBuilder);
    queryBuilder.maybeSingle.mockResolvedValue(
      hasAccess
        ? mockQueryResult({ organization_id: organizationId, user_id: userId })
        : mockQueryResult(null, null)
    );
    return queryBuilder;
  }

  function setupWarehouseMock(organizationId: string, exists = true) {
    const queryBuilder = createMockQueryBuilder();
    queryBuilder.eq.mockReturnValue(queryBuilder);
    queryBuilder.limit.mockReturnValue(queryBuilder);
    queryBuilder.maybeSingle.mockResolvedValue(
      exists
        ? mockQueryResult({ id: 'warehouse-1', organization_id: organizationId })
        : mockQueryResult(null, null)
    );
    return queryBuilder;
  }

  // ============================================================
  // PARAMETERIZED TESTS - CRUD OPERATIONS
  // ============================================================

  describe('findAll (Parameterized)', () => {
    it.each(VALID_STATUSES)('should filter by status: %s', async (status) => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const taskQuery = createMockQueryBuilder();
      taskQuery.eq.mockReturnValue(taskQuery);
      taskQuery.in.mockReturnValue(taskQuery);
      taskQuery.gte.mockReturnValue(taskQuery);
      taskQuery.lte.mockReturnValue(taskQuery);
      taskQuery.or.mockReturnValue(taskQuery);
      taskQuery.then.mockResolvedValue(mockQueryResult([MOCK_TASKS[0]]));

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgQuery;
        if (table === 'tasks') return taskQuery;
        return createMockQueryBuilder();
      });

      const result = await service.findAll(TEST_IDS.user, TEST_IDS.organization, {
        status: status,
      });

      expect(taskQuery.in).toHaveBeenCalledWith('status', [status]);
    });

    it.each(VALID_PRIORITIES)('should filter by priority: %s', async (priority) => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const taskQuery = createMockQueryBuilder();
      taskQuery.eq.mockReturnValue(taskQuery);
      taskQuery.in.mockReturnValue(taskQuery);
      taskQuery.then.mockResolvedValue(mockQueryResult([MOCK_TASKS[0]]));

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgQuery;
        if (table === 'tasks') return taskQuery;
        return createMockQueryBuilder();
      });

      const result = await service.findAll(TEST_IDS.user, TEST_IDS.organization, {
        priority: priority,
      });

      expect(taskQuery.in).toHaveBeenCalledWith('priority', [priority]);
    });

    it.each(VALID_TASK_TYPES)('should filter by task_type: %s', async (taskType) => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const taskQuery = createMockQueryBuilder();
      taskQuery.eq.mockReturnValue(taskQuery);
      taskQuery.in.mockReturnValue(taskQuery);
      taskQuery.then.mockResolvedValue(mockQueryResult([MOCK_TASKS[0]]));

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgQuery;
        if (table === 'tasks') return taskQuery;
        return createMockQueryBuilder();
      });

      const result = await service.findAll(TEST_IDS.user, TEST_IDS.organization, {
        task_type: taskType,
      });

      expect(taskQuery.in).toHaveBeenCalledWith('task_type', [taskType]);
    });
  });

  describe('create (Parameterized)', () => {
    it.each(VALID_TASK_TYPES)('should create task with type: %s', async (taskType) => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const taskQuery = createMockQueryBuilder();
      taskQuery.eq.mockReturnValue(taskQuery);
      taskQuery.insert.mockReturnValue(taskQuery);
      taskQuery.select.mockReturnValue(taskQuery);
      taskQuery.single.mockResolvedValue(
        mockQueryResult({
          ...MOCK_TASKS[0],
          task_type: taskType,
        })
      );

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgQuery;
        if (table === 'tasks') return taskQuery;
        return createMockQueryBuilder();
      });

      const result = await service.create(TEST_IDS.user, TEST_IDS.organization, {
        title: `Test ${taskType}`,
        task_type: taskType,
        farm_id: 'farm-1',
        scheduled_start: '2024-06-15T08:00:00Z',
        scheduled_end: '2024-06-15T17:00:00Z',
      });

      expect(result.task_type).toBe(taskType);
    });

    it.each(VALID_PRIORITIES)('should create task with priority: %s', async (priority) => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const taskQuery = createMockQueryBuilder();
      taskQuery.eq.mockReturnValue(taskQuery);
      taskQuery.insert.mockReturnValue(taskQuery);
      taskQuery.select.mockReturnValue(taskQuery);
      taskQuery.single.mockResolvedValue(
        mockQueryResult({
          ...MOCK_TASKS[0],
          priority: priority,
        })
      );

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgQuery;
        if (table === 'tasks') return taskQuery;
        return createMockQueryBuilder();
      });

      const result = await service.create(TEST_IDS.user, TEST_IDS.organization, {
        title: 'Test task',
        task_type: 'planting',
        priority: priority,
        farm_id: 'farm-1',
        scheduled_start: '2024-06-15T08:00:00Z',
        scheduled_end: '2024-06-15T17:00:00Z',
      });

      expect(result.priority).toBe(priority);
    });
  });

  // ============================================================
  // INPUT VALIDATION TESTS
  // ============================================================

  describe('Input Validation', () => {
    describe('findOne', () => {
      it('should throw NotFoundException when task not found', async () => {
        const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

        const taskQuery = createMockQueryBuilder();
        taskQuery.eq.mockReturnValue(taskQuery);
        taskQuery.maybeSingle.mockResolvedValue(mockQueryResult(null, null));

        mockClient.from.mockImplementation((table: string) => {
          if (table === 'organization_users') return orgQuery;
          if (table === 'tasks') return taskQuery;
          return createMockQueryBuilder();
        });

        await expect(
          service.findOne(TEST_IDS.user, TEST_IDS.organization, 'non-existent')
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('update', () => {
      it('should throw NotFoundException when updating non-existent task', async () => {
        const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

        const taskQuery = createMockQueryBuilder();
        taskQuery.eq.mockReturnValue(taskQuery);
        taskQuery.maybeSingle.mockResolvedValue(mockQueryResult(null, null));

        mockClient.from.mockReturnValue(taskQuery);

        await expect(
          service.update(TEST_IDS.user, TEST_IDS.organization, 'non-existent', {
            title: 'Updated',
          })
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('remove', () => {
      it('should throw NotFoundException when deleting non-existent task', async () => {
        const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

        const taskQuery = createMockQueryBuilder();
        taskQuery.eq.mockReturnValue(taskQuery);
        taskQuery.maybeSingle.mockResolvedValue(mockQueryResult(null, null));

        mockClient.from.mockReturnValue(taskQuery);

        await expect(
          service.remove(TEST_IDS.user, TEST_IDS.organization, 'non-existent')
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('complete', () => {
      it('should throw NotFoundException when completing non-existent task', async () => {
        const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

        const taskQuery = createMockQueryBuilder();
        taskQuery.eq.mockReturnValue(taskQuery);
        taskQuery.maybeSingle.mockResolvedValue(mockQueryResult(null, null));

        mockClient.from.mockReturnValue(taskQuery);

        await expect(
          service.complete(TEST_IDS.user, TEST_IDS.organization, 'non-existent', {
            quality_rating: 5,
          })
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('assign', () => {
      it('should throw NotFoundException when assigning non-existent task', async () => {
        const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

        const taskQuery = createMockQueryBuilder();
        taskQuery.eq.mockReturnValue(taskQuery);
        taskQuery.maybeSingle.mockResolvedValue(mockQueryResult(null, null));

        mockClient.from.mockReturnValue(taskQuery);

        await expect(
          service.assign(TEST_IDS.user, TEST_IDS.organization, 'non-existent', {
            worker_id: 'worker-1',
          })
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('completeWithHarvest', () => {
      it('should throw NotFoundException for non-existent task', async () => {
        const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

        const taskQuery = createMockQueryBuilder();
        taskQuery.eq.mockReturnValue(taskQuery);
        taskQuery.maybeSingle.mockResolvedValue(mockQueryResult(null, null));

        mockClient.from.mockReturnValue(taskQuery);

        await expect(
          service.completeWithHarvest(
            TEST_IDS.user,
            TEST_IDS.organization,
            'non-existent',
            {
              harvest_date: '2024-06-15',
              quantity: 1000,
              unit: 'kg',
              workers: [],
            }
          )
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw BadRequestException for non-harvest task', async () => {
        const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

        const taskQuery = createMockQueryBuilder();
        taskQuery.eq.mockReturnValue(taskQuery);
        taskQuery.maybeSingle.mockResolvedValue(
          mockQueryResult({
            ...MOCK_TASKS[0],
            task_type: 'planting', // Not harvesting
          })
        );

        mockClient.from.mockReturnValue(taskQuery);

        await expect(
          service.completeWithHarvest(
            TEST_IDS.user,
            TEST_IDS.organization,
            'task-1',
            {
              harvest_date: '2024-06-15',
              quantity: 1000,
              unit: 'kg',
              workers: [],
            }
          )
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.completeWithHarvest(
            TEST_IDS.user,
            TEST_IDS.organization,
            'task-1',
            {
              harvest_date: '2024-06-15',
              quantity: 1000,
              unit: 'kg',
              workers: [],
            }
          )
        ).rejects.toThrow('Only harvest tasks can create harvest records');
      });
    });
  });

  // ============================================================
  // BEHAVIOR-FOCUSED TESTS
  // ============================================================

  describe('Behavior - Access Control', () => {
    it('should verify organization access before listing tasks', async () => {
      const orgQuery = setupOrganizationAccessMock(
        TEST_IDS.organization,
        TEST_IDS.user,
        false
      );

      mockClient.from.mockReturnValue(orgQuery);

      await expect(
        service.findAll(TEST_IDS.user, TEST_IDS.organization)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should verify organization access before creating task', async () => {
      const orgQuery = setupOrganizationAccessMock(
        TEST_IDS.organization,
        TEST_IDS.user,
        false
      );

      mockClient.from.mockReturnValue(orgQuery);

      await expect(
        service.create(TEST_IDS.user, TEST_IDS.organization, {
          title: 'Test task',
          task_type: 'planting',
          farm_id: 'farm-1',
          scheduled_start: '2024-06-15T08:00:00Z',
          scheduled_end: '2024-06-15T17:00:00Z',
        })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Behavior - Task Assignment', () => {
    it('should assign task to worker and update status', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const taskQuery = createMockQueryBuilder();
      taskQuery.eq.mockReturnValue(taskQuery);
      taskQuery.maybeSingle.mockResolvedValueOnce(
        mockQueryResult(MOCK_TASKS[0])
      );
      taskQuery.update.mockReturnValue(taskQuery);
      taskQuery.select.mockReturnValue(taskQuery);
      taskQuery.single.mockResolvedValue(
        mockQueryResult({
          ...MOCK_TASKS[0],
          assigned_to: 'worker-2',
          status: 'assigned',
        })
      );

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgQuery;
        if (table === 'tasks') return taskQuery;
        return createMockQueryBuilder();
      });

      const result = await service.assign(TEST_IDS.user, TEST_IDS.organization, 'task-1', {
        worker_id: 'worker-2',
      });

      expect(result.assigned_to).toBe('worker-2');
      expect(result.status).toBe('assigned');
    });
  });

  describe('Behavior - Task Completion', () => {
    it('should complete task and record completion date', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const taskQuery = createMockQueryBuilder();
      taskQuery.eq.mockReturnValue(taskQuery);
      taskQuery.maybeSingle.mockResolvedValueOnce(
        mockQueryResult({
          ...MOCK_TASKS[0],
          title: 'Test Task',
          task_type: 'planting',
        })
      );
      taskQuery.update.mockReturnValue(taskQuery);
      taskQuery.select.mockReturnValue(taskQuery);
      taskQuery.single.mockResolvedValue(
        mockQueryResult({
          ...MOCK_TASKS[0],
          status: 'completed',
          completed_date: new Date().toISOString().split('T')[0],
          actual_end: new Date().toISOString(),
          completion_percentage: 100,
          quality_rating: 5,
          actual_cost: 600,
        })
      );

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgQuery;
        if (table === 'tasks') return taskQuery;
        return createMockQueryBuilder();
      });

      const result = await service.complete(TEST_IDS.user, TEST_IDS.organization, 'task-1', {
        quality_rating: 5,
        actual_cost: 600,
        notes: 'Completed successfully',
      });

      expect(result.status).toBe('completed');
      expect(result.completion_percentage).toBe(100);
      expect(result.quality_rating).toBe(5);
      expect(result.actual_cost).toBe(600);
    });

    it('should create journal entry when actual_cost is provided', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const taskQuery = createMockQueryBuilder();
      taskQuery.eq.mockReturnValue(taskQuery);
      taskQuery.maybeSingle.mockResolvedValueOnce(
        mockQueryResult({
          ...MOCK_TASKS[0],
          title: 'Planting Task',
          task_type: 'planting',
        })
      );
      taskQuery.update.mockReturnValue(taskQuery);
      taskQuery.select.mockReturnValue(taskQuery);
      taskQuery.single.mockResolvedValue(
        mockQueryResult({
          ...MOCK_TASKS[0],
          status: 'completed',
          actual_cost: 500,
          task_type: 'planting',
        })
      );

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgQuery;
        if (table === 'tasks') return taskQuery;
        return createMockQueryBuilder();
      });

      mockAccountingService.createJournalEntryFromCost.mockResolvedValue({
        id: 'journal-1',
      });

      await service.complete(TEST_IDS.user, TEST_IDS.organization, 'task-1', {
        quality_rating: 5,
        actual_cost: 500,
      });

      expect(mockAccountingService.createJournalEntryFromCost).toHaveBeenCalledWith(
        TEST_IDS.organization,
        'task-1',
        'planting',
        500,
        expect.any(Date),
        expect.any(String),
        TEST_IDS.user
      );
    });

    it('should handle journal entry creation failure gracefully', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const taskQuery = createMockQueryBuilder();
      taskQuery.eq.mockReturnValue(taskQuery);
      taskQuery.maybeSingle.mockResolvedValueOnce(
        mockQueryResult({
          ...MOCK_TASKS[0],
          title: 'Task with cost',
          task_type: 'planting',
        })
      );
      taskQuery.update.mockReturnValue(taskQuery);
      taskQuery.select.mockReturnValue(taskQuery);
      taskQuery.single.mockResolvedValue(
        mockQueryResult({
          ...MOCK_TASKS[0],
          status: 'completed',
          actual_cost: 500,
          task_type: 'planting',
        })
      );

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgQuery;
        if (table === 'tasks') return taskQuery;
        return createMockQueryBuilder();
      });

      mockAccountingService.createJournalEntryFromCost.mockRejectedValue(
        new Error('Journal entry failed')
      );

      // Should not throw - task should still complete
      const result = await service.complete(TEST_IDS.user, TEST_IDS.organization, 'task-1', {
        quality_rating: 5,
        actual_cost: 500,
      });

      expect(result.status).toBe('completed');
    });
  });

  describe('Behavior - Harvest Completion', () => {
    it('should create harvest record and complete task', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const harvestTask = {
        ...MOCK_TASKS[0],
        task_type: 'harvesting',
        farm_id: 'farm-1',
        parcel_id: 'parcel-1',
      };

      const harvestQuery = createMockQueryBuilder();
      harvestQuery.eq.mockReturnValue(harvestQuery);
      harvestQuery.like.mockReturnValue(harvestQuery);
      harvestQuery.not.mockReturnValue(harvestQuery);
      harvestQuery.order.mockReturnValue(harvestQuery);
      harvestQuery.maybeSingle
        .mockResolvedValueOnce(mockQueryResult(harvestTask))
        .mockResolvedValueOnce(mockQueryResult(null, null))
        .mockResolvedValueOnce(mockQueryResult(null, null));
      // Setup limit to return the query builder, then resolve with count
      harvestQuery.limit.mockReturnValue(harvestQuery);
      harvestQuery.select.mockReturnValue(harvestQuery);
      harvestQuery.update.mockReturnValue(harvestQuery);
      harvestQuery.single
        .mockResolvedValueOnce(mockQueryResult({ ...harvestTask, status: 'completed' }))
        .mockResolvedValueOnce(
          mockQueryResult({
            id: 'harvest-1',
            lot_number: 'LOT-2024-0001',
          })
        );

      const warehouseQuery = setupWarehouseMock(TEST_IDS.organization);

      mockReceptionBatchesService.create.mockResolvedValue({
        id: 'batch-1',
      });

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'organization_users') return orgQuery;
        if (table === 'tasks') return harvestQuery;
        if (table === 'harvest_records') return harvestQuery;
        if (table === 'warehouses') return warehouseQuery;
        return createMockQueryBuilder();
      });

      const result = await service.completeWithHarvest(
        TEST_IDS.user,
        TEST_IDS.organization,
        'task-1',
        {
          harvest_date: '2024-06-15',
          quantity: 1000,
          unit: 'kg',
          quality_grade: 'A',
          workers: [],
        }
      );

      expect(result.harvest).toBeDefined();
      expect(result.harvest.lot_number).toBe('LOT-2024-0001');
      expect(result.task.status).toBe('completed');
    });

    it('should generate partial harvest lot numbers', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const harvestTask = {
        ...MOCK_TASKS[0],
        task_type: 'harvesting',
      };

      const harvestQuery = createMockQueryBuilder();
      harvestQuery.eq.mockReturnValue(harvestQuery);
      harvestQuery.like.mockReturnValue(harvestQuery);
      harvestQuery.not.mockReturnValue(harvestQuery);
      harvestQuery.order.mockReturnValue(harvestQuery);
      harvestQuery.maybeSingle
        .mockResolvedValueOnce(mockQueryResult(harvestTask))
        .mockResolvedValueOnce(mockQueryResult(null, null))
        .mockResolvedValueOnce(mockQueryResult(null, null));
      // Setup limit to return the query builder
      harvestQuery.limit.mockReturnValue(harvestQuery);
      harvestQuery.update.mockReturnValue(harvestQuery);
      harvestQuery.select.mockReturnValue(harvestQuery);
      harvestQuery.single
        .mockResolvedValueOnce(mockQueryResult(harvestTask)) // Task update for partial
        .mockResolvedValueOnce(
          mockQueryResult({
            id: 'harvest-1',
            lot_number: 'LOT-2024-0001-P',
          })
        );

      const warehouseQuery = setupWarehouseMock(TEST_IDS.organization);

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'organization_users') return orgQuery;
        if (table === 'tasks') return harvestQuery;
        if (table === 'harvest_records') return harvestQuery;
        if (table === 'warehouses') return warehouseQuery;
        return createMockQueryBuilder();
      });

      const result = await service.completeWithHarvest(
        TEST_IDS.user,
        TEST_IDS.organization,
        'task-1',
        {
          harvest_date: '2024-06-15',
          quantity: 500,
          unit: 'kg',
          is_partial: true,
          workers: [],
        }
      );

      expect(result.harvest.lot_number).toMatch(/-P$/);
      expect(result.task.status).not.toBe('completed'); // Partial keeps task active
    });
  });

  describe('Behavior - Time Tracking', () => {
    it('should clock in worker and update task status', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const timeLogQuery = createMockQueryBuilder();
      timeLogQuery.eq.mockReturnValue(timeLogQuery);
      timeLogQuery.insert.mockReturnValue(timeLogQuery);
      timeLogQuery.select.mockReturnValue(timeLogQuery);
      timeLogQuery.single.mockResolvedValue(
        mockQueryResult({
          id: 'log-1',
          start_time: new Date().toISOString(),
        })
      );

      const taskQuery = createMockQueryBuilder();
      taskQuery.eq.mockReturnValue(taskQuery);
      taskQuery.update.mockReturnValue(taskQuery);
      taskQuery.select.mockReturnValue(taskQuery);
      taskQuery.single.mockResolvedValue(
        mockQueryResult({
          ...MOCK_TASKS[0],
          status: 'in_progress',
          actual_start: new Date().toISOString(),
        })
      );

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'organization_users') return orgQuery;
        if (table === 'task_time_logs' && callCount <= 2) return timeLogQuery;
        if (table === 'tasks') return taskQuery;
        return createMockQueryBuilder();
      });

      const result = await service.clockIn(TEST_IDS.user, TEST_IDS.organization, 'task-1', {
        worker_id: 'worker-1',
      });

      expect(result.timeLog).toBeDefined();
      expect(result.task.status).toBe('in_progress');
    });

    it('should clock out worker and record duration', async () => {
      const timeLogQuery = createMockQueryBuilder();
      timeLogQuery.eq.mockReturnValue(timeLogQuery);
      timeLogQuery.update.mockReturnValue(timeLogQuery);
      timeLogQuery.select.mockReturnValue(timeLogQuery);
      timeLogQuery.single.mockResolvedValue(
        mockQueryResult({
          id: 'log-1',
          start_time: '2024-06-15T08:00:00Z',
          end_time: '2024-06-15T17:00:00Z',
          break_duration: 60,
        })
      );

      mockClient.from.mockReturnValue(timeLogQuery);

      const result = await service.clockOut(TEST_IDS.user, 'log-1', {
        break_duration: 60,
        notes: 'Completed work',
      });

      expect(result.end_time).toBeDefined();
      expect(result.break_duration).toBe(60);
    });
  });

  // ============================================================
  // EDGE CASE TESTS
  // ============================================================

  describe('Edge Cases', () => {
    it('should handle tasks without assigned workers', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const taskQuery = createMockQueryBuilder();
      taskQuery.eq.mockReturnValue(taskQuery);
      taskQuery.insert.mockReturnValue(taskQuery);
      taskQuery.select.mockReturnValue(taskQuery);
      taskQuery.single.mockResolvedValue(
        mockQueryResult({
          ...MOCK_TASKS[0],
          assigned_to: null,
          worker: null,
        })
      );

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgQuery;
        if (table === 'tasks') return taskQuery;
        return createMockQueryBuilder();
      });

      const result = await service.create(TEST_IDS.user, TEST_IDS.organization, {
        title: 'Unassigned Task',
        task_type: 'maintenance',
        farm_id: 'farm-1',
        scheduled_start: '2024-06-15T08:00:00Z',
        scheduled_end: '2024-06-15T17:00:00Z',
      });

      expect(result.assigned_to).toBeNull();
      expect(result.worker_name).toBeUndefined();
    });

    it('should handle tasks with zero completion percentage', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const taskQuery = createMockQueryBuilder();
      taskQuery.eq.mockReturnValue(taskQuery);
      taskQuery.insert.mockReturnValue(taskQuery);
      taskQuery.select.mockReturnValue(taskQuery);
      taskQuery.single.mockResolvedValue(
        mockQueryResult({
          ...MOCK_TASKS[0],
          completion_percentage: 0,
        })
      );

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgQuery;
        if (table === 'tasks') return taskQuery;
        return createMockQueryBuilder();
      });

      const result = await service.create(TEST_IDS.user, TEST_IDS.organization, {
        title: 'New Task',
        task_type: 'planting',
        farm_id: 'farm-1',
        scheduled_start: '2024-06-15T08:00:00Z',
        scheduled_end: '2024-06-15T17:00:00Z',
      });

      expect(result.completion_percentage).toBe(0);
    });

    it('should handle tasks with 100% completion percentage', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const taskQuery = createMockQueryBuilder();
      taskQuery.eq.mockReturnValue(taskQuery);
      taskQuery.maybeSingle.mockResolvedValueOnce(
        mockQueryResult({
          ...MOCK_TASKS[0],
          title: 'Task',
          task_type: 'planting',
        })
      );
      taskQuery.update.mockReturnValue(taskQuery);
      taskQuery.select.mockReturnValue(taskQuery);
      taskQuery.single.mockResolvedValue(
        mockQueryResult({
          ...MOCK_TASKS[0],
          status: 'completed',
          completion_percentage: 100,
        })
      );

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgQuery;
        if (table === 'tasks') return taskQuery;
        return createMockQueryBuilder();
      });

      const result = await service.complete(TEST_IDS.user, TEST_IDS.organization, 'task-1', {
        quality_rating: 5,
      });

      expect(result.completion_percentage).toBe(100);
    });

    it('should handle pagination correctly', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const taskQuery = createMockQueryBuilder();
      taskQuery.eq.mockReturnValue(taskQuery);
      taskQuery.in.mockReturnValue(taskQuery);
      taskQuery.or.mockReturnValue(taskQuery);
      taskQuery.order.mockReturnValue(taskQuery);
      // Range needs to be chainable and then resolve with data
      taskQuery.range.mockReturnValue(taskQuery);
      setupThenableMock(taskQuery, [MOCK_TASKS[0]], null);

      const countQuery = createMockQueryBuilder();
      countQuery.eq.mockReturnValue(countQuery);
      countQuery.in.mockReturnValue(countQuery);
      countQuery.or.mockReturnValue(countQuery);
      countQuery.limit.mockReturnValue(countQuery);
      // The count query returns { count: number } from the select with count: 'exact'
      setupThenableMock(countQuery, null, { count: 25 });

      let tasksCallCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgQuery;
        if (table === 'tasks') {
          tasksCallCount++;
          if (tasksCallCount === 1) return taskQuery;
          return countQuery;
        }
        return createMockQueryBuilder();
      });

      const result = await service.findAll(TEST_IDS.user, TEST_IDS.organization, {
        page: '2',
        pageSize: '10',
      }) as { data: any[]; total: number; page: number; pageSize: number; totalPages: number };

      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(3);
    });

    it('should handle sorting by different fields', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const taskQuery = createMockQueryBuilder();
      taskQuery.eq.mockReturnValue(taskQuery);
      taskQuery.in.mockReturnValue(taskQuery);
      taskQuery.or.mockReturnValue(taskQuery);
      taskQuery.then.mockResolvedValue(mockQueryResult(MOCK_TASKS));

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgQuery;
        if (table === 'tasks') return taskQuery;
        return createMockQueryBuilder();
      });

      await service.findAll(TEST_IDS.user, TEST_IDS.organization, {
        sortBy: 'priority',
        sortDir: 'asc',
      });

      expect(taskQuery.order).toHaveBeenCalledWith('priority', {
        ascending: true,
        nullsFirst: false,
      });
    });

    it('should search across title and description', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const taskQuery = createMockQueryBuilder();
      taskQuery.eq.mockReturnValue(taskQuery);
      taskQuery.in.mockReturnValue(taskQuery);
      taskQuery.or.mockReturnValue(taskQuery);
      taskQuery.then.mockResolvedValue(mockQueryResult([MOCK_TASKS[0]]));

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgQuery;
        if (table === 'tasks') return taskQuery;
        return createMockQueryBuilder();
      });

      await service.findAll(TEST_IDS.user, TEST_IDS.organization, {
        search: 'tomato',
      });

      expect(taskQuery.or).toHaveBeenCalledWith(
        'title.ilike.%tomato%,description.ilike.%tomato%'
      );
    });
  });

  // ============================================================
  // AGRICULTURAL-SPECIFIC TESTS
  // ============================================================

  describe('Agricultural Features', () => {
    it('should support weather-dependent tasks', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const taskQuery = createMockQueryBuilder();
      taskQuery.eq.mockReturnValue(taskQuery);
      taskQuery.insert.mockReturnValue(taskQuery);
      taskQuery.select.mockReturnValue(taskQuery);
      taskQuery.single.mockResolvedValue(
        mockQueryResult({
          ...MOCK_TASKS[0],
          weather_dependency: true,
        })
      );

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgQuery;
        if (table === 'tasks') return taskQuery;
        return createMockQueryBuilder();
      });

      const result = await service.create(TEST_IDS.user, TEST_IDS.organization, {
        title: 'Outdoor Planting',
        task_type: 'planting',
        farm_id: 'farm-1',
        weather_dependency: true,
        scheduled_start: '2024-06-15T08:00:00Z',
        scheduled_end: '2024-06-15T17:00:00Z',
      });

      expect(result.weather_dependency).toBe(true);
    });

    it('should link tasks to parcels and farms', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const taskQuery = createMockQueryBuilder();
      taskQuery.eq.mockReturnValue(taskQuery);
      taskQuery.insert.mockReturnValue(taskQuery);
      taskQuery.select.mockReturnValue(taskQuery);
      taskQuery.single.mockResolvedValue(
        mockQueryResult({
          ...MOCK_TASKS[0],
          farm_id: 'farm-1',
          parcel_id: 'parcel-1',
        })
      );

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgQuery;
        if (table === 'tasks') return taskQuery;
        return createMockQueryBuilder();
      });

      const result = await service.create(TEST_IDS.user, TEST_IDS.organization, {
        title: 'Irrigate Field A',
        task_type: 'irrigation',
        farm_id: 'farm-1',
        parcel_id: 'parcel-1',
        scheduled_start: '2024-06-15T08:00:00Z',
        scheduled_end: '2024-06-15T17:00:00Z',
      });

      expect(result.farm_id).toBe('farm-1');
      expect(result.parcel_id).toBe('parcel-1');
    });

    it('should track task types specific to agriculture', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const agriculturalTypes = ['planting', 'harvesting', 'irrigation', 'fertilizing'];

      for (const type of agriculturalTypes) {
        const taskQuery = createMockQueryBuilder();
        taskQuery.eq.mockReturnValue(taskQuery);
        taskQuery.insert.mockReturnValue(taskQuery);
        taskQuery.select.mockReturnValue(taskQuery);
        taskQuery.single.mockResolvedValue(
          mockQueryResult({
            ...MOCK_TASKS[0],
            task_type: type,
          })
        );

        mockClient.from.mockImplementation((table: string) => {
          if (table === 'organization_users') return orgQuery;
          if (table === 'tasks') return taskQuery;
          return createMockQueryBuilder();
        });

        const result = await service.create(TEST_IDS.user, TEST_IDS.organization, {
          title: `${type} task`,
          task_type: type as any,
          farm_id: 'farm-1',
          scheduled_start: '2024-06-15T08:00:00Z',
          scheduled_end: '2024-06-15T17:00:00Z',
        });

        expect(result.task_type).toBe(type);
      }
    });

    it('should calculate task statistics', async () => {
      const orgQuery = setupOrganizationAccessMock(TEST_IDS.organization, TEST_IDS.user);

      const allTasks = [
        { ...MOCK_TASKS[0], status: 'pending', actual_cost: null },
        { ...MOCK_TASKS[1], status: 'completed', actual_cost: 750 },
        { ...MOCK_TASKS[0], id: 'task-3', status: 'in_progress', actual_cost: null },
        { ...MOCK_TASKS[0], id: 'task-4', status: 'overdue', actual_cost: null },
      ];

      const taskQuery = createMockQueryBuilder();
      taskQuery.eq.mockReturnValue(taskQuery);
      taskQuery.select.mockResolvedValue(mockQueryResult(allTasks));

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return orgQuery;
        if (table === 'tasks') return taskQuery;
        return createMockQueryBuilder();
      });

      const result = await service.getStatistics(TEST_IDS.user, TEST_IDS.organization);

      expect(result.total_tasks).toBe(4);
      expect(result.completed_tasks).toBe(1);
      expect(result.in_progress_tasks).toBe(1);
      expect(result.overdue_tasks).toBe(1);
      expect(result.completion_rate).toBe(25);
      expect(result.total_cost).toBe(750);
    });
  });

  describe('Comments and Time Logs', () => {
    it('should add comment to task', async () => {
      const taskQuery = createMockQueryBuilder();
      taskQuery.eq.mockReturnValue(taskQuery);
      taskQuery.order.mockReturnValue(taskQuery);
      taskQuery.insert.mockReturnValue(taskQuery);
      taskQuery.select.mockReturnValue(taskQuery);
      taskQuery.single.mockResolvedValue(
        mockQueryResult({
          id: 'comment-1',
          task_id: 'task-1',
          comment: 'Great work!',
          created_at: '2024-06-15T10:00:00Z',
        })
      );

      mockClient.from.mockReturnValue(taskQuery);

      const result = await service.addComment(TEST_IDS.user, 'task-1', {
        comment: 'Great work!',
      });

      expect(result.comment).toBe('Great work!');
    });

    it('should get time logs for task', async () => {
      const timeLogQuery = createMockQueryBuilder();
      timeLogQuery.eq.mockReturnValue(timeLogQuery);
      timeLogQuery.then.mockResolvedValue(
        mockQueryResult([
          {
            id: 'log-1',
            start_time: '2024-06-15T08:00:00Z',
            end_time: '2024-06-15T17:00:00Z',
            worker: {
              first_name: 'John',
              last_name: 'Doe',
            },
          },
        ])
      );

      mockClient.from.mockReturnValue(timeLogQuery);

      const result = await service.getTimeLogs('task-1');

      expect(result).toHaveLength(1);
      expect(result[0].worker_name).toBe('John Doe');
    });
  });
});
