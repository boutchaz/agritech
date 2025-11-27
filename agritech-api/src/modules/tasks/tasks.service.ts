import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskFiltersDto } from './dto/task-filters.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { CompleteHarvestTaskDto } from './dto/complete-harvest-task.dto';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const client = createClient(supabaseUrl, supabaseKey);

@Injectable()
export class TasksService {
  /**
   * Verify user has access to the organization
   */
  private async verifyOrganizationAccess(userId: string, organizationId: string) {
    const { data: orgUser } = await client
      .from('organization_users')
      .select('organization_id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (!orgUser) {
      throw new ForbiddenException('You do not have access to this organization');
    }
  }

  /**
   * Get all tasks for an organization with filters
   */
  async findAll(userId: string, organizationId: string, filters?: TaskFiltersDto) {
    await this.verifyOrganizationAccess(userId, organizationId);

    let query = client
      .from('tasks')
      .select(`
        *,
        worker:workers!assigned_to(first_name, last_name),
        farm:farms!farm_id(name),
        parcel:parcels!parcel_id(name)
      `)
      .eq('organization_id', organizationId);

    // Apply filters
    if (filters?.status) {
      const statuses = filters.status.split(',');
      query = query.in('status', statuses);
    }

    if (filters?.priority) {
      const priorities = filters.priority.split(',');
      query = query.in('priority', priorities);
    }

    if (filters?.task_type) {
      const types = filters.task_type.split(',');
      query = query.in('task_type', types);
    }

    if (filters?.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to);
    }

    if (filters?.farm_id) {
      query = query.eq('farm_id', filters.farm_id);
    }

    if (filters?.parcel_id) {
      query = query.eq('parcel_id', filters.parcel_id);
    }

    if (filters?.date_from) {
      query = query.gte('scheduled_start', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte('scheduled_start', filters.date_to);
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    query = query.order('scheduled_start', { ascending: false, nullsFirst: false });

    const { data: tasks, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch tasks: ${error.message}`);
    }

    return (tasks || []).map(task => ({
      ...task,
      worker_name: task.worker
        ? `${task.worker.first_name} ${task.worker.last_name}`
        : undefined,
      farm_name: Array.isArray(task.farm) ? task.farm[0]?.name : task.farm?.name,
      parcel_name: Array.isArray(task.parcel) ? task.parcel[0]?.name : task.parcel?.name,
    }));
  }

  /**
   * Get a single task by ID
   */
  async findOne(userId: string, organizationId: string, taskId: string) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const { data: task, error } = await client
      .from('tasks')
      .select(`
        *,
        worker:workers!assigned_to(first_name, last_name),
        farm:farms!farm_id(name),
        parcel:parcels!parcel_id(name)
      `)
      .eq('id', taskId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch task: ${error.message}`);
    }

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return {
      ...task,
      worker_name: task.worker
        ? `${task.worker.first_name} ${task.worker.last_name}`
        : undefined,
      farm_name: Array.isArray(task.farm) ? task.farm[0]?.name : task.farm?.name,
      parcel_name: Array.isArray(task.parcel) ? task.parcel[0]?.name : task.parcel?.name,
    };
  }

  /**
   * Create a new task
   */
  async create(userId: string, organizationId: string, createTaskDto: CreateTaskDto) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const taskData = {
      ...createTaskDto,
      organization_id: organizationId,
      status: 'pending',
      completion_percentage: 0,
      weather_dependency: createTaskDto.weather_dependency ?? false,
    };

