import { apiClient } from '../api-client';

export interface TaskAssignment {
  id: string;
  task_id: string;
  worker_id: string;
  organization_id: string;
  role: 'worker' | 'supervisor' | 'lead';
  assigned_at: string;
  assigned_by?: string;
  status: 'assigned' | 'working' | 'completed' | 'removed';
  started_at?: string;
  completed_at?: string;
  hours_worked?: number;
  units_completed?: number;
  notes?: string;
  payment_included_in_salary?: boolean;
  bonus_amount?: number | null;
  created_at: string;
  updated_at: string;
  worker?: {
    id: string;
    first_name: string;
    last_name: string;
    position?: string;
  };
}

export interface CreateTaskAssignmentDto {
  worker_id: string;
  role?: 'worker' | 'supervisor' | 'lead';
  notes?: string;
  payment_included_in_salary?: boolean;
  bonus_amount?: number;
}

export interface BulkCreateTaskAssignmentsDto {
  assignments: CreateTaskAssignmentDto[];
}

export interface UpdateTaskAssignmentDto {
  status?: 'assigned' | 'working' | 'completed' | 'removed';
  hours_worked?: number;
  units_completed?: number;
  payment_included_in_salary?: boolean;
  bonus_amount?: number;
  notes?: string;
}

export const taskAssignmentsApi = {
  /**
   * Get all workers assigned to a task
   */
  async getTaskAssignments(organizationId: string, taskId: string): Promise<TaskAssignment[]> {
    return apiClient.get<TaskAssignment[]>(
      `/api/v1/organizations/${organizationId}/tasks/${taskId}/assignments`
    );
  },

  /**
   * Assign a single worker to a task
   */
  async createAssignment(
    organizationId: string,
    taskId: string,
    data: CreateTaskAssignmentDto
  ): Promise<TaskAssignment> {
    return apiClient.post<TaskAssignment>(
      `/api/v1/organizations/${organizationId}/tasks/${taskId}/assignments`,
      data
    );
  },

  /**
   * Assign multiple workers to a task
   */
  async bulkCreateAssignments(
    organizationId: string,
    taskId: string,
    data: BulkCreateTaskAssignmentsDto
  ): Promise<TaskAssignment[]> {
    return apiClient.post<TaskAssignment[]>(
      `/api/v1/organizations/${organizationId}/tasks/${taskId}/assignments/bulk`,
      data
    );
  },

  /**
   * Sync workers for a task (create new, remove deselected) — use in edit mode
   */
  async syncAssignments(
    organizationId: string,
    taskId: string,
    data: BulkCreateTaskAssignmentsDto
  ): Promise<TaskAssignment[]> {
    return apiClient.post<TaskAssignment[]>(
      `/api/v1/organizations/${organizationId}/tasks/${taskId}/assignments/sync`,
      data
    );
  },

  /**
   * Update a task assignment
   */
  async updateAssignment(
    organizationId: string,
    taskId: string,
    assignmentId: string,
    data: UpdateTaskAssignmentDto
  ): Promise<TaskAssignment> {
    return apiClient.patch<TaskAssignment>(
      `/api/v1/organizations/${organizationId}/tasks/${taskId}/assignments/${assignmentId}`,
      data
    );
  },

  /**
   * Remove a worker from a task
   */
  async removeAssignment(
    organizationId: string,
    taskId: string,
    assignmentId: string
  ): Promise<void> {
    await apiClient.delete(
      `/api/v1/organizations/${organizationId}/tasks/${taskId}/assignments/${assignmentId}`
    );
  },
};
