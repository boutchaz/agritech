import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskFiltersDto } from './dto/task-filters.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { CompleteHarvestTaskDto } from './dto/complete-harvest-task.dto';
import { DatabaseService } from '../database/database.service';
import { AccountingAutomationService } from '../journal-entries/accounting-automation.service';
import { ReceptionBatchesService } from '../reception-batches/reception-batches.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly accountingAutomationService: AccountingAutomationService,
    private readonly receptionBatchesService: ReceptionBatchesService,
  ) {}
  /**
   * Verify user has access to the organization
   */
  private async verifyOrganizationAccess(userId: string, organizationId: string) {
    const client = this.databaseService.getAdminClient();
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
   * Get all tasks assigned to the current user across all organizations
   */
  async findMyTasks(userId: string) {
    const client = this.databaseService.getAdminClient();

    // First, get all organizations the user belongs to
    const { data: orgUsers, error: orgError } = await client
      .from('organization_users')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (orgError) {
      throw new Error(`Failed to fetch user organizations: ${orgError.message}`);
    }

    if (!orgUsers || orgUsers.length === 0) {
      return [];
    }

    const organizationIds = orgUsers.map(ou => ou.organization_id);

    // Get tasks where user is assigned (via assigned_user_id) or linked to a worker
    const { data: tasks, error } = await client
      .from('tasks')
      .select(`
        *,
        worker:workers!assigned_to(first_name, last_name, user_id),
        farm:farms!farm_id(name),
        parcel:parcels!parcel_id(name),
        organization:organizations!organization_id(name)
      `)
      .in('organization_id', organizationIds)
      .or(`assigned_user_id.eq.${userId}`)
      .in('status', ['pending', 'assigned', 'in_progress'])
      .order('scheduled_start', { ascending: true, nullsFirst: false });

    if (error) {
      throw new Error(`Failed to fetch user tasks: ${error.message}`);
    }

    // Filter to only include tasks where user is directly assigned or assigned via worker
    const userTasks = (tasks || []).filter(task => {
      if (task.assigned_user_id === userId) return true;
      if (task.worker?.user_id === userId) return true;
      return false;
    });

    return userTasks.map(task => ({
      ...task,
      worker_name: task.worker
        ? `${task.worker.first_name} ${task.worker.last_name}`
        : undefined,
      farm_name: Array.isArray(task.farm) ? task.farm[0]?.name : task.farm?.name,
      parcel_name: Array.isArray(task.parcel) ? task.parcel[0]?.name : task.parcel?.name,
      organization_name: Array.isArray(task.organization) ? task.organization[0]?.name : task.organization?.name,
    }));
  }

  async findAll(userId: string, organizationId: string, filters?: TaskFiltersDto) {
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    const page = filters?.page ? parseInt(filters.page, 10) : 1;
    const pageSize = filters?.pageSize ? parseInt(filters.pageSize, 10) : 10;
    const sortBy = filters?.sortBy || 'scheduled_start';
    const sortDir = filters?.sortDir || 'desc';
    const hasPagination = filters?.page !== undefined || filters?.pageSize !== undefined;

    const applyFilters = (q: any) => {
      if (filters?.status) {
        const statuses = filters.status.split(',');
        q = q.in('status', statuses);
      }
      if (filters?.priority) {
        const priorities = filters.priority.split(',');
        q = q.in('priority', priorities);
      }
      if (filters?.task_type) {
        const types = filters.task_type.split(',');
        q = q.in('task_type', types);
      }
      if (filters?.assigned_to) {
        q = q.eq('assigned_to', filters.assigned_to);
      }
      if (filters?.farm_id) {
        q = q.eq('farm_id', filters.farm_id);
      }
      if (filters?.parcel_id) {
        q = q.eq('parcel_id', filters.parcel_id);
      }
      if (filters?.date_from) {
        q = q.gte('scheduled_start', filters.date_from);
      }
      if (filters?.date_to) {
        q = q.lte('scheduled_start', filters.date_to);
      }
      if (filters?.search) {
        q = q.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      return q;
    };

    let query = client
      .from('tasks')
      .select(`
        *,
        worker:workers!assigned_to(first_name, last_name),
        farm:farms!farm_id(name),
        parcel:parcels!parcel_id(name)
      `)
      .eq('organization_id', organizationId);

    query = applyFilters(query);
    query = query.order(sortBy, { ascending: sortDir === 'asc', nullsFirst: false });

    if (hasPagination) {
      let countQuery = client
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId);
      countQuery = applyFilters(countQuery);

      const { count } = await countQuery;

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data: tasks, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch tasks: ${error.message}`);
      }

      const mappedTasks = (tasks || []).map(task => ({
        ...task,
        worker_name: task.worker
          ? `${task.worker.first_name} ${task.worker.last_name}`
          : undefined,
        farm_name: Array.isArray(task.farm) ? task.farm[0]?.name : task.farm?.name,
        parcel_name: Array.isArray(task.parcel) ? task.parcel[0]?.name : task.parcel?.name,
      }));

      return {
        data: mappedTasks,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    }

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
    const client = this.databaseService.getAdminClient();

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
    const client = this.databaseService.getAdminClient();

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
    const client = this.databaseService.getAdminClient();

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
    const client = this.databaseService.getAdminClient();

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
    const client = this.databaseService.getAdminClient();

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
   * Creates journal entry if actual_cost is provided
   */
  async complete(userId: string, organizationId: string, taskId: string, completeTaskDto: CompleteTaskDto) {
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    // Verify task belongs to organization and get full details
    const { data: existingTask } = await client
      .from('tasks')
      .select('id, title, task_type, actual_cost')
      .eq('id', taskId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!existingTask) {
      throw new NotFoundException('Task not found');
    }

    const now = new Date().toISOString();

    const { data: task, error} = await client
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

    // Create journal entry if actual_cost is provided and > 0
    const actualCost = completeTaskDto.actual_cost ?? 0;
    if (actualCost > 0 && task.task_type) {
      try {
        this.logger.log(
          `Creating journal entry for task ${task.title} with cost ${actualCost} (type: ${task.task_type})`
        );

        await this.accountingAutomationService.createJournalEntryFromCost(
          organizationId,
          taskId,
          task.task_type, // Use task_type as cost_type for account mapping
          actualCost,
          new Date(now),
          completeTaskDto.notes || `Cost for completed task: ${task.title}`,
          userId,
        );

        this.logger.log(`Journal entry created successfully for task ${taskId}`);
      } catch (journalError) {
        // Log the error but don't fail the task completion
        // The task is already completed, journal entry is supplementary
        this.logger.error(
          `Failed to create journal entry for task ${taskId}: ${journalError.message}`,
          journalError.stack
        );
        this.logger.warn(
          `Task ${taskId} completed but journal entry creation failed. ` +
          `Please create manual journal entry for cost: ${actualCost}`
        );
      }
    } else if (actualCost > 0 && !task.task_type) {
      this.logger.warn(
        `Task ${taskId} has cost but no task_type specified. ` +
        `Cannot create journal entry without task_type for account mapping.`
      );
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
    const client = this.databaseService.getAdminClient();

    // Verify task belongs to organization and is a harvest task
    const { data: existingTask } = await client
      .from('tasks')
      .select('id, task_type, farm_id, parcel_id, assigned_to, notes')
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
    const isPartial = completeDto.is_partial === true;

    // Generate lot number if not provided
    let lotNumber = completeDto.lot_number;
    if (!lotNumber) {
      const year = new Date().getFullYear();
      const prefix = `LOT-${year}-`;

      // If this is a partial harvest, check if there's a previous partial harvest for this task
      if (isPartial) {
        const { data: previousHarvests } = await client
          .from('harvest_records')
          .select('lot_number')
          .eq('harvest_task_id', taskId)
          .eq('is_partial', true)
          .eq('organization_id', organizationId)
          .not('lot_number', 'is', null)
          .order('created_at', { ascending: false });

        if (previousHarvests && previousHarvests.length > 0) {
          // Extract the sequence number from the last partial harvest
          const lastLot = previousHarvests[0].lot_number;
          if (lastLot && lastLot.includes('-P')) {
            const match = lastLot.match(/-(\d+)-P$/);
            if (match) {
              const lastNumber = parseInt(match[1], 10);
              lotNumber = `${prefix}${String(lastNumber + 1).padStart(4, '0')}-P`;
            }
          }
        }
      }

      // If still no lot number, generate a new one
      if (!lotNumber) {
        // Count existing harvests for this organization in this year
        const { count } = await client
          .from('harvest_records')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .like('lot_number', `${prefix}%`);

        const lotNumberSeq = (count || 0) + 1;
        const suffix = isPartial ? '-P' : '';
        lotNumber = `${prefix}${String(lotNumberSeq).padStart(4, '0')}${suffix}`;
      }
    }

    // Update the task - for partial harvest, keep it in_progress
    const taskUpdateData = isPartial
      ? {
          // For partial completion, just update notes but keep in progress
          notes: completeDto.notes
            ? `${existingTask.notes || ''}\n[Récolte partielle ${now.split('T')[0]}]: ${completeDto.notes}`
            : existingTask.notes,
        }
      : {
          // For complete, mark as completed
          status: 'completed',
          completed_date: now.split('T')[0],
          actual_end: now,
          completion_percentage: 100,
          quality_rating: completeDto.quality_rating,
          actual_cost: completeDto.actual_cost,
          notes: completeDto.notes,
        };

    const { data: task, error: taskError } = await client
      .from('tasks')
      .update(taskUpdateData)
      .eq('id', taskId)
      .select(`
        *,
        worker:workers!assigned_to(first_name, last_name),
        farm:farms!farm_id(name),
        parcel:parcels!parcel_id(name)
      `)
      .single();

    if (taskError) {
      throw new Error(`Failed to update task: ${taskError.message}`);
    }

    // Get parcel crop_type if crop_id is not provided (virtual crop from parcel)
    let cropId = completeDto.crop_id;
    if (!cropId && existingTask.parcel_id) {
      // If crop_id is not provided but starts with "parcel-", it's a virtual crop
      // In this case, we set crop_id to null and rely on parcel_id
      if (cropId && cropId.startsWith('parcel-')) {
        cropId = null;
      }
    }

    // Create harvest record
    // Note: estimated_revenue is a generated column (quantity * expected_price_per_unit)
    // and will be calculated automatically by the database
    const { data: harvest, error: harvestError } = await client
      .from('harvest_records')
      .insert({
        organization_id: organizationId,
        farm_id: existingTask.farm_id,
        parcel_id: existingTask.parcel_id,
        crop_id: cropId || null, // Allow null if using parcel crop_type
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
        status: 'stored',
        notes: completeDto.harvest_notes,
        lot_number: lotNumber,
        is_partial: isPartial,
        created_by: userId,
      })
      .select()
      .single();

    if (harvestError) {
      throw new Error(`Failed to create harvest record: ${harvestError.message}`);
    }

    // Automatically create a reception batch for this harvest
    try {
      // Get default warehouse (reception center) for the organization
      const { data: warehouse } = await client
        .from('warehouses')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('is_reception_center', true)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (warehouse) {
        await this.receptionBatchesService.create(userId, organizationId, {
          warehouse_id: warehouse.id,
          harvest_id: harvest.id,
          parcel_id: harvest.parcel_id,
          crop_id: harvest.crop_id || undefined,
          reception_date: harvest.harvest_date,
          weight: Number(harvest.quantity),
          weight_unit: harvest.unit,
          quantity: Number(harvest.quantity),
          quantity_unit: harvest.unit,
          lot_code: lotNumber,
          notes: `Lot de réception généré automatiquement pour la récolte ${lotNumber}${isPartial ? ' (partielle)' : ''}`,
        });

        this.logger.log(`Reception batch created automatically for harvest ${harvest.id} with lot number ${lotNumber}`);
      } else {
        this.logger.warn(`No reception center warehouse found for organization ${organizationId}. Reception batch not created.`);
      }
    } catch (receptionError) {
      // Log error but don't fail the harvest creation
      this.logger.error(`Failed to create reception batch for harvest ${harvest.id}: ${receptionError.message}`, receptionError.stack);
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
    const client = this.databaseService.getAdminClient();

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

  // =====================================================
  // TASK CATEGORIES
  // =====================================================

  /**
   * Get all task categories for an organization
   */
  async getCategories(organizationId: string) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('task_categories')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch task categories: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create a new task category
   */
  async createCategory(userId: string, organizationId: string, categoryData: any) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('task_categories')
      .insert({
        ...categoryData,
        organization_id: organizationId,
        created_by: userId,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to create task category: ${error.message}`);
    }

    return data;
  }

  // =====================================================
  // TASK COMMENTS
  // =====================================================

  /**
   * Get all comments for a task
   */
  async getComments(taskId: string) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('task_comments')
      .select(`
        *,
        user:user_profiles!user_id(id, full_name, email),
        worker:workers!worker_id(first_name, last_name)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch task comments: ${error.message}`);
    }

    return (data || []).map(comment => ({
      ...comment,
      user_name: comment.user?.full_name || comment.user?.email,
      worker_name: comment.worker
        ? `${comment.worker.first_name} ${comment.worker.last_name}`
        : undefined,
    }));
  }

  /**
   * Add a comment to a task
   */
  async addComment(userId: string, taskId: string, commentData: any) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('task_comments')
      .insert({
        task_id: taskId,
        user_id: userId,
        comment: commentData.comment,
        worker_id: commentData.worker_id || null,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to add comment: ${error.message}`);
    }

    return data;
  }

  // =====================================================
  // TASK TIME LOGS
  // =====================================================

  /**
   * Get all time logs for a task
   */
  async getTimeLogs(taskId: string) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('task_time_logs')
      .select(`
        *,
        worker:workers!worker_id(first_name, last_name)
      `)
      .eq('task_id', taskId)
      .order('start_time', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch task time logs: ${error.message}`);
    }

    return (data || []).map(log => ({
      ...log,
      worker_name: log.worker
        ? `${log.worker.first_name} ${log.worker.last_name}`
        : undefined,
    }));
  }

  /**
   * Clock in to a task (start time tracking)
   */
  async clockIn(userId: string, organizationId: string, taskId: string, clockInData: any) {
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    // Create time log
    const { data: timeLog, error: timeLogError } = await client
      .from('task_time_logs')
      .insert({
        task_id: taskId,
        worker_id: clockInData.worker_id,
        start_time: new Date().toISOString(),
        location_lat: clockInData.location_lat || null,
        location_lng: clockInData.location_lng || null,
        notes: clockInData.notes || null,
      })
      .select()
      .single();

    if (timeLogError) {
      throw new BadRequestException(`Failed to clock in: ${timeLogError.message}`);
    }

    // Update task status to in_progress if not already
    const { data: task, error: taskError } = await client
      .from('tasks')
      .update({
        status: 'in_progress',
        actual_start: new Date().toISOString(),
      })
      .eq('id', taskId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (taskError) {
      throw new BadRequestException(`Failed to update task status: ${taskError.message}`);
    }

    return { timeLog, task };
  }

  /**
   * Clock out from a task (end time tracking)
   */
  async clockOut(userId: string, timeLogId: string, clockOutData: any) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('task_time_logs')
      .update({
        end_time: new Date().toISOString(),
        break_duration: clockOutData.break_duration || 0,
        notes: clockOutData.notes || null,
      })
      .eq('id', timeLogId)
      .select('*, task:tasks!task_id(id, organization_id)')
      .single();

    if (error) {
      throw new BadRequestException(`Failed to clock out: ${error.message}`);
    }

    return data;
  }
}
