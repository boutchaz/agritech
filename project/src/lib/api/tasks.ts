import { apiClient } from '../api-client';
import type {
  Task,
  TaskSummary,
  TaskFilters,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskStatistics,
} from '../../types/tasks';

export interface TaskApiFilters {
  status?: string; // comma-separated
  priority?: string; // comma-separated
  task_type?: string; // comma-separated
  assigned_to?: string;
  farm_id?: string;
  parcel_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export const tasksApi = {
  /**
   * Get all tasks for an organization
   */
  async getAll(organizationId: string, filters?: TaskFilters): Promise<TaskSummary[]> {
    const params = new URLSearchParams();

    if (filters?.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      params.append('status', statuses.join(','));
    }

    if (filters?.priority) {
      const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
      params.append('priority', priorities.join(','));
    }

    if (filters?.task_type) {
      const types = Array.isArray(filters.task_type) ? filters.task_type : [filters.task_type];
      params.append('task_type', types.join(','));
    }

    if (filters?.assigned_to) params.append('assigned_to', filters.assigned_to);
    if (filters?.farm_id) params.append('farm_id', filters.farm_id);
    if (filters?.parcel_id) params.append('parcel_id', filters.parcel_id);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.search) params.append('search', filters.search);

    const queryString = params.toString();
    const url = `/api/v1/organizations/${organizationId}/tasks${queryString ? `?${queryString}` : ''}`;

    return apiClient.get<TaskSummary[]>(url);
  },

  /**
   * Get a single task by ID
   */
  async getById(organizationId: string, taskId: string): Promise<TaskSummary> {
    return apiClient.get<TaskSummary>(`/api/v1/organizations/${organizationId}/tasks/${taskId}`);
  },

  /**
   * Create a new task
   */
  async create(organizationId: string, data: CreateTaskRequest): Promise<Task> {
    return apiClient.post<Task>(`/api/v1/organizations/${organizationId}/tasks`, data);
  },

  /**
   * Update a task
   */
  async update(organizationId: string, taskId: string, data: UpdateTaskRequest): Promise<Task> {
    return apiClient.patch<Task>(`/api/v1/organizations/${organizationId}/tasks/${taskId}`, data);
  },

  /**
   * Delete a task
   */
  async delete(organizationId: string, taskId: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/api/v1/organizations/${organizationId}/tasks/${taskId}`);
  },

  /**
   * Assign a task to a worker
   */
  async assign(organizationId: string, taskId: string, workerId: string): Promise<Task> {
    return apiClient.patch<Task>(`/api/v1/organizations/${organizationId}/tasks/${taskId}/assign`, {
      worker_id: workerId,
    });
  },

  /**
   * Complete a task
   */
  async complete(
    organizationId: string,
    taskId: string,
    data: {
      quality_rating?: number;
      actual_cost?: number;
      notes?: string;
    }
  ): Promise<Task> {
    return apiClient.patch<Task>(`/api/v1/organizations/${organizationId}/tasks/${taskId}/complete`, data);
  },

  /**
   * Get task statistics
   */
  async getStatistics(organizationId: string): Promise<TaskStatistics> {
    return apiClient.get<TaskStatistics>(`/api/v1/organizations/${organizationId}/tasks/statistics`);
  },
};