    const { data: task, error } = await client
      .from('tasks')
      .insert(taskData)
      .select(`
        *,
        worker:workers!assigned_to(first_name, last_name),
        farm:farms!farm_id(name),
        parcel:parcels!parcel_id(name)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create task: ${error.message}`);
    }

    return {
      ...task,
      worker_name: task.worker
        ? `${task.worker.first_name} ${task.worker.last_name}`
        : undefined,
      farm_name: Array.isArray(task.farm) ? task.farm[0]?.name : task.farm?.name,
      parcel_name: Array.isArray(task.parcel) ? task.parcel[0]?.name : task.parcel?.name,
    };
  }

  /**
   * Update a task
   */
  async update(userId: string, organizationId: string, taskId: string, updateTaskDto: UpdateTaskDto) {
    await this.verifyOrganizationAccess(userId, organizationId);

    // Verify task belongs to organization
    const { data: existingTask } = await client
      .from('tasks')
      .select('id')
      .eq('id', taskId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!existingTask) {
      throw new NotFoundException('Task not found');
    }

    const { data: task, error } = await client
      .from('tasks')
      .update(updateTaskDto)
      .eq('id', taskId)
      .select(`
        *,
        worker:workers!assigned_to(first_name, last_name),
        farm:farms!farm_id(name),
        parcel:parcels!parcel_id(name)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update task: ${error.message}`);
    }

    return {
      ...task,
      worker_name: task.worker
        ? `${task.worker.first_name} ${task.worker.last_name}`
        : undefined,
      farm_name: Array.isArray(task.farm) ? task.farm[0]?.name : task.farm?.name,
      parcel_name: Array.isArray(task.parcel) ? task.parcel[0]?.name : task.parcel?.name,
    };
  }

  /**
   * Delete a task
   */
  async remove(userId: string, organizationId: string, taskId: string) {
    await this.verifyOrganizationAccess(userId, organizationId);

    // Verify task belongs to organization
    const { data: existingTask } = await client
      .from('tasks')
      .select('id')
      .eq('id', taskId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!existingTask) {
      throw new NotFoundException('Task not found');
    }

    const { error } = await client
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      throw new Error(`Failed to delete task: ${error.message}`);
    }

    return { message: 'Task deleted successfully' };
  }

  /**
   * Assign a task to a worker
   */
  async assign(userId: string, organizationId: string, taskId: string, assignTaskDto: AssignTaskDto) {
    await this.verifyOrganizationAccess(userId, organizationId);

    // Verify task belongs to organization
    const { data: existingTask } = await client
      .from('tasks')
      .select('id')
      .eq('id', taskId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!existingTask) {
      throw new NotFoundException('Task not found');
    }

    const { data: task, error } = await client
      .from('tasks')
      .update({
        assigned_to: assignTaskDto.worker_id,
        status: 'assigned',
      })
      .eq('id', taskId)
      .select(`
        *,
        worker:workers!assigned_to(first_name, last_name),
        farm:farms!farm_id(name),
        parcel:parcels!parcel_id(name)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to assign task: ${error.message}`);
    }

    return {
      ...task,
      worker_name: task.worker
        ? `${task.worker.first_name} ${task.worker.last_name}`
        : undefined,
      farm_name: Array.isArray(task.farm) ? task.farm[0]?.name : task.farm?.name,
      parcel_name: Array.isArray(task.parcel) ? task.parcel[0]?.name : task.parcel?.name,
    };
  }

  /**
   * Complete a task
   */
  async complete(userId: string, organizationId: string, taskId: string, completeTaskDto: CompleteTaskDto) {
    await this.verifyOrganizationAccess(userId, organizationId);

    // Verify task belongs to organization
    const { data: existingTask } = await client
      .from('tasks')
      .select('id')
      .eq('id', taskId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!existingTask) {
      throw new NotFoundException('Task not found');
    }

    const now = new Date().toISOString();

    const { data: task, error } = await client
      .from('tasks')
      .update({
        status: 'completed',
        completed_date: now.split('T')[0],
        actual_end: now,
        completion_percentage: 100,
        quality_rating: completeTaskDto.quality_rating,
        actual_cost: completeTaskDto.actual_cost,
        notes: completeTaskDto.notes,
      })
      .eq('id', taskId)
      .select(`
        *,
        worker:workers!assigned_to(first_name, last_name),
        farm:farms!farm_id(name),
        parcel:parcels!parcel_id(name)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to complete task: ${error.message}`);
    }

    return {
      ...task,
      worker_name: task.worker
        ? `${task.worker.first_name} ${task.worker.last_name}`
        : undefined,
      farm_name: Array.isArray(task.farm) ? task.farm[0]?.name : task.farm?.name,
      parcel_name: Array.isArray(task.parcel) ? task.parcel[0]?.name : task.parcel?.name,
    };
  }

  /**
   * Complete a harvest task and create harvest record
   */
  async completeWithHarvest(
    userId: string,
    organizationId: string,
    taskId: string,
    completeDto: CompleteHarvestTaskDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    // Verify task belongs to organization and is a harvest task
    const { data: existingTask } = await client
      .from('tasks')
      .select('id, task_type, farm_id, parcel_id, assigned_to')
      .eq('id', taskId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!existingTask) {
      throw new NotFoundException('Task not found');
    }

    if (existingTask.task_type !== 'harvesting') {
      throw new BadRequestException('Only harvest tasks can create harvest records');
    }

    const now = new Date().toISOString();

    // Complete the task
    const { data: task, error: taskError } = await client
      .from('tasks')
      .update({
        status: 'completed',
        completed_date: now.split('T')[0],
        actual_end: now,
        completion_percentage: 100,
        quality_rating: completeDto.quality_rating,
        actual_cost: completeDto.actual_cost,
        notes: completeDto.notes,
      })
      .eq('id', taskId)
      .select(`
        *,
        worker:workers!assigned_to(first_name, last_name),
        farm:farms!farm_id(name),
        parcel:parcels!parcel_id(name)
      `)
      .single();

    if (taskError) {
      throw new Error(`Failed to complete task: ${taskError.message}`);
    }

    // Calculate estimated revenue if price provided
    const estimated_revenue = completeDto.expected_price_per_unit
      ? completeDto.quantity * completeDto.expected_price_per_unit
      : undefined;

    // Create harvest record
    const { data: harvest, error: harvestError } = await client
      .from('harvest_records')
      .insert({
        organization_id: organizationId,
        farm_id: existingTask.farm_id,
        parcel_id: existingTask.parcel_id,
        crop_id: completeDto.crop_id,
        harvest_date: completeDto.harvest_date,
        quantity: completeDto.quantity,
        unit: completeDto.unit,
        quality_grade: completeDto.quality_grade,
        quality_score: completeDto.quality_score,
        quality_notes: completeDto.quality_notes,
        harvest_task_id: taskId,
        workers: completeDto.workers,
        supervisor_id: completeDto.supervisor_id,
        storage_location: completeDto.storage_location,
        temperature: completeDto.temperature,
        humidity: completeDto.humidity,
        intended_for: completeDto.intended_for,
        expected_price_per_unit: completeDto.expected_price_per_unit,
        estimated_revenue,
        status: 'stored',
        notes: completeDto.harvest_notes,
        created_by: userId,
      })
      .select()
      .single();

    if (harvestError) {
      throw new Error(`Failed to create harvest record: ${harvestError.message}`);
    }

    return {
      task: {
        ...task,
        worker_name: task.worker
          ? `${task.worker.first_name} ${task.worker.last_name}`
          : undefined,
        farm_name: Array.isArray(task.farm) ? task.farm[0]?.name : task.farm?.name,
        parcel_name: Array.isArray(task.parcel) ? task.parcel[0]?.name : task.parcel?.name,
      },
      harvest,
    };
  }

  /**
   * Get task statistics for an organization
   */
  async getStatistics(userId: string, organizationId: string) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const { data: tasks, error } = await client
      .from('tasks')
      .select('*')
      .eq('organization_id', organizationId);

    if (error) {
      throw new Error(`Failed to fetch task statistics: ${error.message}`);
    }

    const total_tasks = tasks?.length || 0;
    const completed_tasks = tasks?.filter(t => t.status === 'completed').length || 0;
    const in_progress_tasks = tasks?.filter(t => t.status === 'in_progress').length || 0;
    const overdue_tasks = tasks?.filter(t => t.status === 'overdue').length || 0;

    return {
      total_tasks,
      completed_tasks,
      in_progress_tasks,
      overdue_tasks,
      completion_rate: total_tasks > 0 ? (completed_tasks / total_tasks) * 100 : 0,
      total_cost: tasks?.reduce((sum, t) => sum + (t.actual_cost || 0), 0) || 0,
    };
  }
}
