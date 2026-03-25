import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { TaskFiltersDto } from "./dto/task-filters.dto";
import { AssignTaskDto } from "./dto/assign-task.dto";
import { CompleteTaskDto } from "./dto/complete-task.dto";
import { CompleteHarvestTaskDto } from "./dto/complete-harvest-task.dto";
import { ConsumedItemDto } from "./dto/consumed-item.dto";
import { DatabaseService } from "../database/database.service";
import { AccountingAutomationService } from "../journal-entries/accounting-automation.service";
import { ReceptionBatchesService } from "../reception-batches/reception-batches.service";
import { AdoptionService, MilestoneType } from "../adoption/adoption.service";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/dto/notification.dto";
import { ProductApplicationsService } from "../product-applications/product-applications.service";
import { paginate, paginatedResponse, emptyPaginatedResponse, type PaginatedResponse } from "../../common/dto/paginated-query.dto";

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly accountingAutomationService: AccountingAutomationService,
    private readonly receptionBatchesService: ReceptionBatchesService,
    private readonly adoptionService: AdoptionService,
    private readonly notificationsService: NotificationsService,
    private readonly productApplicationsService: ProductApplicationsService,
  ) {}
  /**
   * Verify user has access to the organization
   */
  private async verifyOrganizationAccess(
    userId: string,
    organizationId: string,
  ) {
    const client = this.databaseService.getAdminClient();
    const { data: orgUser } = await client
      .from("organization_users")
      .select("organization_id")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (!orgUser) {
      throw new ForbiddenException(
        "You do not have access to this organization",
      );
    }
  }

  /**
   * Get all tasks assigned to the current user across all organizations
   * @param includeCompleted - If true, includes completed tasks in results
   */
  async findMyTasks(userId: string, includeCompleted: boolean = false, page?: number, pageSize?: number) {
    const client = this.databaseService.getAdminClient();

    // First, get all organizations the user belongs to
    const { data: orgUsers, error: orgError } = await client
      .from("organization_users")
      .select("organization_id")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (orgError) {
      throw new Error(
        `Failed to fetch user organizations: ${orgError.message}`,
      );
    }

    if (!orgUsers || orgUsers.length === 0) {
      return emptyPaginatedResponse(page ?? 1, pageSize ?? 50);
    }

    const organizationIds = orgUsers.map((ou) => ou.organization_id);

    // Build status filter based on includeCompleted parameter
    const statuses = includeCompleted
      ? ["pending", "assigned", "in_progress", "completed"]
      : ["pending", "assigned", "in_progress"];

    const { data: tasks, error } = await client
      .from("tasks")
      .select(
        `
        *,
        worker:workers!assigned_to(first_name, last_name, user_id),
        farm:farms!farm_id(name),
        parcel:parcels!parcel_id(name),
        organization:organizations!organization_id(name)
      `,
      )
      .in("organization_id", organizationIds)
      .in("status", statuses)
      .order("scheduled_start", { ascending: true, nullsFirst: false });

    if (error) {
      throw new Error(`Failed to fetch user tasks: ${error.message}`);
    }

    const userTasks = (tasks || []).filter((task) => {
      if (task.created_by === userId) return true;
      if (task.worker?.user_id === userId) return true;
      return false;
    });

    const mapTask = (task: any) => ({
      ...task,
      worker_name: task.worker
        ? `${task.worker.first_name} ${task.worker.last_name}`
        : undefined,
      farm_name: Array.isArray(task.farm)
        ? task.farm[0]?.name
        : task.farm?.name,
      parcel_name: Array.isArray(task.parcel)
        ? task.parcel[0]?.name
        : task.parcel?.name,
      organization_name: Array.isArray(task.organization)
        ? task.organization[0]?.name
        : task.organization?.name,
    });

    const effectivePage = page ?? 1;
    const effectivePageSize = pageSize ?? 50;
    const from = (effectivePage - 1) * effectivePageSize;
    const paginatedTasks = userTasks.slice(from, from + effectivePageSize);

    return paginatedResponse(paginatedTasks.map(mapTask), userTasks.length, effectivePage, effectivePageSize);
  }

  async findAll(
    userId: string,
    organizationId: string,
    filters?: TaskFiltersDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    const page = filters?.page ? parseInt(filters.page, 10) : 1;
    const pageSize = filters?.pageSize ? parseInt(filters.pageSize, 10) : 50;
    const sortBy = filters?.sortBy || "scheduled_start";
    const sortDir = filters?.sortDir || "desc";

    const applyFilters = (q: any) => {
      q = q.eq("organization_id", organizationId);
      if (filters?.status) q = q.in("status", filters.status.split(","));
      if (filters?.priority) q = q.in("priority", filters.priority.split(","));
      if (filters?.task_type) q = q.in("task_type", filters.task_type.split(","));
      if (filters?.assigned_to) q = q.eq("assigned_to", filters.assigned_to);
      if (filters?.farm_id) q = q.eq("farm_id", filters.farm_id);
      if (filters?.parcel_id) q = q.eq("parcel_id", filters.parcel_id);
      if (filters?.date_from) q = q.gte("scheduled_start", filters.date_from);
      if (filters?.date_to) q = q.lte("scheduled_start", filters.date_to);
      if (filters?.search) q = q.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      return q;
    };

    return paginate(client, "tasks", {
      select: `
        *,
        worker:workers!assigned_to(first_name, last_name),
        farm:farms!farm_id(name),
        parcel:parcels!parcel_id(name)
      `,
      filters: applyFilters,
      page,
      pageSize,
      orderBy: sortBy,
      ascending: sortDir === "asc",
      map: (task) => ({
        ...task,
        worker_name: task.worker
          ? `${task.worker.first_name} ${task.worker.last_name}`
          : undefined,
        farm_name: Array.isArray(task.farm)
          ? task.farm[0]?.name
          : task.farm?.name,
        parcel_name: Array.isArray(task.parcel)
          ? task.parcel[0]?.name
          : task.parcel?.name,
      }),
    });
  }

  /**
   * Get a single task by ID
   */
  async findOne(userId: string, organizationId: string, taskId: string) {
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    const { data: task, error } = await client
      .from("tasks")
      .select(
        `
        *,
        worker:workers!assigned_to(first_name, last_name),
        farm:farms!farm_id(name),
        parcel:parcels!parcel_id(name)
      `,
      )
      .eq("id", taskId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch task: ${error.message}`);
    }

    if (!task) {
      throw new NotFoundException("Task not found");
    }

    return {
      ...task,
      worker_name: task.worker
        ? `${task.worker.first_name} ${task.worker.last_name}`
        : undefined,
      farm_name: Array.isArray(task.farm)
        ? task.farm[0]?.name
        : task.farm?.name,
      parcel_name: Array.isArray(task.parcel)
        ? task.parcel[0]?.name
        : task.parcel?.name,
    };
  }

  /**
   * Create a new task or update existing if id is provided (upsert)
   */
  async create(
    userId: string,
    organizationId: string,
    createTaskDto: CreateTaskDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    const isUpdate = !!createTaskDto.id;

    // Build task data - for updates, don't override status/completion if not provided
    const taskData: Record<string, any> = {
      ...createTaskDto,
      organization_id: organizationId,
      weather_dependency: createTaskDto.weather_dependency ?? false,
    };

    // Only set default status and completion for new tasks
    if (!isUpdate) {
      taskData.status = "pending";
      taskData.completion_percentage = 0;
    }

    let task;
    let error;

    if (isUpdate) {
      // Use upsert for update - this allows creating if not exists or updating if exists
      const result = await client
        .from("tasks")
        .upsert(taskData, { onConflict: "id" })
        .select(
          `
          *,
          worker:workers!assigned_to(first_name, last_name),
          farm:farms!farm_id(name),
          parcel:parcels!parcel_id(name)
        `,
        )
        .single();
      task = result.data;
      error = result.error;
    } else {
      // Insert for new tasks
      const result = await client
        .from("tasks")
        .insert(taskData)
        .select(
          `
          *,
          worker:workers!assigned_to(first_name, last_name),
          farm:farms!farm_id(name),
          parcel:parcels!parcel_id(name)
        `,
        )
        .single();
      task = result.data;
      error = result.error;
    }

    if (error) {
      throw new Error(
        `Failed to ${isUpdate ? "update" : "create"} task: ${error.message}`,
      );
    }

    // Track first task created milestone (only for new tasks)
    if (!isUpdate) {
      await this.adoptionService.recordMilestone(
        userId,
        MilestoneType.FIRST_TASK_CREATED,
        organizationId,
        {
          task_id: task.id,
          task_title: task.title,
          task_type: task.task_type,
        },
      );
    }

    // Generate recurring tasks if recurrence_rule is set
    if (!isUpdate && createTaskDto.recurrence_rule && task) {
      try {
        await this.generateRecurringTasks(organizationId, task, createTaskDto);
      } catch (recurrenceError) {
        this.logger.error(
          `Failed to generate recurring tasks for task ${task.id}: ${recurrenceError.message}`,
        );
      }
    }

    return {
      ...task,
      worker_name: task.worker
        ? `${task.worker.first_name} ${task.worker.last_name}`
        : undefined,
      farm_name: Array.isArray(task.farm)
        ? task.farm[0]?.name
        : task.farm?.name,
      parcel_name: Array.isArray(task.parcel)
        ? task.parcel[0]?.name
        : task.parcel?.name,
    };
  }

  /**
   * Generate recurring task instances based on recurrence_rule
   * Creates future tasks up to recurrence_end_date or max 52 instances (1 year)
   */
  private async generateRecurringTasks(
    organizationId: string,
    parentTask: any,
    dto: CreateTaskDto,
  ) {
    const client = this.databaseService.getAdminClient();
    const rule = dto.recurrence_rule;
    const maxInstances = 52;

    const endDate = dto.recurrence_end_date
      ? new Date(dto.recurrence_end_date)
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now

    const baseDate = dto.scheduled_start
      ? new Date(dto.scheduled_start)
      : dto.due_date
        ? new Date(dto.due_date)
        : new Date();

    const recurringTasks: any[] = [];

    for (let i = 1; i <= maxInstances; i++) {
      const nextDate = new Date(baseDate);

      switch (rule) {
        case 'daily':
          nextDate.setDate(nextDate.getDate() + i);
          break;
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + i * 7);
          break;
        case 'biweekly':
          nextDate.setDate(nextDate.getDate() + i * 14);
          break;
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + i);
          break;
        case 'quarterly':
          nextDate.setMonth(nextDate.getMonth() + i * 3);
          break;
        case 'yearly':
          nextDate.setFullYear(nextDate.getFullYear() + i);
          break;
        default:
          return;
      }

      if (nextDate > endDate) break;

      const taskRecord: Record<string, any> = {
        organization_id: organizationId,
        farm_id: parentTask.farm_id,
        title: parentTask.title,
        description: parentTask.description,
        task_type: parentTask.task_type,
        priority: parentTask.priority,
        category_id: parentTask.category_id || null,
        parcel_id: parentTask.parcel_id || null,
        crop_id: parentTask.crop_id || null,
        assigned_to: parentTask.assigned_to || null,
        estimated_duration: parentTask.estimated_duration,
        required_skills: parentTask.required_skills,
        equipment_required: parentTask.equipment_required,
        weather_dependency: parentTask.weather_dependency ?? false,
        cost_estimate: parentTask.cost_estimate,
        notes: parentTask.notes,
        status: 'pending',
        completion_percentage: 0,
        parent_task_id: parentTask.id,
        recurrence_rule: rule,
      };

      if (dto.scheduled_start) {
        taskRecord.scheduled_start = nextDate.toISOString();
        if (dto.scheduled_end && dto.scheduled_start) {
          const duration = new Date(dto.scheduled_end).getTime() - new Date(dto.scheduled_start).getTime();
          taskRecord.scheduled_end = new Date(nextDate.getTime() + duration).toISOString();
        }
      }
      if (dto.due_date) {
        const dueDateOffset = dto.scheduled_start
          ? new Date(dto.due_date).getTime() - new Date(dto.scheduled_start).getTime()
          : 0;
        taskRecord.due_date = new Date(nextDate.getTime() + dueDateOffset).toISOString().split('T')[0];
      }

      recurringTasks.push(taskRecord);
    }

    if (recurringTasks.length > 0) {
      const { error } = await client.from('tasks').insert(recurringTasks);

      if (error) {
        throw new Error(`Failed to insert recurring tasks: ${error.message}`);
      }

      this.logger.log(
        `Generated ${recurringTasks.length} recurring task instances for parent task ${parentTask.id}`,
      );
    }
  }

  /**
   * Update a task
   */
  async update(
    userId: string,
    organizationId: string,
    taskId: string,
    updateTaskDto: UpdateTaskDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    // Verify task belongs to organization and get current status
    const { data: existingTask } = await client
      .from("tasks")
      .select(
        "id, status, assigned_to, scheduled_start, scheduled_end, title, task_type, farm_id, organization_id, due_date, parcel_id",
      )
      .eq("id", taskId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!existingTask) {
      throw new NotFoundException("Task not found");
    }

    // Check if status is being changed to 'completed'
    const statusChangedToCompleted =
      updateTaskDto.status === "completed" &&
      existingTask.status !== "completed";

    const { data: task, error } = await client
      .from("tasks")
      .update(updateTaskDto)
      .eq("id", taskId)
      .select(
        `
        *,
        worker:workers!assigned_to(first_name, last_name, worker_type, daily_rate, per_unit_rate, monthly_salary),
        farm:farms!farm_id(name),
        parcel:parcels!parcel_id(name)
      `,
      )
      .single();

    if (error) {
      throw new Error(`Failed to update task: ${error.message}`);
    }

    // Auto-create work record when task is completed with assigned worker
    if (statusChangedToCompleted && task.assigned_to && task.worker) {
      try {
        await this.createWorkRecordFromTask(task, existingTask);
      } catch (workRecordError) {
        // Log error but don't fail the task update
        this.logger.error(
          `Failed to create work record for task ${taskId}: ${workRecordError}`,
        );
      }
    }

    // Send notification when task status changes
    if (updateTaskDto.status && updateTaskDto.status !== existingTask.status) {
      try {
        // Notify the assigned worker (if they have a user account)
        if (existingTask.assigned_to) {
          const { data: assignedWorker } = await client
            .from("workers")
            .select("user_id, first_name, last_name")
            .eq("id", existingTask.assigned_to)
            .maybeSingle();

          if (assignedWorker?.user_id) {
            const statusLabels: Record<string, string> = {
              pending: "pending",
              in_progress: "in progress",
              completed: "completed",
              cancelled: "cancelled",
              on_hold: "on hold",
            };
            const statusLabel = statusLabels[updateTaskDto.status] || updateTaskDto.status;

            await this.notificationsService.createNotification({
              userId: assignedWorker.user_id,
              organizationId,
              type: NotificationType.TASK_STATUS_CHANGED,
              title: `Task "${existingTask.title || "Untitled"}" is now ${statusLabel}`,
              message: `The status of your task has been updated to ${statusLabel}`,
              data: {
                taskId,
                previousStatus: existingTask.status,
                newStatus: updateTaskDto.status,
              },
            });
          }
        }
      } catch (notifError) {
        // Don't fail the update if notification fails
        this.logger.warn(
          `Failed to send task status change notification: ${notifError.message}`,
        );
      }
    }

    return {
      ...task,
      worker_name: task.worker
        ? `${task.worker.first_name} ${task.worker.last_name}`
        : undefined,
      farm_name: Array.isArray(task.farm)
        ? task.farm[0]?.name
        : task.farm?.name,
      parcel_name: Array.isArray(task.parcel)
        ? task.parcel[0]?.name
        : task.parcel?.name,
    };
  }

  /**
   * Create a work record from a completed task
   */
  private async createWorkRecordFromTask(task: any, existingTask: any) {
    const client = this.databaseService.getAdminClient();
    const worker = task.worker;
    // Resolve farm_id: task may have it directly, or get from parcel/worker
    let farmId = task.farm_id;
    if (!farmId && task.parcel_id) {
      const { data: parcel } = await client
        .from("parcels")
        .select("farm_id")
        .eq("id", task.parcel_id)
        .maybeSingle();
      farmId = parcel?.farm_id || null;
    }
    if (!farmId && task.assigned_to) {
      const { data: workerData } = await client
        .from("workers")
        .select("farm_id")
        .eq("id", task.assigned_to)
        .maybeSingle();
      farmId = workerData?.farm_id || null;
    }
    if (!farmId) {
      this.logger.warn(`Cannot create work record for task ${task.id}: no farm_id found`);
      return;
    }
    // Calculate hours worked from task duration
    const hoursWorked =
      task.actual_start && task.actual_end
        ? (new Date(task.actual_end).getTime() -
            new Date(task.actual_start).getTime()) /
          (1000 * 60 * 60)
        : 0;
    // Calculate payment based on worker type
    let totalPayment = 0;
    if (
      worker.worker_type === "daily_worker" &&
      worker.daily_rate &&
      hoursWorked > 0
    ) {
      // Prorate daily rate by hours (assume 8h day)
      totalPayment = (worker.daily_rate / 8) * hoursWorked;
    } else if (worker.worker_type === "daily_worker" && worker.daily_rate) {
      totalPayment = worker.daily_rate;
    } else if (worker.worker_type === "fixed_salary" && worker.monthly_salary) {
      // Prorate monthly salary for a single day
      totalPayment = worker.monthly_salary / 26;
    }
    // Determine work date
    const workDate = task.due_date
      ? new Date(task.due_date)
      : task.actual_end
        ? new Date(task.actual_end)
        : new Date();
    const { error: workRecordError } = await client
      .from("work_records")
      .insert({
        farm_id: farmId,
        organization_id: task.organization_id,
        worker_id: task.assigned_to,
        worker_type: worker.worker_type,
        work_date: workDate.toISOString().split("T")[0],
        hours_worked: hoursWorked > 0 ? hoursWorked : null,
        task_description: task.title || "Task completed",
        hourly_rate: worker.daily_rate ? Math.round((worker.daily_rate / 8) * 100) / 100 : null,
        total_payment: totalPayment > 0 ? Math.round(totalPayment * 100) / 100 : null,
        payment_status: totalPayment > 0 ? "pending" : "not_applicable",
        notes: JSON.stringify({
          task_id: task.id,
          task_title: task.title,
          task_type: task.task_type,
          parcel_id: task.parcel_id,
          completed_at: new Date().toISOString(),
        }),
      });

    if (workRecordError) {
      throw new Error(
        `Failed to create work record: ${workRecordError.message}`,
      );
    }

    this.logger.log(
      `Work record created for completed task ${task.id}, worker ${task.assigned_to}`,
    );
  }

  /**
   * Delete a task
   */
  async remove(userId: string, organizationId: string, taskId: string) {
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    // Verify task belongs to organization
    const { data: existingTask } = await client
      .from("tasks")
      .select("id")
      .eq("id", taskId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!existingTask) {
      throw new NotFoundException("Task not found");
    }

    const { error } = await client.from("tasks").delete().eq("id", taskId);

    if (error) {
      throw new Error(`Failed to delete task: ${error.message}`);
    }

    return { message: "Task deleted successfully" };
  }

  /**
   * Bulk create tasks
   */
  async bulkCreate(userId: string, organizationId: string, tasks: CreateTaskDto[]) {
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    const taskRecords = tasks.map((dto) => ({
      ...dto,
      organization_id: organizationId,
      status: "pending",
      completion_percentage: 0,
      weather_dependency: dto.weather_dependency ?? false,
    }));

    const { data, error } = await client
      .from("tasks")
      .insert(taskRecords)
      .select(
        `
        *,
        worker:workers!assigned_to(first_name, last_name),
        farm:farms!farm_id(name),
        parcel:parcels!parcel_id(name)
      `,
      );

    if (error) {
      throw new Error(`Failed to bulk create tasks: ${error.message}`);
    }

    return (data || []).map((task) => ({
      ...task,
      worker_name: task.worker
        ? `${task.worker.first_name} ${task.worker.last_name}`
        : undefined,
      farm_name: Array.isArray(task.farm)
        ? task.farm[0]?.name
        : task.farm?.name,
      parcel_name: Array.isArray(task.parcel)
        ? task.parcel[0]?.name
        : task.parcel?.name,
    }));
  }

  /**
   * Bulk update status of multiple tasks
   */
  async bulkUpdateStatus(userId: string, organizationId: string, taskIds: string[], status: string) {
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from("tasks")
      .update({ status })
      .eq("organization_id", organizationId)
      .in("id", taskIds)
      .select("id, status");

    if (error) {
      throw new Error(`Failed to bulk update task status: ${error.message}`);
    }

    return { updated: data?.length || 0, tasks: data || [] };
  }

  /**
   * Bulk delete multiple tasks
   */
  async bulkDelete(userId: string, organizationId: string, taskIds: string[]) {
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from("tasks")
      .delete()
      .eq("organization_id", organizationId)
      .in("id", taskIds)
      .select("id");

    if (error) {
      throw new Error(`Failed to bulk delete tasks: ${error.message}`);
    }

    return { deleted: data?.length || 0 };
  }

  /**
   * Assign a task to a worker
   */
  async assign(
    userId: string,
    organizationId: string,
    taskId: string,
    assignTaskDto: AssignTaskDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    // Verify task belongs to organization
    const { data: existingTask } = await client
      .from("tasks")
      .select("id")
      .eq("id", taskId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!existingTask) {
      throw new NotFoundException("Task not found");
    }

    const { data: workerToAssign, error: workerError } = await client
      .from("workers")
      .select("id, user_id, first_name, last_name, is_active")
      .eq("id", assignTaskDto.worker_id)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (workerError) {
      throw new Error(`Failed to validate worker: ${workerError.message}`);
    }

    if (!workerToAssign) {
      throw new NotFoundException("Worker not found in this organization");
    }

    if (!workerToAssign.is_active) {
      throw new BadRequestException(
        "Cannot assign task to an inactive worker",
      );
    }

    const { data: task, error } = await client
      .from("tasks")
      .update({
        assigned_to: assignTaskDto.worker_id,
        status: "assigned",
      })
      .eq("id", taskId)
      .select(
        `
        *,
        worker:workers!assigned_to(first_name, last_name),
        farm:farms!farm_id(name),
        parcel:parcels!parcel_id(name)
      `,
      )
      .single();

    if (error) {
      throw new Error(`Failed to assign task: ${error.message}`);
    }

    // Send notification to assigned worker if they have a linked user account
    try {
      if (workerToAssign.user_id) {
        // Get assigner name
        const { data: assignerProfile } = await client
          .from("user_profiles")
          .select("first_name, last_name")
          .eq("id", userId)
          .single();

        const assignerName = assignerProfile
          ? `${assignerProfile.first_name || ""} ${assignerProfile.last_name || ""}`.trim() ||
            "Someone"
          : "Someone";

        await this.notificationsService.notifyTaskAssignment(
          workerToAssign.user_id,
          organizationId,
          task.title || "Untitled task",
          taskId,
          assignerName,
        );
        this.logger.log(
          `Task assignment notification sent to user ${workerToAssign.user_id}`,
        );
      }
    } catch (notifError) {
      // Don't fail the assignment if notification fails
      this.logger.warn(
        `Failed to send task assignment notification: ${notifError.message}`,
      );
    }

    return {
      ...task,
      worker_name: task.worker
        ? `${task.worker.first_name} ${task.worker.last_name}`
        : undefined,
      farm_name: Array.isArray(task.farm)
        ? task.farm[0]?.name
        : task.farm?.name,
      parcel_name: Array.isArray(task.parcel)
        ? task.parcel[0]?.name
        : task.parcel?.name,
    };
  }

  /**
   * Complete a task
   * Creates journal entry if actual_cost is provided
   * Creates work record if task is assigned to a worker
   */
  async complete(
    userId: string,
    organizationId: string,
    taskId: string,
    completeTaskDto: CompleteTaskDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    const { data: existingTask } = await client
      .from("tasks")
      .select(
        "id, title, task_type, actual_cost, assigned_to, scheduled_start, scheduled_end, farm_id, parcel_id, payment_type, units_required, rate_per_unit, work_unit_id, forfait_amount",
      )
      .eq("id", taskId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!existingTask) {
      throw new NotFoundException("Task not found");
    }

    const now = new Date().toISOString();

    const { data: task, error } = await client
      .from("tasks")
      .update({
        status: "completed",
        completed_date: now.split("T")[0],
        actual_end: now,
        completion_percentage: 100,
        quality_rating: completeTaskDto.quality_rating,
        actual_cost: completeTaskDto.actual_cost,
        notes: completeTaskDto.notes,
      })
      .eq("id", taskId)
      .select(
        `
        *,
        worker:workers!assigned_to(first_name, last_name),
        farm:farms!farm_id(name),
        parcel:parcels!parcel_id(name)
      `,
      )
      .single();

    if (error) {
      throw new Error(`Failed to complete task: ${error.message}`);
    }

    // Create work record if task is assigned to a worker
    // This connects the task system with the worker payment system
    if (existingTask.assigned_to) {
      try {
        // Resolve farm_id: task may have it directly, or we get it from the parcel
        let farmId = existingTask.farm_id;
        if (!farmId && existingTask.parcel_id) {
          const { data: parcel } = await client
            .from("parcels")
            .select("farm_id")
            .eq("id", existingTask.parcel_id)
            .maybeSingle();
          farmId = parcel?.farm_id || null;
        }
        // If still no farm_id, try to get it from the worker
        if (!farmId) {
          const { data: workerData } = await client
            .from("workers")
            .select("farm_id")
            .eq("id", existingTask.assigned_to)
            .maybeSingle();
          farmId = workerData?.farm_id || null;
        }

        if (!farmId) {
          this.logger.warn(
            `Cannot create work record for task ${taskId}: no farm_id found on task, parcel, or worker`,
          );
        } else {
          // Calculate hours worked from scheduled time or use default
          let hoursWorked = 8; // Default to 8 hours
          if (existingTask.scheduled_start && existingTask.scheduled_end) {
            const startTime = new Date(existingTask.scheduled_start);
            const endTime = new Date(existingTask.scheduled_end);
            const diffMs = endTime.getTime() - startTime.getTime();
            const calculatedHours = diffMs / (1000 * 60 * 60);
            if (calculatedHours > 0 && calculatedHours < 24) {
              hoursWorked = Math.round(calculatedHours * 100) / 100;
            }
          }
        // Fetch all active task assignments (additional workers beyond assigned_to)
          const { data: taskAssignments } = await client
            .from('task_assignments')
            .select('worker_id, payment_included_in_salary, bonus_amount, units_completed, hours_worked')
            .eq('task_id', taskId)
            .neq('status', 'removed');

          // Build list of all workers from task_assignments (includes primary worker)
          const allWorkers: Array<{
            worker_id: string;
            payment_included_in_salary: boolean;
            bonus_amount: number | null;
            units_completed_override: number | null;
            hours_worked_override: number | null;
          }> = [];

          const assignmentWorkerIds = new Set((taskAssignments || []).map((a: any) => a.worker_id));

          // Add all workers from task_assignments
          for (const assignment of taskAssignments || []) {
            allWorkers.push({
              worker_id: assignment.worker_id,
              payment_included_in_salary: assignment.payment_included_in_salary ?? false,
              bonus_amount: assignment.bonus_amount ?? null,
              units_completed_override: assignment.units_completed ?? null,
              hours_worked_override: assignment.hours_worked ?? null,
            });
          }

          // Fallback: if primary worker not in task_assignments, add them
          if (existingTask.assigned_to && !assignmentWorkerIds.has(existingTask.assigned_to)) {
            allWorkers.unshift({
              worker_id: existingTask.assigned_to,
              payment_included_in_salary: false,
              bonus_amount: null,
              units_completed_override: null,
              hours_worked_override: null,
            });
          }

          const isPerUnitTask = existingTask.payment_type === "per_unit";
          const isForfaitTask = existingTask.payment_type === "forfait";
          const ratePerUnit = completeTaskDto.rate_per_unit ?? existingTask.rate_per_unit;
          const workUnitId = completeTaskDto.work_unit_id ?? existingTask.work_unit_id;

          // Create work record for each worker
          for (const workerEntry of allWorkers) {
            // Determine units for this worker
            // 1. Check worker_completions from DTO
            const workerCompletion = (completeTaskDto as any).worker_completions?.find(
              (wc: any) => wc.worker_id === workerEntry.worker_id
            );
            // For multi-worker per-unit tasks, units MUST come from worker_completions (per-worker input)
            // Never divide dto.units_completed equally — each worker's contribution is tracked individually
            const workerUnits = workerCompletion?.units_completed
              ?? workerEntry.units_completed_override
              ?? (allWorkers.length > 1 ? null : completeTaskDto.units_completed)
              ?? (isPerUnitTask ? existingTask.units_required : null);
            const workerHours = workerCompletion?.hours_worked
              ?? workerEntry.hours_worked_override
              ?? hoursWorked;

            // For fixed salary workers with payment_included_in_salary = true, skip work record
            if (workerEntry.payment_included_in_salary) {
              this.logger.log(`Skipping work record for worker ${workerEntry.worker_id}: payment included in salary`);
              continue;
            }

            let totalPayment: number | null = null;
            if (workerEntry.bonus_amount) {
              totalPayment = workerEntry.bonus_amount;
            } else if (isForfaitTask && existingTask.forfait_amount) {
              // Split forfait equally among non-salary workers
              const billableWorkers = allWorkers.filter(w => !w.payment_included_in_salary).length;
              totalPayment = existingTask.forfait_amount / (billableWorkers || 1);
            } else if (isPerUnitTask && workerUnits && ratePerUnit) {
              totalPayment = workerUnits * ratePerUnit;
            }

            const { error: workRecordError } = await client
              .from("work_records")
              .insert({
                worker_id: workerEntry.worker_id,
                farm_id: farmId,
                organization_id: organizationId,
                worker_type: isForfaitTask ? "forfait" : isPerUnitTask ? "per_unit" : "daily",
                work_date: now.split("T")[0],
                hours_worked: workerHours,
                task_description: `Tâche: ${existingTask.title || "Sans titre"} (ID: ${taskId})`,
                payment_status: totalPayment ? "pending" : "not_applicable",
                total_payment: totalPayment,
                amount_paid: totalPayment,
                task_id: taskId,
                units_completed: workerUnits,
                rate_per_unit: isForfaitTask ? null : ratePerUnit,
                work_unit_id: workUnitId,
                payment_included_in_salary: workerEntry.payment_included_in_salary ?? false,
                notes: JSON.stringify({
                  task_id: taskId,
                  task_type: existingTask.task_type,
                  payment_type: existingTask.payment_type,
                  parcel_id: existingTask.parcel_id,
                  completed_at: now,
                }),
              });

            if (workRecordError) {
              this.logger.warn(`Failed to create work record for worker ${workerEntry.worker_id}: ${workRecordError.message}`);
            } else {
              this.logger.log(`Work record created for task ${taskId}, worker ${workerEntry.worker_id}`);
            }
          }
        } // end else (farmId exists)
      } catch (workRecordError) {
        // Don't fail the task completion if work record creation fails
        this.logger.error(
          `Failed to create work record for task ${taskId}: ${workRecordError.message}`,
          workRecordError.stack,
        );
      }
    }
    // Create journal entry if actual_cost is provided and > 0
    const actualCost = completeTaskDto.actual_cost ?? 0;
    if (actualCost > 0 && task.task_type) {
      try {
        this.logger.log(
          `Creating journal entry for task ${task.title} with cost ${actualCost} (type: ${task.task_type})`,
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

        this.logger.log(
          `Journal entry created successfully for task ${taskId}`,
        );
      } catch (journalError) {
        // Log the error but don't fail the task completion
        // The task is already completed, journal entry is supplementary
        this.logger.error(
          `Failed to create journal entry for task ${taskId}: ${journalError.message}`,
          journalError.stack,
        );
        this.logger.warn(
          `Task ${taskId} completed but journal entry creation failed. ` +
            `Please create manual journal entry for cost: ${actualCost}`,
        );
      }
    } else if (actualCost > 0 && !task.task_type) {
      this.logger.warn(
        `Task ${taskId} has cost but no task_type specified. ` +
          `Cannot create journal entry without task_type for account mapping.`,
      );
    }

    // Process consumed items - deduct from stock
    await this.processConsumedItems(
      userId,
      organizationId,
      taskId,
      task,
      completeTaskDto.consumed_items,
    );

    return {
      ...task,
      worker_name: task.worker
        ? `${task.worker.first_name} ${task.worker.last_name}`
        : undefined,
      farm_name: Array.isArray(task.farm)
        ? task.farm[0]?.name
        : task.farm?.name,
      parcel_name: Array.isArray(task.parcel)
        ? task.parcel[0]?.name
        : task.parcel?.name,
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
      .from("tasks")
      .select("id, task_type, farm_id, parcel_id, assigned_to, notes, payment_type, rate_per_unit, title")
      .eq("id", taskId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!existingTask) {
      throw new NotFoundException("Task not found");
    }

    if (existingTask.task_type !== "harvesting") {
      throw new BadRequestException(
        "Only harvest tasks can create harvest records",
      );
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
          .from("harvest_records")
          .select("lot_number")
          .eq("harvest_task_id", taskId)
          .eq("is_partial", true)
          .eq("organization_id", organizationId)
          .not("lot_number", "is", null)
          .order("created_at", { ascending: false });

        if (previousHarvests && previousHarvests.length > 0) {
          // Extract the sequence number from the last partial harvest
          const lastLot = previousHarvests[0].lot_number;
          if (lastLot && lastLot.includes("-P")) {
            const match = lastLot.match(/-(\d+)-P$/);
            if (match) {
              const lastNumber = parseInt(match[1], 10);
              lotNumber = `${prefix}${String(lastNumber + 1).padStart(4, "0")}-P`;
            }
          }
        }
      }

      // If still no lot number, generate a new one
      if (!lotNumber) {
        // Count existing harvests for this organization in this year
        const { count } = await client
          .from("harvest_records")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .like("lot_number", `${prefix}%`);

        const lotNumberSeq = (count || 0) + 1;
        const suffix = isPartial ? "-P" : "";
        lotNumber = `${prefix}${String(lotNumberSeq).padStart(4, "0")}${suffix}`;
      }
    }

    // Update the task - for partial harvest, keep it in_progress
    const taskUpdateData = isPartial
      ? {
          // For partial completion, just update notes but keep in progress
          notes: completeDto.notes
            ? `${existingTask.notes || ""}\n[Récolte partielle ${now.split("T")[0]}]: ${completeDto.notes}`
            : existingTask.notes,
        }
      : {
          // For complete, mark as completed
          status: "completed",
          completed_date: now.split("T")[0],
          actual_end: now,
          completion_percentage: 100,
          quality_rating: completeDto.quality_rating,
          actual_cost: completeDto.actual_cost,
          notes: completeDto.notes,
        };

    const { data: task, error: taskError } = await client
      .from("tasks")
      .update(taskUpdateData)
      .eq("id", taskId)
      .select(
        `
        *,
        worker:workers!assigned_to(first_name, last_name),
        farm:farms!farm_id(name),
        parcel:parcels!parcel_id(name)
      `,
      )
      .single();

    if (taskError) {
      throw new Error(`Failed to update task: ${taskError.message}`);
    }

    // Get parcel crop_type if crop_id is not provided (virtual crop from parcel)
    let cropId = completeDto.crop_id;
    if (!cropId && existingTask.parcel_id) {
      // If crop_id is not provided but starts with "parcel-", it's a virtual crop
      // In this case, we set crop_id to null and rely on parcel_id
      if (cropId && cropId.startsWith("parcel-")) {
        cropId = null;
      }
    }

    // Create harvest record
    // Note: estimated_revenue is a generated column (quantity * expected_price_per_unit)
    // and will be calculated automatically by the database
    const { data: harvest, error: harvestError } = await client
      .from("harvest_records")
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
        status: "stored",
        notes: completeDto.harvest_notes,
        lot_number: lotNumber,
        is_partial: isPartial,
        created_by: userId,
      })
      .select()
      .single();

    if (harvestError) {
      throw new Error(
        `Failed to create harvest record: ${harvestError.message}`,
      );
    }

    // Create work records for per-unit payment harvest tasks
    if (existingTask.payment_type === 'per_unit' && completeDto.workers && completeDto.workers.length > 0) {
      // Prefer rate from DTO (user entered in harvest form) over task rate
      const ratePerUnit = (completeDto as any).rate_per_unit ?? existingTask.rate_per_unit;
      // Get payment_included_in_salary from task_assignments
      const { data: taskAssignments } = await client
        .from('task_assignments')
        .select('worker_id, payment_included_in_salary')
        .eq('task_id', taskId);
      const assignmentMap = new Map((taskAssignments || []).map((a: any) => [a.worker_id, a]));

      for (const workerEntry of completeDto.workers) {
        const units = workerEntry.quantity_picked ?? 0;
        const paymentIncluded = (assignmentMap.get(workerEntry.worker_id) as any)?.payment_included_in_salary ?? false;
        if (paymentIncluded) continue; // salary worker, skip work record

        const totalPayment = (units > 0 && ratePerUnit) ? units * Number(ratePerUnit) : null;

        const { error: workRecordError } = await client
          .from('work_records')
          .insert({
            worker_id: workerEntry.worker_id,
            farm_id: existingTask.farm_id,
            organization_id: organizationId,
            worker_type: 'per_unit',
            work_date: completeDto.harvest_date,
            hours_worked: workerEntry.hours_worked ?? 0,
            task_description: `Récolte: ${existingTask.title || taskId}`,
            payment_status: totalPayment ? 'pending' : 'not_applicable',
            total_payment: totalPayment,
            amount_paid: totalPayment,
            task_id: taskId,
            units_completed: units,
            rate_per_unit: ratePerUnit,
            payment_included_in_salary: false,
            notes: JSON.stringify({ task_id: taskId, task_type: 'harvesting', is_partial: isPartial }),
          });
        if (workRecordError) {
          this.logger.error(`Failed to create work record for worker ${workerEntry.worker_id}: ${workRecordError.message}`);
        }
      }
    }

    // Automatically create a reception batch for this harvest
    try {
      // Get default warehouse (reception center) for the organization
      const { data: warehouse } = await client
        .from("warehouses")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("is_reception_center", true)
        .eq("is_active", true)
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
          notes: `Lot de réception généré automatiquement pour la récolte ${lotNumber}${isPartial ? " (partielle)" : ""}`,
        });

        this.logger.log(
          `Reception batch created automatically for harvest ${harvest.id} with lot number ${lotNumber}`,
        );
      } else {
        this.logger.warn(
          `No reception center warehouse found for organization ${organizationId}. Reception batch not created.`,
        );
      }
    } catch (receptionError) {
      // Log error but don't fail the harvest creation
      this.logger.error(
        `Failed to create reception batch for harvest ${harvest.id}: ${receptionError.message}`,
        receptionError.stack,
      );
    }

    return {
      task: {
        ...task,
        worker_name: task.worker
          ? `${task.worker.first_name} ${task.worker.last_name}`
          : undefined,
        farm_name: Array.isArray(task.farm)
          ? task.farm[0]?.name
          : task.farm?.name,
        parcel_name: Array.isArray(task.parcel)
          ? task.parcel[0]?.name
          : task.parcel?.name,
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

    const { data: tasks, error, count } = await client
      .from("tasks")
      .select("id, status, due_date, actual_cost", { count: "exact" })
      .eq("organization_id", organizationId);

    if (error) {
      throw new Error(`Failed to fetch task statistics: ${error.message}`);
    }

    const total_tasks = count || 0;
    const today = new Date().toISOString().split("T")[0];

    const statusCounts = {
      pending: 0,
      assigned: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
      on_hold: 0,
    };

    let overdue_tasks = 0;
    let total_cost = 0;

    for (const t of tasks || []) {
      if (t.status in statusCounts) {
        statusCounts[t.status]++;
      }
      // Overdue: due_date is in the past AND status is not completed or cancelled
      if (
        t.due_date &&
        t.due_date < today &&
        t.status !== "completed" &&
        t.status !== "cancelled"
      ) {
        overdue_tasks++;
      }
      total_cost += t.actual_cost || 0;
    }

    return {
      total_tasks,
      ...statusCounts,
      overdue_tasks,
      completion_rate:
        total_tasks > 0 ? (statusCounts.completed / total_tasks) * 100 : 0,
      total_cost,
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
      .from("task_categories")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("name");

    if (error) {
      throw new Error(`Failed to fetch task categories: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create a new task category
   */
  async createCategory(
    userId: string,
    organizationId: string,
    categoryData: any,
  ) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from("task_categories")
      .insert({
        ...categoryData,
        organization_id: organizationId,
        created_by: userId,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(
        `Failed to create task category: ${error.message}`,
      );
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

    // Fetch comments with worker join only (user_profiles has no direct FK from task_comments)
    const { data, error } = await client
      .from("task_comments")
      .select(
        `
        *,
        worker:workers!worker_id(first_name, last_name)
      `,
      )
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch task comments: ${error.message}`);
    }

    // Resolve user names from user_profiles in a batch
    const userIds = [...new Set((data || []).map((c) => c.user_id).filter(Boolean))];
    let userMap: Record<string, { full_name?: string; email?: string }> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await client
        .from("user_profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      if (profiles) {
        userMap = Object.fromEntries(profiles.map((p) => [p.id, p]));
      }
    }

    return (data || []).map((comment) => ({
      ...comment,
      user_name: userMap[comment.user_id]?.full_name || userMap[comment.user_id]?.email || undefined,
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
      .from("task_comments")
      .insert({
        task_id: taskId,
        user_id: userId,
        comment: commentData.comment,
        worker_id: commentData.worker_id || null,
        type: commentData.type || 'comment',
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to add comment: ${error.message}`);
    }

    // Parse @mentions and send notifications
    // Pattern: @[Display Name](user-uuid)
    const mentionRegex = /@\[([^\]]+)\]\(([a-f0-9-]{36})\)/g;
    let match: RegExpExecArray | null;
    const mentionedUserIds = new Set<string>();

    while ((match = mentionRegex.exec(commentData.comment)) !== null) {
      const mentionedUserId = match[2];
      if (mentionedUserId !== userId) {
        mentionedUserIds.add(mentionedUserId);
      }
    }

    // Get the task title and commenter name for the notification
    if (mentionedUserIds.size > 0) {
      const { data: task } = await client
        .from("tasks")
        .select("title, organization_id")
        .eq("id", taskId)
        .maybeSingle();

      const { data: commenter } = await client
        .from("user_profiles")
        .select("full_name, email")
        .eq("id", userId)
        .maybeSingle();

      const commenterName = commenter?.full_name || commenter?.email || "Someone";

      for (const mentionedId of mentionedUserIds) {
        try {
          await this.notificationsService.createNotification({
            userId: mentionedId,
            organizationId: task?.organization_id || "",
            type: NotificationType.TASK_MENTION || NotificationType.TASK_STATUS_CHANGED,
            title: `${commenterName} mentioned you in "${task?.title || "a task"}"`,
            message: commentData.comment.replace(/@\[([^\]]+)\]\([a-f0-9-]{36}\)/g, "@$1").substring(0, 200),
            data: {
              taskId,
              commentId: data.id,
              mentionedBy: userId,
            },
          });
        } catch (notifError) {
          this.logger.warn(`Failed to send mention notification to ${mentionedId}: ${notifError}`);
        }
      }
    }

    return data;
  }

  // =====================================================
  // TASK CHECKLIST
  // =====================================================

  /**
   * Get checklist for a task
   */
  async getChecklist(userId: string, organizationId: string, taskId: string) {
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from("tasks")
      .select("checklist")
      .eq("id", taskId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch checklist: ${error.message}`);
    if (!data) throw new NotFoundException("Task not found");

    return data.checklist || [];
  }

  /**
   * Update entire checklist for a task
   */
  async updateChecklist(userId: string, organizationId: string, taskId: string, checklist: any[]) {
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    // Calculate completion percentage from checklist
    const total = checklist.length;
    const completed = checklist.filter((item: any) => item.completed).length;
    const completion_percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    const { data, error } = await client
      .from("tasks")
      .update({ checklist, completion_percentage })
      .eq("id", taskId)
      .eq("organization_id", organizationId)
      .select("checklist, completion_percentage")
      .single();

    if (error) throw new Error(`Failed to update checklist: ${error.message}`);

    return data;
  }

  /**
   * Add a single checklist item
   */
  async addChecklistItem(userId: string, organizationId: string, taskId: string, title: string) {
    const currentChecklist = await this.getChecklist(userId, organizationId, taskId);

    const newItem = {
      id: crypto.randomUUID(),
      title,
      completed: false,
    };

    const updatedChecklist = [...currentChecklist, newItem];
    await this.updateChecklist(userId, organizationId, taskId, updatedChecklist);

    return newItem;
  }

  /**
   * Toggle a checklist item
   */
  async toggleChecklistItem(userId: string, organizationId: string, taskId: string, itemId: string) {
    const currentChecklist = await this.getChecklist(userId, organizationId, taskId);

    const updatedChecklist = currentChecklist.map((item: any) => {
      if (item.id === itemId) {
        return {
          ...item,
          completed: !item.completed,
          completed_at: !item.completed ? new Date().toISOString() : null,
          completed_by: !item.completed ? userId : null,
        };
      }
      return item;
    });

    return this.updateChecklist(userId, organizationId, taskId, updatedChecklist);
  }

  /**
   * Remove a checklist item
   */
  async removeChecklistItem(userId: string, organizationId: string, taskId: string, itemId: string) {
    const currentChecklist = await this.getChecklist(userId, organizationId, taskId);
    const updatedChecklist = currentChecklist.filter((item: any) => item.id !== itemId);
    return this.updateChecklist(userId, organizationId, taskId, updatedChecklist);
  }

  // =====================================================
  // TASK DEPENDENCIES
  // =====================================================

  /**
   * Get all dependencies for a task (both "depends on" and "required by")
   */
  async getDependencies(userId: string, organizationId: string, taskId: string) {
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    // Get tasks this task depends on
    const { data: dependsOn, error: error1 } = await client
      .from("task_dependencies")
      .select(`
        id,
        depends_on_task_id,
        dependency_type,
        lag_days,
        created_at,
        depends_on_task:tasks!depends_on_task_id(id, title, status, due_date, priority, assigned_to)
      `)
      .eq("task_id", taskId);

    if (error1) throw new Error(`Failed to fetch dependencies: ${error1.message}`);

    // Get tasks that depend on this task (blocked by this)
    const { data: requiredBy, error: error2 } = await client
      .from("task_dependencies")
      .select(`
        id,
        task_id,
        dependency_type,
        lag_days,
        created_at,
        dependent_task:tasks!task_id(id, title, status, due_date, priority, assigned_to)
      `)
      .eq("depends_on_task_id", taskId);

    if (error2) throw new Error(`Failed to fetch dependents: ${error2.message}`);

    return {
      depends_on: (dependsOn || []).map((d: any) => ({
        id: d.id,
        task_id: d.depends_on_task_id,
        title: d.depends_on_task?.title,
        status: d.depends_on_task?.status,
        due_date: d.depends_on_task?.due_date,
        priority: d.depends_on_task?.priority,
        dependency_type: d.dependency_type,
        lag_days: d.lag_days,
      })),
      required_by: (requiredBy || []).map((d: any) => ({
        id: d.id,
        task_id: d.task_id,
        title: d.dependent_task?.title,
        status: d.dependent_task?.status,
        due_date: d.dependent_task?.due_date,
        priority: d.dependent_task?.priority,
        dependency_type: d.dependency_type,
        lag_days: d.lag_days,
      })),
    };
  }

  /**
   * Add a dependency between tasks
   */
  async addDependency(
    userId: string,
    organizationId: string,
    taskId: string,
    dependsOnTaskId: string,
    dependencyType: string = 'finish_to_start',
    lagDays: number = 0,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    // Prevent self-dependency
    if (taskId === dependsOnTaskId) {
      throw new BadRequestException("A task cannot depend on itself");
    }

    // Check for circular dependency
    const hasCircular = await this.checkCircularDependency(client, dependsOnTaskId, taskId);
    if (hasCircular) {
      throw new BadRequestException("Adding this dependency would create a circular reference");
    }

    // Check if dependency already exists
    const { data: existing } = await client
      .from("task_dependencies")
      .select("id")
      .eq("task_id", taskId)
      .eq("depends_on_task_id", dependsOnTaskId)
      .maybeSingle();

    if (existing) {
      throw new BadRequestException("This dependency already exists");
    }

    const { data, error } = await client
      .from("task_dependencies")
      .insert({
        task_id: taskId,
        depends_on_task_id: dependsOnTaskId,
        dependency_type: dependencyType,
        lag_days: lagDays,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to add dependency: ${error.message}`);

    return data;
  }

  /**
   * Remove a dependency
   */
  async removeDependency(userId: string, organizationId: string, dependencyId: string) {
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    const { error } = await client
      .from("task_dependencies")
      .delete()
      .eq("id", dependencyId);

    if (error) throw new Error(`Failed to remove dependency: ${error.message}`);

    return { message: "Dependency removed successfully" };
  }

  /**
   * Check if a task is blocked (has unfinished dependencies)
   */
  async isTaskBlocked(userId: string, organizationId: string, taskId: string): Promise<{ blocked: boolean; blockers: any[] }> {
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    const { data: deps } = await client
      .from("task_dependencies")
      .select(`
        depends_on_task:tasks!depends_on_task_id(id, title, status)
      `)
      .eq("task_id", taskId)
      .eq("dependency_type", "finish_to_start");

    const blockers = (deps || [])
      .filter((d: any) => d.depends_on_task?.status !== "completed")
      .map((d: any) => ({
        id: d.depends_on_task?.id,
        title: d.depends_on_task?.title,
        status: d.depends_on_task?.status,
      }));

    return { blocked: blockers.length > 0, blockers };
  }

  /**
   * Check for circular dependencies using BFS
   */
  private async checkCircularDependency(client: any, fromTaskId: string, toTaskId: string): Promise<boolean> {
    const visited = new Set<string>();
    const queue = [fromTaskId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === toTaskId) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      const { data: deps } = await client
        .from("task_dependencies")
        .select("depends_on_task_id")
        .eq("task_id", current);

      for (const dep of deps || []) {
        queue.push(dep.depends_on_task_id);
      }
    }

    return false;
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
      .from("task_time_logs")
      .select(
        `
        *,
        worker:workers!worker_id(first_name, last_name)
      `,
      )
      .eq("task_id", taskId)
      .order("start_time", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch task time logs: ${error.message}`);
    }

    return (data || []).map((log) => ({
      ...log,
      worker_name: log.worker
        ? `${log.worker.first_name} ${log.worker.last_name}`
        : undefined,
    }));
  }

  /**
   * Clock in to a task (start time tracking)
   */
  async clockIn(
    userId: string,
    organizationId: string,
    taskId: string,
    clockInData: any,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    // Create time log
    const { data: timeLog, error: timeLogError } = await client
      .from("task_time_logs")
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
      throw new BadRequestException(
        `Failed to clock in: ${timeLogError.message}`,
      );
    }

    // Update task status to in_progress if not already
    const { data: task, error: taskError } = await client
      .from("tasks")
      .update({
        status: "in_progress",
        actual_start: new Date().toISOString(),
      })
      .eq("id", taskId)
      .eq("organization_id", organizationId)
      .select()
      .single();

    if (taskError) {
      throw new BadRequestException(
        `Failed to update task status: ${taskError.message}`,
      );
    }

    return { timeLog, task };
  }

  /**
   * Clock out from a task (end time tracking)
   */
  async clockOut(userId: string, timeLogId: string, clockOutData: any) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from("task_time_logs")
      .update({
        end_time: new Date().toISOString(),
        break_duration: clockOutData.break_duration || 0,
        notes: clockOutData.notes || null,
      })
      .eq("id", timeLogId)
      .select("*, task:tasks!task_id(id, organization_id)")
      .single();

    if (error) {
      throw new BadRequestException(`Failed to clock out: ${error.message}`);
    }

    return data;
  }

  /**
   * Get active time session for a worker (across all tasks)
   */
  async getActiveSession(workerId: string) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from("task_time_logs")
      .select(
        `
        *,
        task:tasks!task_id(id, title, farm_id, parcel_id)
      `,
      )
      .eq("worker_id", workerId)
      .is("end_time", null)
      .order("start_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch active session: ${error.message}`);
    }

    return data;
  }

  /**
   * Get active time session for current user (via worker profile)
   */
  async getMyActiveSession(userId: string) {
    const client = this.databaseService.getAdminClient();

    // First get the worker profile for this user
    const { data: worker, error: workerError } = await client
      .from("workers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (workerError || !worker) {
      // User doesn't have a worker profile
      return null;
    }

    return this.getActiveSession(worker.id);
  }

  /**
   * Auto-clock-out sessions that exceed max duration
   * Can be run periodically (e.g., every hour) to clean up stale sessions
   */
  async autoClockOutStaleSessions(maxHours: number = 12) {
    const client = this.databaseService.getAdminClient();
    const cutoffTime = new Date(
      Date.now() - maxHours * 60 * 60 * 1000,
    ).toISOString();

    // Find all sessions that started before cutoff and haven't ended
    const { data: staleSessions, error } = await client
      .from("task_time_logs")
      .select("id, worker_id, task_id, start_time")
      .is("end_time", null)
      .lt("start_time", cutoffTime);

    if (error) {
      this.logger.error(`Failed to find stale sessions: ${error.message}`);
      return { autoClockedOut: 0, error: error.message };
    }

    let autoClockedOut = 0;
    const now = new Date().toISOString();

    for (const session of staleSessions || []) {
      try {
        const { error: updateError } = await client
          .from("task_time_logs")
          .update({
            end_time: now,
            notes: "[Auto clock-out - session exceeded maximum duration]",
          })
          .eq("id", session.id);

        if (!updateError) {
          autoClockedOut++;
          this.logger.log(
            `Auto clocked out stale session ${session.id} for worker ${session.worker_id}`,
          );
        }
      } catch (e) {
        this.logger.error(
          `Failed to auto clock out session ${session.id}: ${e.message}`,
        );
      }
    }

    return { autoClockedOut, totalFound: staleSessions?.length || 0 };
  }

  /**
   * Validate if a location is within a parcel's boundaries
   * Uses PostGIS ST_Contains if available, otherwise does simple bounding box check
   */
  async validateLocationInParcel(
    organizationId: string,
    parcelId: string,
    location: { lat: number; lng: number },
  ): Promise<{ valid: boolean; distance?: number; message?: string }> {
    const client = this.databaseService.getAdminClient();

    // Get parcel boundary data
    const { data: parcel, error } = await client
      .from("parcels")
      .select("id, name, boundaries, center_lat, center_lng, radius_meters")
      .eq("id", parcelId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (error || !parcel) {
      return { valid: false, message: "Parcel not found" };
    }

    // If parcel has no boundary data, consider any location valid
    if (!parcel.boundaries && !parcel.center_lat) {
      return {
        valid: true,
        message: "No location restrictions for this parcel",
      };
    }

    // Simple distance-based validation if center_lat and radius_meters are available
    if (parcel.center_lat && parcel.radius_meters) {
      const distance = this.calculateDistance(
        location.lat,
        location.lng,
        parcel.center_lat,
        parcel.center_lng || 0,
      );

      return {
        valid: distance <= parcel.radius_meters,
        distance,
        message:
          distance <= parcel.radius_meters
            ? "Location is within parcel boundaries"
            : `Location is ${Math.round(distance - parcel.radius_meters)}m outside parcel boundaries`,
      };
    }

    // If we have GeoJSON boundaries, we could use PostGIS ST_Contains here
    // For now, return valid if we can't validate
    return {
      valid: true,
      message: "Location validation not available for this parcel",
    };
  }

  /**
   * Calculate distance between two coordinates in meters using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Clock in with location validation
   */
  async clockInWithValidation(
    userId: string,
    organizationId: string,
    taskId: string,
    clockInData: any,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    // Get task details to check parcel
    const { data: task } = await client
      .from("tasks")
      .select("id, parcel_id")
      .eq("id", taskId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!task) {
      throw new NotFoundException("Task not found");
    }

    // Validate location if provided and task has a parcel
    let locationValidation: { valid: boolean; message?: string } = {
      valid: true,
    };
    if (
      clockInData.location_lat &&
      clockInData.location_lng &&
      task.parcel_id
    ) {
      locationValidation = await this.validateLocationInParcel(
        organizationId,
        task.parcel_id,
        { lat: clockInData.location_lat, lng: clockInData.location_lng },
      );
    }

    // Create time log
    const { data: timeLog, error: timeLogError } = await client
      .from("task_time_logs")
      .insert({
        task_id: taskId,
        worker_id: clockInData.worker_id,
        start_time: new Date().toISOString(),
        location_lat: clockInData.location_lat || null,
        location_lng: clockInData.location_lng || null,
        location_valid: locationValidation.valid,
        notes: clockInData.notes || null,
      })
      .select()
      .single();

    if (timeLogError) {
      throw new BadRequestException(
        `Failed to clock in: ${timeLogError.message}`,
      );
    }

    // Update task status to in_progress if not already
    const { error: taskError } = await client
      .from("tasks")
      .update({
        status: "in_progress",
        actual_start: new Date().toISOString(),
      })
      .eq("id", taskId)
      .eq("organization_id", organizationId);

    if (taskError) {
      this.logger.warn(`Failed to update task status: ${taskError.message}`);
    }

    return {
      timeLog,
      locationValidation,
      warning:
        !locationValidation.valid && locationValidation.message
          ? locationValidation.message
          : undefined,
    };
  }

  private async processConsumedItems(
    userId: string,
    organizationId: string,
    taskId: string,
    task: any,
    consumedItems?: ConsumedItemDto[],
  ): Promise<void> {
    const client = this.databaseService.getAdminClient();

    let itemsToProcess = consumedItems;

    if (!itemsToProcess || itemsToProcess.length === 0) {
      const { data: taskData } = await client
        .from("tasks")
        .select("planned_items")
        .eq("id", taskId)
        .maybeSingle();

      if (taskData?.planned_items && Array.isArray(taskData.planned_items)) {
        itemsToProcess = taskData.planned_items;
      }
    }

    if (!itemsToProcess || itemsToProcess.length === 0) {
      return;
    }

    const applicableTaskTypes = [
      "fertilization",
      "pest_control",
      "irrigation",
      "planting",
      "soil_preparation",
    ];

    if (!applicableTaskTypes.includes(task.task_type)) {
      this.logger.log(
        `Task type ${task.task_type} does not consume stock items, skipping`,
      );
      return;
    }

    const completedDate = new Date().toISOString().split("T")[0];
    const productApplications: any[] = [];

    for (const item of itemsToProcess) {
      try {
        const result =
          await this.productApplicationsService.createProductApplication(
            userId,
            organizationId,
            {
              product_id: item.product_id,
              application_date: completedDate,
              quantity_used: item.quantity,
              area_treated: item.area_treated || task.parcel_area || 0,
              farm_id: task.farm_id,
              parcel_id: task.parcel_id || undefined,
              task_id: taskId,
              notes: `Auto-generated from task: ${task.title}`,
            },
          );

        productApplications.push(result.application);
        this.logger.log(
          `Stock deducted for task ${taskId}: ${item.quantity} of product ${item.product_id}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to deduct stock for product ${item.product_id} in task ${taskId}: ${error.message}`,
        );
      }
    }

    if (productApplications.length > 0) {
      this.logger.log(
        `Processed ${productApplications.length} product applications for task ${taskId}`,
      );
    }
  }
}
