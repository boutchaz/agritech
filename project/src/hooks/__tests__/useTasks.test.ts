import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useAddChecklistItem,
  useAddDependency,
  useAddTaskComment,
  useAssignTask,
  useClockIn,
  useClockOut,
  useCompleteTask,
  useCreateTask,
  useCreateTaskCategory,
  useDeleteTask,
  useIsTaskBlocked,
  usePaginatedTasks,
  useRemoveChecklistItem,
  useRemoveDependency,
  useTask,
  useTaskCategories,
  useTaskChecklist,
  useTaskComments,
  useTaskDependencies,
  useTaskStatistics,
  useTaskTimeLogs,
  useTasks,
  useToggleChecklistItem,
  useUpdateTask,
  useWorkerAvailability,
} from '../useTasks';
import { tasksApi } from '../../lib/api/tasks';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
  keepPreviousData: Symbol('keepPreviousData'),
}));

vi.mock('../useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../lib/api/tasks', () => ({
  tasksApi: {
    getAll: vi.fn(),
    getPaginated: vi.fn(),
    getById: vi.fn(),
    getCategories: vi.fn(),
    getComments: vi.fn(),
    getTimeLogs: vi.fn(),
    getStatistics: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    assign: vi.fn(),
    clockIn: vi.fn(),
    clockOut: vi.fn(),
    addComment: vi.fn(),
    complete: vi.fn(),
    getChecklist: vi.fn(),
    addChecklistItem: vi.fn(),
    toggleChecklistItem: vi.fn(),
    removeChecklistItem: vi.fn(),
    getDependencies: vi.fn(),
    addDependency: vi.fn(),
    removeDependency: vi.fn(),
    isTaskBlocked: vi.fn(),
    createCategory: vi.fn(),
  },
}));

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useAuth } from '../useAuth';
import type { AuthContextType } from '../../contexts/AuthContext';

type QueryOptions = {
  queryKey: unknown[];
  queryFn: () => Promise<unknown>;
  enabled?: boolean;
  staleTime?: number;
  placeholderData?: unknown;
};

type MutationOptions<TArgs = unknown, TResult = unknown> = {
  mutationFn: (args: TArgs) => Promise<TResult>;
  onSuccess?: (data: TResult, variables: TArgs) => void;
};

const mockedUseQuery = vi.mocked(useQuery);
const mockedUseMutation = vi.mocked(useMutation);
const mockedUseQueryClient = vi.mocked(useQueryClient);
const mockedUseAuth = vi.mocked(useAuth);
const mockedTasksApi = vi.mocked(tasksApi);

const getQueryOptions = () => mockedUseQuery.mock.calls[0][0] as QueryOptions;
const getMutationOptions = <TArgs = unknown, TResult = unknown>() =>
  mockedUseMutation.mock.calls[0][0] as MutationOptions<TArgs, TResult>;

const createAuthContext = (organizationId: string | null): AuthContextType => ({
  user: null,
  profile: null,
  organizations: [],
  currentOrganization: organizationId
    ? {
        id: organizationId,
        name: 'Org',
        slug: 'org',
        role: 'organization_admin',
        is_active: true,
      }
    : null,
  farms: [],
  currentFarm: null,
  userRole: null,
  loading: false,
  needsOnboarding: false,
  needsImport: false,
  setCurrentOrganization: vi.fn(),
  setCurrentFarm: vi.fn(),
  signOut: vi.fn(),
  refreshUserData: vi.fn(),
  hasRole: vi.fn(),
  isAtLeastRole: vi.fn(),
});

const createQueryClientMock = () =>
  ({ invalidateQueries: vi.fn() }) as unknown as ReturnType<typeof useQueryClient>;

