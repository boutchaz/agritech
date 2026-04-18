import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { NotificationsService, OPERATIONAL_ROLES } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/notification.dto';
import { TaskAssignmentsService } from './task-assignments.service';
import {
  createMockQueryBuilder,
  createMockSupabaseClient,
  mockQueryResult,
  setupTableMock,
  setupThenableMock,
  MockQueryBuilder,
  MockSupabaseClient,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS, TEST_USER_ID } from '../../../test/helpers/test-utils';

describe('TaskAssignmentsService', () => {
  let service: TaskAssignmentsService;
  let mockClient: MockSupabaseClient;
  let mockNotificationsService: {
    createNotificationsForRoles: jest.Mock;
  };

  const assignmentId = 'assignment-123';

  const assignmentRecord = {
    id: assignmentId,
    task_id: TEST_IDS.task,
    worker_id: TEST_IDS.worker,
    organization_id: TEST_IDS.organization,
    role: 'worker' as const,
    status: 'assigned' as const,
    assigned_at: '2026-04-16T10:00:00.000Z',
    created_at: '2026-04-16T10:00:00.000Z',
    updated_at: '2026-04-16T10:00:00.000Z',
    worker: {
      id: TEST_IDS.worker,
      first_name: 'Fatima',
      last_name: 'El Idrissi',
      position: 'Operator',
    },
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
    mockNotificationsService = {
      createNotificationsForRoles: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskAssignmentsService,
        { provide: DatabaseService, useValue: { getAdminClient: () => mockClient } },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<TaskAssignmentsService>(TaskAssignmentsService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('getTaskAssignments', () => {
    it('returns non-removed assignments scoped to organization and task', async () => {
      const assignmentsBuilder = setupTableMock(mockClient, 'task_assignments');
      setupThenableMock(assignmentsBuilder, [assignmentRecord]);

      const result = await service.getTaskAssignments(
        TEST_IDS.organization,
        TEST_IDS.task,
        TEST_USER_ID,
      );

      expect(result).toEqual([assignmentRecord]);
      expect(assignmentsBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
      expect(assignmentsBuilder.eq).toHaveBeenCalledWith('task_id', TEST_IDS.task);
      expect(assignmentsBuilder.neq).toHaveBeenCalledWith('status', 'removed');
      expect(assignmentsBuilder.order).toHaveBeenCalledWith('assigned_at', { ascending: true });
    });

    it('returns an empty array when the task has no assignments', async () => {
      const assignmentsBuilder = setupTableMock(mockClient, 'task_assignments');
      setupThenableMock(assignmentsBuilder, null);

      await expect(
        service.getTaskAssignments(TEST_IDS.organization, TEST_IDS.task, TEST_USER_ID),
      ).resolves.toEqual([]);
    });

    it('throws when fetching assignments fails', async () => {
      const assignmentsBuilder = setupTableMock(mockClient, 'task_assignments');
      setupThenableMock(assignmentsBuilder, null, { message: 'query failed' });

      await expect(
        service.getTaskAssignments(TEST_IDS.organization, TEST_IDS.task, TEST_USER_ID),
      ).rejects.toThrow('Failed to fetch task assignments: query failed');
    });
  });

  describe('createAssignment', () => {
    it('creates an assignment, updates task status, and sends notifications', async () => {
      const assignmentsLookupBuilder = createMockQueryBuilder();
      const assignmentsInsertBuilder = createMockQueryBuilder();
      const tasksBuilder = createMockQueryBuilder();

      assignmentsLookupBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null));
      assignmentsInsertBuilder.single.mockResolvedValue(mockQueryResult(assignmentRecord));
      setupThenableMock(tasksBuilder, { data: null, error: null });

      configureFromMocks({
        task_assignments: [assignmentsLookupBuilder, assignmentsInsertBuilder],
        tasks: tasksBuilder,
      });

      const dto = {
        worker_id: TEST_IDS.worker,
        role: 'worker' as const,
        payment_included_in_salary: true,
        bonus_amount: 120,
        notes: 'Field prep',
      };

      const result = await service.createAssignment(
        TEST_IDS.organization,
        TEST_IDS.task,
        dto,
        TEST_USER_ID,
      );

      expect(result).toEqual(assignmentRecord);
      expect(assignmentsInsertBuilder.insert).toHaveBeenCalledWith({
        task_id: TEST_IDS.task,
        worker_id: TEST_IDS.worker,
        organization_id: TEST_IDS.organization,
        role: 'worker',
        assigned_by: TEST_USER_ID,
        payment_included_in_salary: true,
        bonus_amount: 120,
        notes: 'Field prep',
      });
      expect(tasksBuilder.eq).toHaveBeenCalledWith('id', TEST_IDS.task);
      expect(tasksBuilder.eq).toHaveBeenCalledWith('status', 'pending');
      expect(mockNotificationsService.createNotificationsForRoles).toHaveBeenCalledWith(
        TEST_IDS.organization,
        OPERATIONAL_ROLES,
        TEST_USER_ID,
        NotificationType.TASK_REASSIGNED,
        '🔄 Task assigned to Fatima El Idrissi',
        'Worker assigned to task',
        {
          taskId: TEST_IDS.task,
          assignmentId,
          workerId: TEST_IDS.worker,
          workerName: 'Fatima El Idrissi',
        },
      );
    });

    it('re-activates a removed assignment and preserves payment fields', async () => {
      const assignmentsLookupBuilder = createMockQueryBuilder();
      const assignmentsUpdateBuilder = createMockQueryBuilder();

      assignmentsLookupBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({ id: assignmentId, status: 'removed' }),
      );
      assignmentsUpdateBuilder.single.mockResolvedValue(
        mockQueryResult({ ...assignmentRecord, payment_included_in_salary: false, bonus_amount: 50 }),
      );

      configureFromMocks({
        task_assignments: [assignmentsLookupBuilder, assignmentsUpdateBuilder],
      });

      const result = await service.createAssignment(
        TEST_IDS.organization,
        TEST_IDS.task,
        {
          worker_id: TEST_IDS.worker,
          role: 'lead',
          payment_included_in_salary: false,
          bonus_amount: 50,
          notes: 'Return to task',
        },
        TEST_USER_ID,
      );

      expect(result).toEqual(
        expect.objectContaining({ payment_included_in_salary: false, bonus_amount: 50 }),
      );
      expect(assignmentsUpdateBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'assigned',
          role: 'lead',
          payment_included_in_salary: false,
          bonus_amount: 50,
          notes: 'Return to task',
        }),
      );
    });

    it('throws ConflictException when the worker is already assigned', async () => {
      const assignmentsBuilder = setupTableMock(mockClient, 'task_assignments');
      assignmentsBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({ id: assignmentId, status: 'assigned' }),
      );

      await expect(
        service.createAssignment(
          TEST_IDS.organization,
          TEST_IDS.task,
          { worker_id: TEST_IDS.worker },
          TEST_USER_ID,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('does not fail assignment creation when notification sending fails', async () => {
      const assignmentsLookupBuilder = createMockQueryBuilder();
      const assignmentsInsertBuilder = createMockQueryBuilder();
      const tasksBuilder = createMockQueryBuilder();

      assignmentsLookupBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null));
      assignmentsInsertBuilder.single.mockResolvedValue(mockQueryResult(assignmentRecord));
      setupThenableMock(tasksBuilder, { data: null, error: null });
      mockNotificationsService.createNotificationsForRoles.mockRejectedValue(
        new Error('notifications offline'),
      );

      configureFromMocks({
        task_assignments: [assignmentsLookupBuilder, assignmentsInsertBuilder],
        tasks: tasksBuilder,
      });

      await expect(
        service.createAssignment(
          TEST_IDS.organization,
          TEST_IDS.task,
          { worker_id: TEST_IDS.worker },
          TEST_USER_ID,
        ),
      ).resolves.toEqual(assignmentRecord);
    });
  });

  describe('bulkCreateAssignments', () => {
    it('returns only successful assignments and skips conflicts', async () => {
      const conflict = new ConflictException('duplicate');
      const createAssignmentSpy = jest
        .spyOn(service, 'createAssignment')
        .mockRejectedValueOnce(conflict)
        .mockResolvedValueOnce(assignmentRecord);

      const result = await service.bulkCreateAssignments(
        TEST_IDS.organization,
        TEST_IDS.task,
        {
          assignments: [{ worker_id: 'worker-a' }, { worker_id: TEST_IDS.worker }],
        },
        TEST_USER_ID,
      );

      expect(result).toEqual([assignmentRecord]);
      expect(createAssignmentSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateAssignment', () => {
    it('sets started_at when transitioning to working', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-04-16T12:00:00.000Z'));

      const assignmentsBuilder = setupTableMock(mockClient, 'task_assignments');
      assignmentsBuilder.single.mockResolvedValue(
        mockQueryResult({ ...assignmentRecord, status: 'working', started_at: '2026-04-16T12:00:00.000Z' }),
      );

      const result = await service.updateAssignment(
        TEST_IDS.organization,
        TEST_IDS.task,
        assignmentId,
        { status: 'working' },
        TEST_USER_ID,
      );

      expect(result).toEqual(
        expect.objectContaining({ status: 'working', started_at: '2026-04-16T12:00:00.000Z' }),
      );
      expect(assignmentsBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'working',
          started_at: '2026-04-16T12:00:00.000Z',
          updated_at: '2026-04-16T12:00:00.000Z',
        }),
      );
      expect(assignmentsBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
      expect(assignmentsBuilder.eq).toHaveBeenCalledWith('task_id', TEST_IDS.task);
    });

    it('sets completed_at when transitioning to completed', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-04-16T13:00:00.000Z'));

      const assignmentsBuilder = setupTableMock(mockClient, 'task_assignments');
      assignmentsBuilder.single.mockResolvedValue(
        mockQueryResult({ ...assignmentRecord, status: 'completed', completed_at: '2026-04-16T13:00:00.000Z' }),
      );

      const result = await service.updateAssignment(
        TEST_IDS.organization,
        TEST_IDS.task,
        assignmentId,
        { status: 'completed', hours_worked: 7 },
        TEST_USER_ID,
      );

      expect(result).toEqual(
        expect.objectContaining({ status: 'completed', completed_at: '2026-04-16T13:00:00.000Z' }),
      );
      expect(assignmentsBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          hours_worked: 7,
          completed_at: '2026-04-16T13:00:00.000Z',
        }),
      );
    });

    it('throws NotFoundException when the assignment does not exist', async () => {
      const assignmentsBuilder = setupTableMock(mockClient, 'task_assignments');
      assignmentsBuilder.single.mockResolvedValue(mockQueryResult(null));

      await expect(
        service.updateAssignment(
          TEST_IDS.organization,
          TEST_IDS.task,
          assignmentId,
          { status: 'working' },
          TEST_USER_ID,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when the database update fails', async () => {
      const assignmentsBuilder = setupTableMock(mockClient, 'task_assignments');
      assignmentsBuilder.single.mockResolvedValue(
        mockQueryResult(null, { message: 'update failed' }),
      );

      await expect(
        service.updateAssignment(
          TEST_IDS.organization,
          TEST_IDS.task,
          assignmentId,
          { status: 'working' },
          TEST_USER_ID,
        ),
      ).rejects.toThrow('Failed to update task assignment: update failed');
    });
  });

  describe('removeAssignment', () => {
    it('soft deletes the assignment within organization scope', async () => {
      const assignmentsBuilder = setupTableMock(mockClient, 'task_assignments');
      setupThenableMock(assignmentsBuilder, { error: null });

      await expect(
        service.removeAssignment(
          TEST_IDS.organization,
          TEST_IDS.task,
          assignmentId,
          TEST_USER_ID,
        ),
      ).resolves.toBeUndefined();

      expect(assignmentsBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'removed' }),
      );
      expect(assignmentsBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
      expect(assignmentsBuilder.eq).toHaveBeenCalledWith('task_id', TEST_IDS.task);
    });
  });

  describe('getWorkerAssignments', () => {
    it('returns worker assignments with task details when requested', async () => {
      const assignmentsBuilder = createMockQueryBuilder();
      const tasksBuilder = createMockQueryBuilder();

      setupThenableMock(assignmentsBuilder, [assignmentRecord]);
      setupThenableMock(tasksBuilder, [
        {
          id: TEST_IDS.task,
          title: 'Irrigation round',
          task_type: 'irrigation',
          status: 'assigned',
          scheduled_start: '2026-04-16T09:00:00.000Z',
          due_date: '2026-04-16T18:00:00.000Z',
          farm_id: TEST_IDS.farm,
          parcel_id: TEST_IDS.parcel,
        },
      ]);

      configureFromMocks({
        task_assignments: assignmentsBuilder,
        tasks: tasksBuilder,
      });

      const result = await service.getWorkerAssignments(
        TEST_IDS.organization,
        TEST_IDS.worker,
        TEST_USER_ID,
        { includeTask: true, status: ['assigned'] },
      );

      expect(result).toEqual([
        expect.objectContaining({
          id: assignmentId,
          task: expect.objectContaining({ id: TEST_IDS.task, title: 'Irrigation round' }),
        }),
      ]);
      expect(assignmentsBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
      expect(assignmentsBuilder.eq).toHaveBeenCalledWith('worker_id', TEST_IDS.worker);
      expect(assignmentsBuilder.in).toHaveBeenCalledWith('status', ['assigned']);
      expect(tasksBuilder.in).toHaveBeenCalledWith('id', [TEST_IDS.task]);
    });

    it('excludes removed assignments by default', async () => {
      const assignmentsBuilder = setupTableMock(mockClient, 'task_assignments');
      setupThenableMock(assignmentsBuilder, []);

      await service.getWorkerAssignments(TEST_IDS.organization, TEST_IDS.worker, TEST_USER_ID);

      expect(assignmentsBuilder.neq).toHaveBeenCalledWith('status', 'removed');
    });
  });
});
