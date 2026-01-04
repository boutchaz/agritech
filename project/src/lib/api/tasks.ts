import { apiClient } from '../api-client';
import { buildQueryUrl, requireOrganizationId } from './createCrudApi';
import type { PaginatedQuery, PaginatedResponse } from './types';
import type {
  Task,
  TaskSummary,
  TaskFilters,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskStatistics,
  CompleteHarvestTaskRequest,
  CompleteHarvestTaskResponse,
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

export interface PaginatedTaskQuery extends PaginatedQuery {
  status?: string;
  priority?: string;
  task_type?: string;
  assigned_to?: string;
  farm_id?: string;
  parcel_id?: string;
}

export const tasksApi = {
  /**
   * Get all tasks assigned to the current user across all organizations
   */
  async getMyTasks(): Promise<TaskSummary[]> {
    return apiClient.get<TaskSummary[]>('/api/v1/my-tasks');
  },

  /**
   * Get all tasks for an organization
   */
  async getAll(organizationId: string, filters?: TaskFilters): Promise<TaskSummary[]> {
    const url = buildQueryUrl(`/api/v1/organizations/${organizationId}/tasks`, filters as Record<string, unknown>);
    return apiClient.get<TaskSummary[]>(url);
  },

  async getPaginated(organizationId: string, query: PaginatedTaskQuery): Promise<PaginatedResponse<TaskSummary>> {
    const params = new URLSearchParams();
    if (query.page) params.append('page', String(query.page));
    if (query.pageSize) params.append('pageSize', String(query.pageSize));
    if (query.sortBy) params.append('sortBy', query.sortBy);
    if (query.sortDir) params.append('sortDir', query.sortDir);
    if (query.search) params.append('search', query.search);
    if (query.dateFrom) params.append('dateFrom', query.dateFrom);
    if (query.dateTo) params.append('dateTo', query.dateTo);
    if (query.status) params.append('status', query.status);
    if (query.priority) params.append('priority', query.priority);
    if (query.task_type) params.append('task_type', query.task_type);
    if (query.assigned_to) params.append('assigned_to', query.assigned_to);
    if (query.farm_id) params.append('farm_id', query.farm_id);
    if (query.parcel_id) params.append('parcel_id', query.parcel_id);
    const queryString = params.toString();
    return apiClient.get<PaginatedResponse<TaskSummary>>(`/api/v1/organizations/${organizationId}/tasks${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Get a single task by ID
   */
  async getOne(id: string, organizationId?: string): Promise<TaskSummary> {
    requireOrganizationId(organizationId, 'tasksApi.getOne');
    return apiClient.get<TaskSummary>(`/api/v1/organizations/${organizationId}/tasks/${id}`);
  },

  // Alias for backwards compatibility
  async getById(organizationId: string, taskId: string): Promise<TaskSummary> {
    return this.getOne(taskId, organizationId);
  },

  /**
   * Create a new task
   */
  async create(data: CreateTaskRequest, organizationId?: string): Promise<Task> {
    requireOrganizationId(organizationId, 'tasksApi.create');
    return apiClient.post<Task>(`/api/v1/organizations/${organizationId}/tasks`, data);
  },

  /**
   * Update a task
   */
  async update(id: string, data: UpdateTaskRequest, organizationId?: string): Promise<Task> {
    requireOrganizationId(organizationId, 'tasksApi.update');
    return apiClient.patch<Task>(`/api/v1/organizations/${organizationId}/tasks/${id}`, data);
  },

  /**
   * Delete a task
   */
  async delete(id: string, organizationId?: string): Promise<{ message: string }> {
    requireOrganizationId(organizationId, 'tasksApi.delete');
    return apiClient.delete<{ message: string }>(`/api/v1/organizations/${organizationId}/tasks/${id}`);
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
   * Complete a harvest task and create harvest record
   */
  async completeWithHarvest(
    organizationId: string,
    taskId: string,
    data: CompleteHarvestTaskRequest
  ): Promise<CompleteHarvestTaskResponse> {
    return apiClient.post<CompleteHarvestTaskResponse>(
      `/api/v1/organizations/${organizationId}/tasks/${taskId}/complete-with-harvest`,
      data
    );
  },

  /**
   * Get task statistics
   */
  async getStatistics(organizationId: string): Promise<TaskStatistics> {
    return apiClient.get<TaskStatistics>(`/api/v1/organizations/${organizationId}/tasks/statistics`);
  },

  // =====================================================
  // TASK CATEGORIES
  // =====================================================

  /**
   * Get all task categories for an organization
   */
  async getCategories(organizationId: string): Promise<any[]> {
    return apiClient.get<any[]>(`/api/v1/organizations/${organizationId}/tasks/categories/all`);
  },

  /**
   * Create a new task category
   */
  async createCategory(organizationId: string, data: any): Promise<any> {
    return apiClient.post<any>(`/api/v1/organizations/${organizationId}/tasks/categories`, data);
  },

  // =====================================================
  // TASK COMMENTS
  // =====================================================

  /**
   * Get all comments for a task
   */
  async getComments(organizationId: string, taskId: string): Promise<any[]> {
    return apiClient.get<any[]>(`/api/v1/organizations/${organizationId}/tasks/${taskId}/comments`);
  },

  /**
   * Add a comment to a task
   */
  async addComment(organizationId: string, taskId: string, data: { comment: string; worker_id?: string }): Promise<any> {
    return apiClient.post<any>(`/api/v1/organizations/${organizationId}/tasks/${taskId}/comments`, data);
  },

  // =====================================================
  // TASK TIME LOGS
  // =====================================================

  /**
   * Get all time logs for a task
   */
  async getTimeLogs(organizationId: string, taskId: string): Promise<any[]> {
    return apiClient.get<any[]>(`/api/v1/organizations/${organizationId}/tasks/${taskId}/time-logs`);
  },

  /**
   * Clock in to a task (start time tracking)
   */
  async clockIn(organizationId: string, taskId: string, data: {
    worker_id: string;
    location_lat?: number;
    location_lng?: number;
    notes?: string;
  }): Promise<any> {
    return apiClient.post<any>(`/api/v1/organizations/${organizationId}/tasks/${taskId}/clock-in`, data);
  },

  /**
   * Clock out from a task (end time tracking)
   */
  async clockOut(organizationId: string, timeLogId: string, data: {
    break_duration?: number;
    notes?: string;
  }): Promise<any> {
    return apiClient.patch<any>(`/api/v1/organizations/${organizationId}/tasks/time-logs/${timeLogId}/clock-out`, data);
  },
};