describe('useTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls useQuery with correct query key and staleTime', () => {
    const filters = { status: 'pending' as const, farm_id: 'farm-1' };

    useTasks('org-123', filters);

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['tasks', 'org-123', JSON.stringify(filters)],
      queryFn: expect.any(Function),
      enabled: true,
      staleTime: 30 * 1000,
    });
  });

  it('sets enabled to false when organization is missing', () => {
    useTasks('', { status: 'pending' as const });

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('queryFn calls tasksApi.getAll with organizationId and filters', async () => {
    const filters = { status: 'pending' as const };
    mockedTasksApi.getAll.mockResolvedValue({
      data: [],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    useTasks('org-123', filters);

    const result = await getQueryOptions().queryFn();

    expect(tasksApi.getAll).toHaveBeenCalledWith('org-123', filters);
    expect(result).toEqual([]);
  });
});

describe('usePaginatedTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets keepPreviousData and staleTime correctly', () => {
    const query = { page: 2, pageSize: 25 };

    usePaginatedTasks('org-123', query);

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['tasks', 'paginated', 'org-123', JSON.stringify(query)],
      queryFn: expect.any(Function),
      enabled: true,
      placeholderData: keepPreviousData,
      staleTime: 30 * 1000,
    });
  });

  it('returns an empty paginated response when organization is missing', async () => {
    usePaginatedTasks('', { page: 1, pageSize: 10 });

    const result = await getQueryOptions().queryFn();

    expect(result).toEqual({
      data: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
    });
  });
});

describe('useCreateTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls tasksApi.create with stripped organization_id', async () => {
    useCreateTask();

    const mutation = getMutationOptions<
      { organization_id: string; title: string; task_type: string },
      unknown
    >();

    await mutation.mutationFn({
      organization_id: 'org-123',
      title: 'Harvest olives',
      task_type: 'field_task',
    });

    expect(tasksApi.create).toHaveBeenCalledWith(
      {
        title: 'Harvest olives',
        task_type: 'field_task',
      },
      'org-123',
    );
  });

  it('onSuccess invalidates related task queries', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);

    useCreateTask();

    const mutation = getMutationOptions<
      { organization_id: string; title: string },
      unknown
    >();

    mutation.onSuccess?.({}, { organization_id: 'org-123', title: 'Harvest olives' });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['tasks'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['task-statistics', 'org-123'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['workers', 'org-123'] });
  });
});

describe('useClockIn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls tasksApi.clockIn with the correct payload', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useClockIn();

    const mutation = getMutationOptions<
      { task_id: string; worker_id: string; location_lat: number; location_lng: number; notes: string },
      unknown
    >();

    await mutation.mutationFn({
      task_id: 'task-1',
      worker_id: 'worker-1',
      location_lat: 33.9,
      location_lng: -5.5,
      notes: 'Started early',
    });

    expect(tasksApi.clockIn).toHaveBeenCalledWith('org-123', 'task-1', {
      worker_id: 'worker-1',
      location_lat: 33.9,
      location_lng: -5.5,
      notes: 'Started early',
    });
  });

  it('mutationFn throws when organization is missing', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext(null));

    useClockIn();

    const mutation = getMutationOptions<{ task_id: string; worker_id: string }, unknown>();

    await expect(mutation.mutationFn({ task_id: 'task-1', worker_id: 'worker-1' })).rejects.toThrow(
      'No organization selected',
    );
  });

  it('onSuccess invalidates task and time log queries', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useClockIn();

    const mutation = getMutationOptions<
      { task_id: string; worker_id: string },
      { task: { id: string } }
    >();

    mutation.onSuccess?.({ task: { id: 'task-1' } }, { task_id: 'task-1', worker_id: 'worker-1' });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['task', 'org-123', 'task-1'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['task-time-logs', 'task-1'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['tasks'] });
  });
});

describe('useTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls useQuery with correct query key', () => {
    useTask('org-123', 'task-1');

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['task', 'org-123', 'task-1'],
      queryFn: expect.any(Function),
      enabled: true,
    });
  });

  it('disables query when organization or task is missing', () => {
    useTask(null, 'task-1');

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('queryFn calls tasksApi.getById', async () => {
    mockedTasksApi.getById.mockResolvedValue({ id: 'task-1' } as never);

    useTask('org-123', 'task-1');

    const result = await getQueryOptions().queryFn();

    expect(tasksApi.getById).toHaveBeenCalledWith('org-123', 'task-1');
    expect(result).toEqual({ id: 'task-1' });
  });
});

