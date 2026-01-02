import { apiClient } from '../api-client';
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
  async getOne(id: string, organizationId?: string): Promise<TaskSummary> {
    if (!organizationId) throw new Error('organizationId is required');
    return apiClient.get<TaskSummary>(`/api/v1/organizations/${organizationId}/tasks/${id}`);
  },

  // Alias for backwards compatibility
  async getById(organizationId: string, taskId: string): Promise<TaskSummary> {
    return this.getOne(taskId, organizationId);
  },

  /**
   * Create a new task
   * Note: Payment fields (payment_type, work_unit_id, units_required, rate_per_unit)
   * require backend deployment. If the backend doesn't support them yet, we retry without them.
   */
  async create(data: CreateTaskRequest, organizationId?: string): Promise<Task> {
    if (!organizationId) throw new Error('organizationId is required');
    
    try {
      return await apiClient.post<Task>(`/api/v1/organizations/${organizationId}/tasks`, data);
    } catch (error: any) {
      // If the error is about payment fields not being supported, retry without them
      const errorMessage = error?.message || '';
      if (errorMessage.includes('payment_type should not exist') ||
          errorMessage.includes('work_unit_id should not exist') ||
          errorMessage.includes('units_required should not exist') ||
          errorMessage.includes('rate_per_unit should not exist')) {
        // Strip payment-related fields and retry
        const { payment_type, work_unit_id, units_required, rate_per_unit, ...basicData } = data;
        console.warn('Backend does not support payment fields yet. Creating task without them.');
        return apiClient.post<Task>(`/api/v1/organizations/${organizationId}/tasks`, basicData);
      }
      throw error;
    }
  },

  /**
   * Update a task
   */
  async update(id: string, data: UpdateTaskRequest, organizationId?: string): Promise<Task> {
    if (!organizationId) throw new Error('organizationId is required');
    return apiClient.patch<Task>(`/api/v1/organizations/${organizationId}/tasks/${id}`, data);
  },

  /**
   * Delete a task
   */
  async delete(id: string, organizationId?: string): Promise<{ message: string }> {
    if (!organizationId) throw new Error('organizationId is required');
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
