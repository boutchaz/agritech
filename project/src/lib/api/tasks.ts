import { apiClient } from '../api-client';
import { requireOrganizationId } from './createCrudApi';
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

  async getAll(organizationId: string, filters?: TaskFilters): Promise<TaskSummary[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        // Skip organization_id as it's sent via header
        if (key === 'organization_id') return;
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    const queryString = params.toString();
    const url = queryString ? `/api/v1/tasks?${queryString}` : '/api/v1/tasks';
    return apiClient.get<TaskSummary[]>(url, {}, organizationId);
  },

  async getPaginated(organizationId: string, query: PaginatedTaskQuery): Promise<PaginatedResponse<TaskSummary>> {
    const params = new URLSearchParams();
    if (query.page) params.append('page', String(query.page));
    if (query.pageSize) params.append('pageSize', String(query.pageSize));
    if (query.sortBy) params.append('sortBy', query.sortBy);
    if (query.sortDir) params.append('sortDir', query.sortDir);
    if (query.search) params.append('search', query.search);
    if (query.dateFrom) params.append('date_from', query.dateFrom);
    if (query.dateTo) params.append('date_to', query.dateTo);
    if (query.status) params.append('status', query.status);
    if (query.priority) params.append('priority', query.priority);
    if (query.task_type) params.append('task_type', query.task_type);
    if (query.assigned_to) params.append('assigned_to', query.assigned_to);
    if (query.farm_id) params.append('farm_id', query.farm_id);
    if (query.parcel_id) params.append('parcel_id', query.parcel_id);
    const queryString = params.toString();
    const url = queryString ? `/api/v1/tasks?${queryString}` : '/api/v1/tasks';
    return apiClient.get<PaginatedResponse<TaskSummary>>(url, {}, organizationId);
  },

  async getOne(id: string, organizationId?: string): Promise<TaskSummary> {
    requireOrganizationId(organizationId, 'tasksApi.getOne');
    return apiClient.get<TaskSummary>(`/api/v1/tasks/${id}`, {}, organizationId);
  },

  async getById(organizationId: string, taskId: string): Promise<TaskSummary> {
    return this.getOne(taskId, organizationId);
  },

  async create(data: CreateTaskRequest, organizationId?: string): Promise<Task> {
    requireOrganizationId(organizationId, 'tasksApi.create');
    return apiClient.post<Task>('/api/v1/tasks', data, {}, organizationId);
  },

  async update(id: string, data: UpdateTaskRequest, organizationId?: string): Promise<Task> {
    requireOrganizationId(organizationId, 'tasksApi.update');
    return apiClient.patch<Task>(`/api/v1/tasks/${id}`, data, {}, organizationId);
  },

  async delete(id: string, organizationId?: string): Promise<{ message: string }> {
    requireOrganizationId(organizationId, 'tasksApi.delete');
    return apiClient.delete<{ message: string }>(`/api/v1/tasks/${id}`, {}, organizationId);
  },

  async assign(organizationId: string, taskId: string, workerId: string): Promise<Task> {
    return apiClient.patch<Task>(`/api/v1/tasks/${taskId}/assign`, {
      worker_id: workerId,
    }, {}, organizationId);
  },

  async complete(
    organizationId: string,
    taskId: string,
    data: {
      quality_rating?: number;
      actual_cost?: number;
      notes?: string;
    }
  ): Promise<Task> {
    return apiClient.patch<Task>(`/api/v1/tasks/${taskId}/complete`, data, {}, organizationId);
  },

  async completeWithHarvest(
    organizationId: string,
    taskId: string,
    data: CompleteHarvestTaskRequest
  ): Promise<CompleteHarvestTaskResponse> {
    return apiClient.post<CompleteHarvestTaskResponse>(
      `/api/v1/tasks/${taskId}/complete-with-harvest`,
      data,
      {},
      organizationId
    );
  },

  async getStatistics(organizationId: string): Promise<TaskStatistics> {
    return apiClient.get<TaskStatistics>('/api/v1/tasks/statistics', {}, organizationId);
  },

  async getCategories(organizationId: string): Promise<any[]> {
    return apiClient.get<any[]>('/api/v1/tasks/categories/all', {}, organizationId);
  },

  async createCategory(organizationId: string, data: any): Promise<any> {
    return apiClient.post<any>('/api/v1/tasks/categories', data, {}, organizationId);
  },

  async getComments(organizationId: string, taskId: string): Promise<any[]> {
    return apiClient.get<any[]>(`/api/v1/tasks/${taskId}/comments`, {}, organizationId);
  },

  async addComment(organizationId: string, taskId: string, data: { comment: string; worker_id?: string }): Promise<any> {
    return apiClient.post<any>(`/api/v1/tasks/${taskId}/comments`, data, {}, organizationId);
  },

  async getTimeLogs(organizationId: string, taskId: string): Promise<any[]> {
    return apiClient.get<any[]>(`/api/v1/tasks/${taskId}/time-logs`, {}, organizationId);
  },

  async clockIn(organizationId: string, taskId: string, data: {
    worker_id: string;
    location_lat?: number;
    location_lng?: number;
    notes?: string;
  }): Promise<any> {
    return apiClient.post<any>(`/api/v1/tasks/${taskId}/clock-in`, data, {}, organizationId);
  },

  async clockOut(organizationId: string, timeLogId: string, data: {
    break_duration?: number;
    notes?: string;
  }): Promise<any> {
    return apiClient.patch<any>(`/api/v1/tasks/time-logs/${timeLogId}/clock-out`, data, {}, organizationId);
  },
};