describe('useTaskCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses correct query key', () => {
    useTaskCategories('org-123');

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['task-categories', 'org-123'],
      queryFn: expect.any(Function),
      enabled: true,
    });
  });

  it('disables query when no organization', () => {
    useTaskCategories('');

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('queryFn fetches categories', async () => {
    mockedTasksApi.getCategories.mockResolvedValue([{ id: 'cat-1', name: 'Harvest' }] as never);

    useTaskCategories('org-123');

    const result = await getQueryOptions().queryFn();

    expect(tasksApi.getCategories).toHaveBeenCalledWith('org-123');
    expect(result).toEqual([{ id: 'cat-1', name: 'Harvest' }]);
  });
});

describe('useTaskComments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses correct query key', () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useTaskComments('task-1');

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['task-comments', 'task-1'],
      queryFn: expect.any(Function),
      enabled: true,
    });
  });

  it('disables query when no organization', () => {
    mockedUseAuth.mockReturnValue(createAuthContext(null));

    useTaskComments('task-1');

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('queryFn fetches task comments', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));
    mockedTasksApi.getComments.mockResolvedValue([{ id: 'comment-1', comment: 'Done' }] as never);

    useTaskComments('task-1');

    const result = await getQueryOptions().queryFn();

    expect(tasksApi.getComments).toHaveBeenCalledWith('org-123', 'task-1');
    expect(result).toEqual([{ id: 'comment-1', comment: 'Done' }]);
  });
});

describe('useTaskTimeLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses correct query key', () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useTaskTimeLogs('task-1');

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['task-time-logs', 'task-1'],
      queryFn: expect.any(Function),
      enabled: true,
    });
  });

  it('disables query when no task', () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useTaskTimeLogs(null);

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('queryFn fetches time logs', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));
    mockedTasksApi.getTimeLogs.mockResolvedValue([{ id: 'log-1' }] as never);

    useTaskTimeLogs('task-1');

    const result = await getQueryOptions().queryFn();

    expect(tasksApi.getTimeLogs).toHaveBeenCalledWith('org-123', 'task-1');
    expect(result).toEqual([{ id: 'log-1' }]);
  });
});

describe('useWorkerAvailability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses correct query key and stays disabled', () => {
    useWorkerAvailability('worker-1', '2026-04-16');

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['worker-availability', 'worker-1', '2026-04-16'],
      queryFn: expect.any(Function),
      enabled: false,
    });
  });

  it('queryFn returns null placeholder data', async () => {
    useWorkerAvailability('worker-1', '2026-04-16');

    await expect(getQueryOptions().queryFn()).resolves.toBeNull();
  });
});

describe('useTaskStatistics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses correct query key', () => {
    useTaskStatistics('org-123');

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['task-statistics', 'org-123'],
      queryFn: expect.any(Function),
      enabled: true,
    });
  });

  it('disables query when no organization', () => {
    useTaskStatistics('');

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('queryFn fetches statistics', async () => {
    mockedTasksApi.getStatistics.mockResolvedValue({ completed: 3 } as never);

    useTaskStatistics('org-123');

    const result = await getQueryOptions().queryFn();

    expect(tasksApi.getStatistics).toHaveBeenCalledWith('org-123');
    expect(result).toEqual({ completed: 3 });
  });
});

describe('useUpdateTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls tasksApi.update', async () => {
    useUpdateTask();

    const mutation = getMutationOptions<
      { taskId: string; organizationId: string; updates: { title: string } },
      unknown
    >();

    await mutation.mutationFn({
      taskId: 'task-1',
      organizationId: 'org-123',
      updates: { title: 'Updated task' },
    });

    expect(tasksApi.update).toHaveBeenCalledWith('task-1', { title: 'Updated task' }, 'org-123');
  });

  it('onSuccess invalidates related task queries', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);

    useUpdateTask();

    const mutation = getMutationOptions<
      { taskId: string; organizationId: string; updates: { title: string } },
      unknown
    >();

    mutation.onSuccess?.({}, { taskId: 'task-1', organizationId: 'org-123', updates: { title: 'Updated task' } });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['task', 'org-123', 'task-1'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['tasks'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['task-statistics', 'org-123'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['task-comments', 'task-1'] });
  });
});

