import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreateTaskAssignmentDto,
  BulkCreateTaskAssignmentsDto,
  UpdateTaskAssignmentDto,
} from './dto/create-task-assignment.dto';

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
  created_at: string;
  updated_at: string;
  worker?: {
    id: string;
    first_name: string;
    last_name: string;
    position?: string;
  };
}

@Injectable()
export class TaskAssignmentsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getTaskAssignments(
    organizationId: string,
    taskId: string,
    _userId: string,
  ): Promise<TaskAssignment[]> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('task_assignments')
      .select(`
        *,
        worker:workers!worker_id(id, first_name, last_name, position)
      `)
      .eq('organization_id', organizationId)
      .eq('task_id', taskId)
      .neq('status', 'removed')
      .order('assigned_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch task assignments: ${error.message}`);
    }

    return data || [];
  }

  async createAssignment(
    organizationId: string,
    taskId: string,
    dto: CreateTaskAssignmentDto,
    userId: string,
  ): Promise<TaskAssignment> {
    const client = this.databaseService.getAdminClient();

    // Check if worker is already assigned
    const { data: existing } = await client
      .from('task_assignments')
      .select('id, status')
      .eq('task_id', taskId)
      .eq('worker_id', dto.worker_id)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'removed') {
        // Re-activate the assignment
        const { data, error } = await client
          .from('task_assignments')
          .update({
            status: 'assigned',
            role: dto.role || 'worker',
            notes: dto.notes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select(`
            *,
            worker:workers!worker_id(id, first_name, last_name, position)
          `)
          .single();

        if (error) throw new Error(`Failed to re-activate assignment: ${error.message}`);
        return data;
      }
      throw new ConflictException('Worker is already assigned to this task');
    }

    const { data, error } = await client
      .from('task_assignments')
      .insert({
        task_id: taskId,
        worker_id: dto.worker_id,
        organization_id: organizationId,
        role: dto.role || 'worker',
        assigned_by: userId,
        notes: dto.notes,
      })
      .select(`
        *,
        worker:workers!worker_id(id, first_name, last_name, position)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create task assignment: ${error.message}`);
    }

    // Update task status to 'assigned' if it was 'pending'
    await client
      .from('tasks')
      .update({ status: 'assigned', updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .eq('status', 'pending');

    return data;
  }

  async bulkCreateAssignments(
    organizationId: string,
    taskId: string,
    dto: BulkCreateTaskAssignmentsDto,
    userId: string,
  ): Promise<TaskAssignment[]> {
    const results: TaskAssignment[] = [];

    for (const assignment of dto.assignments) {
      try {
        const result = await this.createAssignment(organizationId, taskId, assignment, userId);
        results.push(result);
      } catch (error) {
        // Skip duplicates in bulk operation
        if (!(error instanceof ConflictException)) {
          throw error;
        }
      }
    }

    return results;
  }

  async updateAssignment(
    organizationId: string,
    taskId: string,
    assignmentId: string,
    dto: UpdateTaskAssignmentDto,
    _userId: string,
  ): Promise<TaskAssignment> {
    const client = this.databaseService.getAdminClient();

    const updateData: Record<string, any> = {
      ...dto,
      updated_at: new Date().toISOString(),
    };

    if (dto.status === 'working' && !updateData.started_at) {
      updateData.started_at = new Date().toISOString();
    }

    if (dto.status === 'completed' && !updateData.completed_at) {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await client
      .from('task_assignments')
      .update(updateData)
      .eq('id', assignmentId)
      .eq('organization_id', organizationId)
      .eq('task_id', taskId)
      .select(`
        *,
        worker:workers!worker_id(id, first_name, last_name, position)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update task assignment: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Task assignment not found');
    }

    return data;
  }

  async removeAssignment(
    organizationId: string,
    taskId: string,
    assignmentId: string,
    _userId: string,
  ): Promise<void> {
    const client = this.databaseService.getAdminClient();

    // Soft delete by setting status to 'removed'
    const { error } = await client
      .from('task_assignments')
      .update({
        status: 'removed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignmentId)
      .eq('organization_id', organizationId)
      .eq('task_id', taskId);

    if (error) {
      throw new Error(`Failed to remove task assignment: ${error.message}`);
    }
  }

  async getWorkerAssignments(
    organizationId: string,
    workerId: string,
    _userId: string,
    options?: {
      status?: string[];
      includeTask?: boolean;
    },
  ): Promise<TaskAssignment[]> {
    const client = this.databaseService.getAdminClient();

    // Build base query without task join
    let baseQuery = client
      .from('task_assignments')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('worker_id', workerId);

    if (options?.status && options.status.length > 0) {
      baseQuery = baseQuery.in('status', options.status);
    } else {
      baseQuery = baseQuery.neq('status', 'removed');
    }

    const { data, error } = await baseQuery.order('assigned_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch worker assignments: ${error.message}`);
    }

    // If task details needed, fetch them separately
    if (options?.includeTask && data && data.length > 0) {
      const taskIds = data.map(d => d.task_id);
      const { data: tasks } = await client
        .from('tasks')
        .select('id, title, task_type, status, scheduled_start, due_date, farm_id, parcel_id')
        .in('id', taskIds);

      if (tasks) {
        const taskMap = new Map(tasks.map(t => [t.id, t]));
        return data.map(assignment => ({
          ...assignment,
          task: taskMap.get(assignment.task_id),
        })) as TaskAssignment[];
      }
    }

    return (data as unknown as TaskAssignment[]) || [];
  }
}
