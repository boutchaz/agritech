import { apiClient } from '../api-client';
import { requireOrganizationId } from './createCrudApi';
import type { PaginatedQuery, PaginatedResponse } from './types';
import type {
  Task,
  TaskSummary,
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
    const res = await apiClient.get<{ data: TaskSummary[] }>('/api/v1/tasks/my-tasks');
    return res?.data || [];
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getAll(organizationId: string, filters?: any): Promise<PaginatedResponse<TaskSummary>> {
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
    return apiClient.get<PaginatedResponse<TaskSummary>>(url, {}, organizationId);
  },

  /** @deprecated Use getAll() — backend now always returns PaginatedResponse */
  async getPaginated(organizationId: string, query: PaginatedTaskQuery): Promise<PaginatedResponse<TaskSummary>> {
    return this.getAll(organizationId, query);
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

  async start(organizationId: string, taskId: string): Promise<Task> {
    return apiClient.post<Task>(`/api/v1/tasks/${taskId}/start`, {}, {}, organizationId);
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

  // Checklist API
  async getChecklist(organizationId: string, taskId: string): Promise<any[]> {
    return apiClient.get<any[]>(`/api/v1/tasks/${taskId}/checklist`, {}, organizationId);
  },

  async updateChecklist(organizationId: string, taskId: string, checklist: any[]): Promise<any> {
    return apiClient.put<any>(`/api/v1/tasks/${taskId}/checklist`, { checklist }, {}, organizationId);
  },

  async addChecklistItem(organizationId: string, taskId: string, title: string): Promise<any> {
    return apiClient.post<any>(`/api/v1/tasks/${taskId}/checklist/items`, { title }, {}, organizationId);
  },

  async toggleChecklistItem(organizationId: string, taskId: string, itemId: string): Promise<any> {
    return apiClient.patch<any>(`/api/v1/tasks/${taskId}/checklist/items/${itemId}/toggle`, {}, {}, organizationId);
  },

  async removeChecklistItem(organizationId: string, taskId: string, itemId: string): Promise<any> {
    return apiClient.delete<any>(`/api/v1/tasks/${taskId}/checklist/items/${itemId}`, {}, organizationId);
  },

  // Dependencies API
  async getDependencies(organizationId: string, taskId: string): Promise<any> {
    return apiClient.get(`/api/v1/tasks/${taskId}/dependencies`, {}, organizationId);
  },

  async addDependency(organizationId: string, taskId: string, dependsOnTaskId: string, dependencyType?: string, lagDays?: number): Promise<any> {
    return apiClient.post(`/api/v1/tasks/${taskId}/dependencies`, {
      depends_on_task_id: dependsOnTaskId,
      dependency_type: dependencyType || 'finish_to_start',
      lag_days: lagDays || 0,
    }, {}, organizationId);
  },

  async removeDependency(organizationId: string, dependencyId: string): Promise<any> {
    return apiClient.delete(`/api/v1/tasks/dependencies/${dependencyId}`, {}, organizationId);
  },

  async isTaskBlocked(organizationId: string, taskId: string): Promise<any> {
    return apiClient.get(`/api/v1/tasks/${taskId}/blocked`, {}, organizationId);
  },
};