describe('useDeleteTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls tasksApi.delete and returns identifiers', async () => {
    useDeleteTask();

    const mutation = getMutationOptions<
      { taskId: string; organizationId: string },
      { taskId: string; organizationId: string }
    >();

    const result = await mutation.mutationFn({ taskId: 'task-1', organizationId: 'org-123' });

    expect(tasksApi.delete).toHaveBeenCalledWith('task-1', 'org-123');
    expect(result).toEqual({ taskId: 'task-1', organizationId: 'org-123' });
  });

  it('onSuccess invalidates tasks and statistics', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);

    useDeleteTask();

    const mutation = getMutationOptions<{ taskId: string; organizationId: string }, unknown>();
    mutation.onSuccess?.({}, { taskId: 'task-1', organizationId: 'org-123' });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['tasks'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['task-statistics', 'org-123'] });
  });
});

describe('useAssignTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls tasksApi.assign', async () => {
    useAssignTask();

    const mutation = getMutationOptions<
      { taskId: string; organizationId: string; workerId: string },
      unknown
    >();

    await mutation.mutationFn({ taskId: 'task-1', organizationId: 'org-123', workerId: 'worker-1' });

    expect(tasksApi.assign).toHaveBeenCalledWith('org-123', 'task-1', 'worker-1');
  });

  it('onSuccess invalidates task queries', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);

    useAssignTask();

    const mutation = getMutationOptions<
      { taskId: string; organizationId: string; workerId: string },
      { id: string; organization_id: string }
    >();

    mutation.onSuccess?.({ id: 'task-1', organization_id: 'org-123' }, { taskId: 'task-1', organizationId: 'org-123', workerId: 'worker-1' });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['task', 'org-123', 'task-1'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['tasks'] });
  });
});

describe('useClockOut', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls tasksApi.clockOut with the correct payload', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useClockOut();

    const mutation = getMutationOptions<
      { time_log_id: string; break_duration: number; notes: string },
      unknown
    >();

    await mutation.mutationFn({ time_log_id: 'log-1', break_duration: 30, notes: 'Lunch break' });

    expect(tasksApi.clockOut).toHaveBeenCalledWith('org-123', 'log-1', {
      break_duration: 30,
      notes: 'Lunch break',
    });
  });

  it('mutationFn throws when organization is missing', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext(null));

    useClockOut();

    const mutation = getMutationOptions<{ time_log_id: string }, unknown>();

    await expect(mutation.mutationFn({ time_log_id: 'log-1' })).rejects.toThrow('No organization selected');
  });

  it('onSuccess invalidates task and time log queries when a task exists', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useClockOut();

    const mutation = getMutationOptions<{ time_log_id: string }, { task: { id: string } }>();
    mutation.onSuccess?.({ task: { id: 'task-1' } }, { time_log_id: 'log-1' });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['task', 'org-123', 'task-1'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['task-time-logs', 'task-1'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['tasks'] });
  });
});

describe('useAddTaskComment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls tasksApi.addComment with worker_id', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useAddTaskComment();

    const mutation = getMutationOptions<
      { task_id: string; comment: string; worker_id?: string },
      unknown
    >();

    await mutation.mutationFn({ task_id: 'task-1', comment: 'Looks good', worker_id: 'worker-1' });

    expect(tasksApi.addComment).toHaveBeenCalledWith('org-123', 'task-1', {
      comment: 'Looks good',
      worker_id: 'worker-1',
    });
  });

  it('onSuccess invalidates comments and task queries', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useAddTaskComment();

    const mutation = getMutationOptions<
      { task_id: string; comment: string },
      { task_id: string }
    >();

    mutation.onSuccess?.({ task_id: 'task-1' }, { task_id: 'task-1', comment: 'Looks good' });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['task-comments', 'task-1'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['task', 'org-123', 'task-1'] });
  });
});

describe('useCompleteTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls tasksApi.complete with completion payload', async () => {
    useCompleteTask();

    const mutation = getMutationOptions<
      {
        taskId: string;
        organizationId: string;
        qualityRating?: number;
        actualCost?: number;
        notes?: string;
      },
      unknown
    >();

    await mutation.mutationFn({
      taskId: 'task-1',
      organizationId: 'org-123',
      qualityRating: 5,
      actualCost: 1200,
      notes: 'Completed on time',
    });

    expect(tasksApi.complete).toHaveBeenCalledWith('org-123', 'task-1', {
      quality_rating: 5,
      actual_cost: 1200,
      notes: 'Completed on time',
    });
  });

  it('onSuccess invalidates task, tasks, and statistics queries', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);

    useCompleteTask();

    const mutation = getMutationOptions<
      { taskId: string; organizationId: string },
      unknown
    >();

    mutation.onSuccess?.({}, { taskId: 'task-1', organizationId: 'org-123' });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['task', 'org-123', 'task-1'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['tasks'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['task-statistics', 'org-123'] });
  });
});

describe('useTaskChecklist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses correct query key', () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useTaskChecklist('task-1');

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['task-checklist', 'org-123', 'task-1'],
      queryFn: expect.any(Function),
      enabled: true,
    });
  });

  it('disables query when no task or organization', () => {
    mockedUseAuth.mockReturnValue(createAuthContext(null));

    useTaskChecklist(null);

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('queryFn fetches checklist', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));
    mockedTasksApi.getChecklist.mockResolvedValue([{ id: 'item-1', title: 'Prepare soil' }] as never);

    useTaskChecklist('task-1');

    const result = await getQueryOptions().queryFn();

    expect(tasksApi.getChecklist).toHaveBeenCalledWith('org-123', 'task-1');
    expect(result).toEqual([{ id: 'item-1', title: 'Prepare soil' }]);
  });
});

describe('useAddChecklistItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls tasksApi.addChecklistItem', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useAddChecklistItem();

    const mutation = getMutationOptions<{ taskId: string; title: string }, unknown>();
    await mutation.mutationFn({ taskId: 'task-1', title: 'Bring tools' });

    expect(tasksApi.addChecklistItem).toHaveBeenCalledWith('org-123', 'task-1', 'Bring tools');
  });

  it('onSuccess invalidates checklist and task queries', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useAddChecklistItem();

    const mutation = getMutationOptions<{ taskId: string; title: string }, unknown>();
    mutation.onSuccess?.({}, { taskId: 'task-1', title: 'Bring tools' });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['task-checklist', 'org-123', 'task-1'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['task', 'org-123', 'task-1'] });
  });
});

describe('useToggleChecklistItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls tasksApi.toggleChecklistItem', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useToggleChecklistItem();

    const mutation = getMutationOptions<{ taskId: string; itemId: string }, unknown>();
    await mutation.mutationFn({ taskId: 'task-1', itemId: 'item-1' });

    expect(tasksApi.toggleChecklistItem).toHaveBeenCalledWith('org-123', 'task-1', 'item-1');
  });

  it('onSuccess invalidates checklist and task queries', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useToggleChecklistItem();

    const mutation = getMutationOptions<{ taskId: string; itemId: string }, unknown>();
    mutation.onSuccess?.({}, { taskId: 'task-1', itemId: 'item-1' });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['task-checklist', 'org-123', 'task-1'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['task', 'org-123', 'task-1'] });
  });
});

describe('useRemoveChecklistItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls tasksApi.removeChecklistItem', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useRemoveChecklistItem();

    const mutation = getMutationOptions<{ taskId: string; itemId: string }, unknown>();
    await mutation.mutationFn({ taskId: 'task-1', itemId: 'item-1' });

    expect(tasksApi.removeChecklistItem).toHaveBeenCalledWith('org-123', 'task-1', 'item-1');
  });

  it('onSuccess invalidates checklist and task queries', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useRemoveChecklistItem();

    const mutation = getMutationOptions<{ taskId: string; itemId: string }, unknown>();
    mutation.onSuccess?.({}, { taskId: 'task-1', itemId: 'item-1' });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['task-checklist', 'org-123', 'task-1'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['task', 'org-123', 'task-1'] });
  });
});

describe('useTaskDependencies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses correct query key', () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useTaskDependencies('task-1');

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['task-dependencies', 'org-123', 'task-1'],
      queryFn: expect.any(Function),
      enabled: true,
    });
  });

  it('disables query when no task', () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useTaskDependencies(null);

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('queryFn fetches dependencies', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));
    mockedTasksApi.getDependencies.mockResolvedValue({ depends_on: [], blocking: [] } as never);

    useTaskDependencies('task-1');

    const result = await getQueryOptions().queryFn();

    expect(tasksApi.getDependencies).toHaveBeenCalledWith('org-123', 'task-1');
    expect(result).toEqual({ depends_on: [], blocking: [] });
  });
});

describe('useAddDependency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls tasksApi.addDependency', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useAddDependency();

    const mutation = getMutationOptions<
      { taskId: string; dependsOnTaskId: string; dependencyType?: string; lagDays?: number },
      unknown
    >();

    await mutation.mutationFn({
      taskId: 'task-1',
      dependsOnTaskId: 'task-2',
      dependencyType: 'finish_to_start',
      lagDays: 2,
    });

    expect(tasksApi.addDependency).toHaveBeenCalledWith('org-123', 'task-1', 'task-2', 'finish_to_start', 2);
  });

  it('onSuccess invalidates dependency and blocked queries', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useAddDependency();

    const mutation = getMutationOptions<
      { taskId: string; dependsOnTaskId: string; dependencyType?: string; lagDays?: number },
      unknown
    >();

    mutation.onSuccess?.({}, { taskId: 'task-1', dependsOnTaskId: 'task-2', dependencyType: 'finish_to_start', lagDays: 2 });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['task-dependencies', 'org-123', 'task-1'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['task-dependencies', 'org-123', 'task-2'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['task-blocked', 'org-123', 'task-1'] });
  });
});

describe('useRemoveDependency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls tasksApi.removeDependency', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useRemoveDependency();

    const mutation = getMutationOptions<{ dependencyId: string }, unknown>();
    await mutation.mutationFn({ dependencyId: 'dep-1' });

    expect(tasksApi.removeDependency).toHaveBeenCalledWith('org-123', 'dep-1');
  });

  it('onSuccess invalidates dependency and blocked queries', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useRemoveDependency();

    const mutation = getMutationOptions<{ dependencyId: string }, unknown>();
    mutation.onSuccess?.({}, { dependencyId: 'dep-1' });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['task-dependencies'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['task-blocked'] });
  });
});

describe('useIsTaskBlocked', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses correct query key', () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useIsTaskBlocked('task-1');

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['task-blocked', 'org-123', 'task-1'],
      queryFn: expect.any(Function),
      enabled: true,
    });
  });

  it('disables query when no task', () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useIsTaskBlocked(null);

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('queryFn checks blocked status', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));
    mockedTasksApi.isTaskBlocked.mockResolvedValue({ is_blocked: true } as never);

    useIsTaskBlocked('task-1');

    const result = await getQueryOptions().queryFn();

    expect(tasksApi.isTaskBlocked).toHaveBeenCalledWith('org-123', 'task-1');
    expect(result).toEqual({ is_blocked: true });
  });
});

describe('useCreateTaskCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mutationFn calls tasksApi.createCategory', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useCreateTaskCategory();

    const mutation = getMutationOptions<{ name: string; color: string }, unknown>();
    await mutation.mutationFn({ name: 'Irrigation', color: '#00f' });

    expect(tasksApi.createCategory).toHaveBeenCalledWith('org-123', { name: 'Irrigation', color: '#00f' });
  });

  it('mutationFn throws when organization is missing', async () => {
    mockedUseAuth.mockReturnValue(createAuthContext(null));

    useCreateTaskCategory();

    const mutation = getMutationOptions<{ name: string }, unknown>();
    await expect(mutation.mutationFn({ name: 'Irrigation' })).rejects.toThrow('No organization selected');
  });

  it('onSuccess invalidates category queries', () => {
    const queryClient = createQueryClientMock();
    mockedUseQueryClient.mockReturnValue(queryClient);
    mockedUseAuth.mockReturnValue(createAuthContext('org-123'));

    useCreateTaskCategory();

    const mutation = getMutationOptions<{ name: string }, unknown>();
    mutation.onSuccess?.({}, { name: 'Irrigation' });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['task-categories', 'org-123'] });
  });
});
