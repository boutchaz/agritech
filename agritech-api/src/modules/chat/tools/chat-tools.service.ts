import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  validate,
} from 'class-validator';
import { Action } from '../../casl/action.enum';
import { CaslAbilityFactory, Subject } from '../../casl/casl-ability.factory';
import { AnnualPlanService } from '../../annual-plan/annual-plan.service';
import { TasksService } from '../../tasks/tasks.service';
import { CreateTaskDto } from '../../tasks/dto/create-task.dto';
import { PendingActionService } from './pending-action.service';
import { DatabaseService } from '../../database/database.service';
import { HarvestsService } from '../../harvests/harvests.service';
import { ProductApplicationsService } from '../../product-applications/product-applications.service';
import { ParcelEventsService } from '../../parcel-events/parcel-events.service';
import { StockEntriesService } from '../../stock-entries/stock-entries.service';
import { TaskAssignmentsService } from '../../task-assignments/task-assignments.service';
import { StockEntryType } from '../../stock-entries/dto/create-stock-entry.dto';

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<
        string,
        { type: string; description: string; enum?: string[] }
      >;
      required: string[];
    };
  };
}

class CreateTaskParams {
  @IsIn(['preview', 'execute'])
  mode: 'preview' | 'execute';

  @IsString()
  parcel_id: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['high', 'medium', 'low', 'urgent'])
  priority?: string;

  @IsOptional()
  @IsIn(['planting', 'harvesting', 'irrigation', 'fertilization', 'maintenance', 'general', 'pest_control', 'pruning', 'soil_preparation'])
  task_type?: string;

  @IsString()
  farm_id: string;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsString()
  assigned_to?: string;
}

class MarkInterventionDoneParams {
  @IsIn(['preview', 'execute'])
  mode: 'preview' | 'execute';

  @IsString()
  intervention_id: string;
}

@Injectable()
export class ChatToolsService {
  private readonly logger = new Logger(ChatToolsService.name);

  constructor(
    private readonly tasksService: TasksService,
    private readonly annualPlanService: AnnualPlanService,
    private readonly caslAbilityFactory: CaslAbilityFactory,
    private readonly pendingActionService: PendingActionService,
    private readonly databaseService: DatabaseService,
    @Inject(HarvestsService) private readonly harvestsService: HarvestsService,
    @Inject(ProductApplicationsService) private readonly productApplicationsService: ProductApplicationsService,
    @Inject(ParcelEventsService) private readonly parcelEventsService: ParcelEventsService,
    @Inject(StockEntriesService) private readonly stockEntriesService: StockEntriesService,
    @Inject(TaskAssignmentsService) private readonly taskAssignmentsService: TaskAssignmentsService,
  ) {}

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        type: 'function',
        function: {
          name: 'create_task',
          description:
            'Create a farm task. Always use mode=preview first to show a preview card. The user will confirm or refine.',
          parameters: {
            type: 'object',
            properties: {
              mode: {
                type: 'string',
                description: 'preview=show preview card, execute=not allowed (use confirm_pending_action instead)',
                enum: ['preview', 'execute'],
              },
              parcel_id: {
                type: 'string',
                description: 'UUID of the parcel.',
              },
              title: {
                type: 'string',
                description: 'Short task title visible to farm operations staff.',
              },
              description: {
                type: 'string',
                description: 'Operational details for the task.',
              },
              priority: {
                type: 'string',
                description: 'Task priority level.',
                enum: ['high', 'medium', 'low', 'urgent'],
              },
              task_type: {
                type: 'string',
                description: 'Type of task.',
                enum: ['planting', 'harvesting', 'irrigation', 'fertilization', 'maintenance', 'general', 'pest_control', 'pruning', 'soil_preparation'],
              },
              farm_id: {
                type: 'string',
                description: 'UUID of the farm.',
              },
              due_date: {
                type: 'string',
                description: 'Optional ISO date when the task should be due.',
              },
              assigned_to: {
                type: 'string',
                description: 'Optional UUID of the worker to assign.',
              },
            },
            required: ['mode', 'parcel_id', 'title', 'farm_id'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'mark_intervention_done',
          description:
            'Mark an annual plan intervention as executed. Always use mode=preview first.',
          parameters: {
            type: 'object',
            properties: {
              mode: {
                type: 'string',
                description: 'preview=show preview card, execute=not allowed (use confirm_pending_action)',
                enum: ['preview', 'execute'],
              },
              intervention_id: {
                type: 'string',
                description: 'UUID of the annual plan intervention to mark as executed.',
              },
            },
            required: ['mode', 'intervention_id'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'record_harvest',
          description:
            'Record a harvest event. Always use mode=preview first.',
          parameters: {
            type: 'object',
            properties: {
              mode: {
                type: 'string',
                description: 'preview=show preview card, execute=not allowed',
                enum: ['preview', 'execute'],
              },
              parcel_id: {
                type: 'string',
                description: 'UUID of the parcel.',
              },
              quantity: {
                type: 'number',
                description: 'Quantity harvested.',
              },
              unit: {
                type: 'string',
                description: 'Unit of measurement.',
                enum: ['kg', 'tons', 'units', 'boxes', 'crates', 'liters'],
              },
              harvest_date: {
                type: 'string',
                description: 'ISO date of harvest. Defaults to today.',
              },
              quality_grade: {
                type: 'string',
                description: 'Quality grade.',
                enum: ['A', 'B', 'C', 'Extra', 'First', 'Second', 'Third'],
              },
              notes: {
                type: 'string',
                description: 'Additional notes.',
              },
            },
            required: ['mode', 'parcel_id', 'quantity', 'unit'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'record_product_application',
          description:
            'Record a product/treatment application on a parcel. Always use mode=preview first.',
          parameters: {
            type: 'object',
            properties: {
              mode: {
                type: 'string',
                description: 'preview=show preview card, execute=not allowed',
                enum: ['preview', 'execute'],
              },
              product_id: {
                type: 'string',
                description: 'UUID of the product/item from inventory.',
              },
              parcel_id: {
                type: 'string',
                description: 'UUID of the parcel.',
              },
              farm_id: {
                type: 'string',
                description: 'UUID of the farm.',
              },
              quantity_used: {
                type: 'number',
                description: 'Quantity of product used.',
              },
              area_treated: {
                type: 'number',
                description: 'Area treated in hectares.',
              },
              application_date: {
                type: 'string',
                description: 'ISO date. Defaults to today.',
              },
              notes: {
                type: 'string',
                description: 'Additional notes.',
              },
            },
            required: ['mode', 'product_id', 'parcel_id', 'farm_id', 'quantity_used', 'area_treated'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'log_parcel_event',
          description:
            'Log a parcel event (disease, frost, drought, soil analysis, etc.). Always use mode=preview first.',
          parameters: {
            type: 'object',
            properties: {
              mode: {
                type: 'string',
                description: 'preview=show preview card, execute=not allowed',
                enum: ['preview', 'execute'],
              },
              parcel_id: {
                type: 'string',
                description: 'UUID of the parcel.',
              },
              type: {
                type: 'string',
                description: 'Event type.',
                enum: ['new_water_source', 'soil_analysis', 'water_analysis', 'severe_pruning', 'removal', 'disease', 'frost', 'drought', 'other'],
              },
              description: {
                type: 'string',
                description: 'Event description.',
              },
              date_evenement: {
                type: 'string',
                description: 'ISO date. Defaults to today.',
              },
              recalibrage_requis: {
                type: 'boolean',
                description: 'Whether this should trigger a partial recalibration. Defaults to false.',
              },
            },
            required: ['mode', 'parcel_id', 'type'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'record_stock_entry',
          description:
            'Record a stock movement (receipt, issue, or transfer). Always use mode=preview first.',
          parameters: {
            type: 'object',
            properties: {
              mode: {
                type: 'string',
                description: 'preview=show preview card, execute=not allowed',
                enum: ['preview', 'execute'],
              },
              entry_type: {
                type: 'string',
                description: 'Type of stock entry.',
                enum: ['Material Receipt', 'Material Issue', 'Stock Transfer'],
              },
              items: {
                type: 'array',
                description: 'Items in this stock entry. Each has item_id, quantity, unit.',
              },
              to_warehouse_id: {
                type: 'string',
                description: 'Target warehouse UUID (for receipts and transfers).',
              },
              from_warehouse_id: {
                type: 'string',
                description: 'Source warehouse UUID (for issues and transfers).',
              },
              notes: {
                type: 'string',
                description: 'Additional notes.',
              },
            },
            required: ['mode', 'entry_type', 'items'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'assign_task_worker',
          description:
            'Assign a worker to an existing task. Always use mode=preview first.',
          parameters: {
            type: 'object',
            properties: {
              mode: {
                type: 'string',
                description: 'preview=show preview card, execute=not allowed',
                enum: ['preview', 'execute'],
              },
              task_id: {
                type: 'string',
                description: 'UUID of the task.',
              },
              worker_id: {
                type: 'string',
                description: 'UUID of the worker to assign.',
              },
              role: {
                type: 'string',
                description: 'Role in the task.',
                enum: ['worker', 'supervisor', 'lead'],
              },
            },
            required: ['mode', 'task_id', 'worker_id'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'complete_task',
          description:
            'Mark a task as completed. Always use mode=preview first.',
          parameters: {
            type: 'object',
            properties: {
              mode: {
                type: 'string',
                description: 'preview=show preview card, execute=not allowed',
                enum: ['preview', 'execute'],
              },
              task_id: {
                type: 'string',
                description: 'UUID of the task to complete.',
              },
              notes: {
                type: 'string',
                description: 'Completion notes.',
              },
              quality_rating: {
                type: 'number',
                description: 'Quality rating 1-5.',
              },
            },
            required: ['mode', 'task_id'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'confirm_pending_action',
          description:
            'Confirm and execute the pending action after the user reviews the preview. Call this when the user says confirme, oui, yes, go, نعم.',
          parameters: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'cancel_pending_action',
          description:
            'Cancel the pending action. Call this when the user says annule, non, cancel, لا.',
          parameters: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
      },
    ];
  }

  async executeTool(
    toolName: string,
    parameters: Record<string, any>,
    userId: string,
    organizationId: string,
  ): Promise<any> {
    this.logger.log(
      `Executing chat tool "${toolName}" for user ${userId} in org ${organizationId}`,
    );

    try {
      switch (toolName) {
        case 'create_task':
          await this.assertPermission(userId, organizationId, Action.Create, Subject.TASK);
          return await this.handleCreateTask(parameters, userId, organizationId);
        case 'mark_intervention_done':
          await this.assertPermission(userId, organizationId, Action.Update, Subject.TASK);
          return await this.handleMarkInterventionDone(parameters, userId, organizationId);
        case 'record_harvest':
          await this.assertPermission(userId, organizationId, Action.Create, Subject.TASK);
          return await this.handleRecordHarvest(parameters, userId, organizationId);
        case 'record_product_application':
          await this.assertPermission(userId, organizationId, Action.Create, Subject.TASK);
          return await this.handleRecordProductApplication(parameters, userId, organizationId);
        case 'log_parcel_event':
          await this.assertPermission(userId, organizationId, Action.Create, Subject.TASK);
          return await this.handleLogParcelEvent(parameters, userId, organizationId);
        case 'record_stock_entry':
          await this.assertPermission(userId, organizationId, Action.Create, Subject.TASK);
          return await this.handleRecordStockEntry(parameters, userId, organizationId);
        case 'assign_task_worker':
          await this.assertPermission(userId, organizationId, Action.Update, Subject.TASK);
          return await this.handleAssignTaskWorker(parameters, userId, organizationId);
        case 'complete_task':
          await this.assertPermission(userId, organizationId, Action.Update, Subject.TASK);
          return await this.handleCompleteTask(parameters, userId, organizationId);
        case 'confirm_pending_action':
          return await this.confirmPendingAction(userId, organizationId);
        case 'cancel_pending_action':
          return await this.cancelPendingAction(userId, organizationId);
        default:
          return {
            success: false,
            error: `Unsupported tool: ${toolName}`,
          };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown tool execution error';
      this.logger.error(
        `Chat tool "${toolName}" failed for user ${userId} in org ${organizationId}: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );

      return {
        success: false,
        error: message,
      };
    }
  }

  private async assertPermission(
    userId: string,
    organizationId: string,
    action: Action,
    subject: Subject,
  ): Promise<void> {
    const allowed = await this.caslAbilityFactory.hasPermission(
      { id: userId },
      organizationId,
      action,
      subject,
    );

    if (!allowed) {
      throw new ForbiddenException(
        `User is not allowed to ${action} ${subject} in this organization`,
      );
    }
  }

  private async handleCreateTask(
    parameters: Record<string, any>,
    userId: string,
    organizationId: string,
  ): Promise<{ success: boolean; preview_data?: any; error?: string }> {
    const payload = await this.validateParameters(CreateTaskParams, parameters);

    if (payload.mode === 'execute') {
      return { success: false, error: 'Direct execute is not allowed. Use confirm_pending_action after previewing.' };
    }

    // Resolve entity names for preview
    const client = this.databaseService.getAdminClient();

    const { data: parcel } = await client
      .from('parcels')
      .select('id, name, crop_type, farm_id')
      .eq('id', payload.parcel_id)
      .eq('organization_id', organizationId)
      .single();

    if (!parcel) {
      return { success: false, error: 'Parcel not found' };
    }

    const { data: farm } = await client
      .from('farms')
      .select('id, name')
      .eq('id', payload.farm_id)
      .eq('organization_id', organizationId)
      .single();

    let workerName: string | undefined;
    if (payload.assigned_to) {
      const { data: worker } = await client
        .from('workers')
        .select('id, first_name, last_name')
        .eq('id', payload.assigned_to)
        .eq('organization_id', organizationId)
        .single();
      if (worker) {
        workerName = `${worker.first_name} ${worker.last_name}`.trim();
      }
    }

    const taskParams = {
      farm_id: payload.farm_id,
      parcel_id: payload.parcel_id,
      title: payload.title,
      description: payload.description,
      priority: payload.priority || 'medium',
      task_type: payload.task_type || 'general',
      due_date: payload.due_date,
      assigned_to: payload.assigned_to,
    };

    const previewData = {
      action_type: 'create_task',
      title: payload.title,
      description: payload.description,
      parcel_name: parcel?.name || 'Unknown',
      farm_name: farm?.name || 'Unknown',
      priority: taskParams.priority,
      task_type: taskParams.task_type,
      due_date: payload.due_date || 'Not specified',
      worker_name: workerName || undefined,
    };

    await this.pendingActionService.upsert(
      userId,
      organizationId,
      'create_task',
      taskParams,
      previewData,
    );

    return { success: true, preview_data: previewData };
  }

  private async handleMarkInterventionDone(
    parameters: Record<string, any>,
    userId: string,
    organizationId: string,
  ): Promise<{ success: boolean; preview_data?: any; error?: string }> {
    const payload = await this.validateParameters(MarkInterventionDoneParams, parameters);

    if (payload.mode === 'execute') {
      return { success: false, error: 'Direct execute is not allowed. Use confirm_pending_action after previewing.' };
    }

    // Resolve intervention details for preview
    const client = this.databaseService.getAdminClient();
    const { data: intervention } = await client
      .from('plan_interventions')
      .select('id, titre, annual_plan:annual_plans(titre)')
      .eq('id', payload.intervention_id)
      .single();

    const interventionParams = { intervention_id: payload.intervention_id };

    const previewData = {
      action_type: 'mark_intervention_done',
      intervention_id: payload.intervention_id,
      intervention_title: intervention?.titre || 'Unknown intervention',
      plan_name: (intervention?.annual_plan as any)?.titre || 'Unknown plan',
    };

    await this.pendingActionService.upsert(
      userId,
      organizationId,
      'mark_intervention_done',
      interventionParams,
      previewData,
    );

    return { success: true, preview_data: previewData };
  }

  private async confirmPendingAction(
    userId: string,
    organizationId: string,
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    const pending = await this.pendingActionService.load(userId, organizationId);

    if (!pending) {
      return { success: false, error: 'No pending action to confirm. Please request an action first.' };
    }

    try {
      let result: any;

      switch (pending.tool_name) {
        case 'create_task': {
          const dto: CreateTaskDto = {
            farm_id: pending.parameters.farm_id,
            parcel_id: pending.parameters.parcel_id,
            title: pending.parameters.title,
            description: pending.parameters.description,
            priority: pending.parameters.priority,
            task_type: pending.parameters.task_type || 'general',
            due_date: pending.parameters.due_date,
            assigned_to: pending.parameters.assigned_to,
          };
          const task = await this.tasksService.create(userId, organizationId, dto);
          result = { task_id: task.id };
          break;
        }
        case 'mark_intervention_done': {
          await this.annualPlanService.executeIntervention(
            pending.parameters.intervention_id,
            organizationId,
          );
          result = { intervention_id: pending.parameters.intervention_id };
          break;
        }
        case 'record_harvest': {
          const harvest = await this.harvestsService.create(userId, organizationId, {
            farm_id: pending.parameters.farm_id,
            parcel_id: pending.parameters.parcel_id,
            quantity: pending.parameters.quantity,
            unit: pending.parameters.unit,
            harvest_date: pending.parameters.harvest_date,
            quality_grade: pending.parameters.quality_grade,
            notes: pending.parameters.notes,
          });
          result = { harvest_id: harvest.id };
          break;
        }
        case 'record_product_application': {
          const app = await this.productApplicationsService.createProductApplication(
            userId,
            organizationId,
            pending.parameters as any,
          );
          result = { application_id: (app as any).id };
          break;
        }
        case 'log_parcel_event': {
          const event = await this.parcelEventsService.createEvent(
            userId,
            pending.parameters.parcel_id,
            organizationId,
            {
              type: pending.parameters.type,
              date_evenement: pending.parameters.date_evenement,
              description: pending.parameters.description,
              recalibrage_requis: pending.parameters.recalibrage_requis,
            },
          );
          result = { event_id: event.id };
          break;
        }
        case 'record_stock_entry': {
          const stockEntry = await this.stockEntriesService.createStockEntry({
            organization_id: organizationId,
            entry_type: pending.parameters.entry_type as StockEntryType,
            entry_date: new Date(pending.parameters.entry_date),
            to_warehouse_id: pending.parameters.to_warehouse_id,
            from_warehouse_id: pending.parameters.from_warehouse_id,
            notes: pending.parameters.notes,
            items: pending.parameters.items,
            created_by: userId,
          });
          result = { stock_entry_id: stockEntry.id };
          break;
        }
        case 'assign_task_worker': {
          const assignment = await this.taskAssignmentsService.createAssignment(
            organizationId,
            pending.parameters.task_id,
            { worker_id: pending.parameters.worker_id, role: pending.parameters.role } as any,
            userId,
          );
          result = { assignment_id: assignment.id };
          break;
        }
        case 'complete_task': {
          await this.tasksService.complete(
            userId,
            organizationId,
            pending.parameters.task_id,
            {
              notes: pending.parameters.notes,
              quality_rating: pending.parameters.quality_rating,
            },
          );
          result = { task_id: pending.parameters.task_id };
          break;
        }
        default:
          return { success: false, error: `Unknown tool: ${pending.tool_name}` };
      }

      await this.pendingActionService.delete(userId, organizationId);

      return { success: true, result };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Execution failed';
      return { success: false, error: message };
    }
  }

  private async cancelPendingAction(
    userId: string,
    organizationId: string,
  ): Promise<{ success: boolean; message?: string }> {
    await this.pendingActionService.delete(userId, organizationId);
    return { success: true, message: 'Pending action cancelled.' };
  }

  // ─── record_harvest ───────────────────────────────────────────────
  private async handleRecordHarvest(
    parameters: Record<string, any>,
    userId: string,
    organizationId: string,
  ): Promise<{ success: boolean; preview_data?: any; error?: string }> {
    const mode = parameters.mode;
    if (mode === 'execute') {
      return { success: false, error: 'Direct execute is not allowed. Use confirm_pending_action.' };
    }

    const client = this.databaseService.getAdminClient();

    const { data: parcel } = await client
      .from('parcels')
      .select('id, name, crop_type, farm_id')
      .eq('id', parameters.parcel_id)
      .eq('organization_id', organizationId)
      .single();

    if (!parcel) {
      return { success: false, error: 'Parcel not found' };
    }

    const farmId = parameters.farm_id || parcel.farm_id;
    const harvestDate = parameters.harvest_date || new Date().toISOString().split('T')[0];

    const harvestParams = {
      parcel_id: parameters.parcel_id,
      farm_id: farmId,
      quantity: parameters.quantity,
      unit: parameters.unit,
      harvest_date: harvestDate,
      quality_grade: parameters.quality_grade,
      notes: parameters.notes,
    };

    const previewData = {
      action_type: 'record_harvest',
      parcel_name: parcel.name,
      crop_type: parcel.crop_type || 'Unknown',
      quantity: parameters.quantity,
      unit: parameters.unit,
      harvest_date: harvestDate,
      quality_grade: parameters.quality_grade || 'Not specified',
    };

    await this.pendingActionService.upsert(userId, organizationId, 'record_harvest', harvestParams, previewData);

    return { success: true, preview_data: previewData };
  }

  // ─── record_product_application ────────────────────────────────────
  private async handleRecordProductApplication(
    parameters: Record<string, any>,
    userId: string,
    organizationId: string,
  ): Promise<{ success: boolean; preview_data?: any; error?: string }> {
    if (parameters.mode === 'execute') {
      return { success: false, error: 'Direct execute is not allowed. Use confirm_pending_action.' };
    }

    const client = this.databaseService.getAdminClient();

    const { data: product } = await client
      .from('items')
      .select('id, item_name')
      .eq('id', parameters.product_id)
      .eq('organization_id', organizationId)
      .single();

    if (!product) {
      return { success: false, error: 'Product not found' };
    }

    const { data: parcel } = await client
      .from('parcels')
      .select('id, name')
      .eq('id', parameters.parcel_id)
      .eq('organization_id', organizationId)
      .single();

    if (!parcel) {
      return { success: false, error: 'Parcel not found' };
    }

    const applicationDate = parameters.application_date || new Date().toISOString().split('T')[0];

    const appParams = {
      product_id: parameters.product_id,
      parcel_id: parameters.parcel_id,
      farm_id: parameters.farm_id,
      quantity_used: parameters.quantity_used,
      area_treated: parameters.area_treated,
      application_date: applicationDate,
      notes: parameters.notes,
    };

    const previewData = {
      action_type: 'record_product_application',
      product_name: product.item_name,
      parcel_name: parcel.name,
      quantity_used: parameters.quantity_used,
      area_treated: parameters.area_treated,
      application_date: applicationDate,
    };

    await this.pendingActionService.upsert(userId, organizationId, 'record_product_application', appParams, previewData);

    return { success: true, preview_data: previewData };
  }

  // ─── log_parcel_event ──────────────────────────────────────────────
  private async handleLogParcelEvent(
    parameters: Record<string, any>,
    userId: string,
    organizationId: string,
  ): Promise<{ success: boolean; preview_data?: any; error?: string }> {
    if (parameters.mode === 'execute') {
      return { success: false, error: 'Direct execute is not allowed. Use confirm_pending_action.' };
    }

    const client = this.databaseService.getAdminClient();

    const { data: parcel } = await client
      .from('parcels')
      .select('id, name')
      .eq('id', parameters.parcel_id)
      .eq('organization_id', organizationId)
      .single();

    if (!parcel) {
      return { success: false, error: 'Parcel not found' };
    }

    const dateEvenement = parameters.date_evenement || new Date().toISOString().split('T')[0];
    const recalibrageRequis = parameters.recalibrage_requis ?? false;

    const eventParams = {
      parcel_id: parameters.parcel_id,
      type: parameters.type,
      description: parameters.description,
      date_evenement: dateEvenement,
      recalibrage_requis: recalibrageRequis,
    };

    const previewData = {
      action_type: 'log_parcel_event',
      parcel_name: parcel.name,
      event_type: parameters.type,
      description: parameters.description || 'No description',
      date_evenement: dateEvenement,
      recalibrage_warning: recalibrageRequis,
    };

    await this.pendingActionService.upsert(userId, organizationId, 'log_parcel_event', eventParams, previewData);

    return { success: true, preview_data: previewData };
  }

  // ─── record_stock_entry ────────────────────────────────────────────
  private async handleRecordStockEntry(
    parameters: Record<string, any>,
    userId: string,
    organizationId: string,
  ): Promise<{ success: boolean; preview_data?: any; error?: string }> {
    if (parameters.mode === 'execute') {
      return { success: false, error: 'Direct execute is not allowed. Use confirm_pending_action.' };
    }

    const client = this.databaseService.getAdminClient();
    const items = parameters.items || [];

    // Resolve item names
    const resolvedItems: Array<{ item_id: string; item_name: string; quantity: number; unit: string }> = [];
    for (const item of items) {
      const { data: dbItem } = await client
        .from('items')
        .select('id, item_name')
        .eq('id', item.item_id)
        .eq('organization_id', organizationId)
        .single();

      if (!dbItem) {
        return { success: false, error: `Item not found: ${item.item_id}` };
      }

      resolvedItems.push({
        item_id: item.item_id,
        item_name: dbItem.item_name,
        quantity: item.quantity,
        unit: item.unit,
      });
    }

    // Resolve warehouse names
    let toWarehouseName: string | undefined;
    let fromWarehouseName: string | undefined;

    if (parameters.to_warehouse_id) {
      const { data: wh } = await client
        .from('warehouses')
        .select('id, name')
        .eq('id', parameters.to_warehouse_id)
        .eq('organization_id', organizationId)
        .single();
      toWarehouseName = wh?.name;
    }

    if (parameters.from_warehouse_id) {
      const { data: wh } = await client
        .from('warehouses')
        .select('id, name')
        .eq('id', parameters.from_warehouse_id)
        .eq('organization_id', organizationId)
        .single();
      fromWarehouseName = wh?.name;
    }

    const entryDate = new Date().toISOString().split('T')[0];

    const stockParams = {
      entry_type: parameters.entry_type,
      items: items,
      to_warehouse_id: parameters.to_warehouse_id,
      from_warehouse_id: parameters.from_warehouse_id,
      entry_date: entryDate,
      notes: parameters.notes,
    };

    const previewData = {
      action_type: 'record_stock_entry',
      entry_type: parameters.entry_type,
      items: resolvedItems,
      to_warehouse_name: toWarehouseName,
      from_warehouse_name: fromWarehouseName,
      entry_date: entryDate,
    };

    await this.pendingActionService.upsert(userId, organizationId, 'record_stock_entry', stockParams, previewData);

    return { success: true, preview_data: previewData };
  }

  // ─── assign_task_worker ────────────────────────────────────────────
  private async handleAssignTaskWorker(
    parameters: Record<string, any>,
    userId: string,
    organizationId: string,
  ): Promise<{ success: boolean; preview_data?: any; error?: string }> {
    if (parameters.mode === 'execute') {
      return { success: false, error: 'Direct execute is not allowed. Use confirm_pending_action.' };
    }

    const client = this.databaseService.getAdminClient();

    const { data: task } = await client
      .from('tasks')
      .select('id, title, status')
      .eq('id', parameters.task_id)
      .eq('organization_id', organizationId)
      .single();

    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    const { data: worker } = await client
      .from('workers')
      .select('id, first_name, last_name')
      .eq('id', parameters.worker_id)
      .eq('organization_id', organizationId)
      .single();

    if (!worker) {
      return { success: false, error: 'Worker not found' };
    }

    const assignParams = {
      task_id: parameters.task_id,
      worker_id: parameters.worker_id,
      role: parameters.role || 'worker',
    };

    const previewData = {
      action_type: 'assign_task_worker',
      task_title: task.title,
      task_status: task.status,
      worker_name: `${worker.first_name} ${worker.last_name}`.trim(),
      role: assignParams.role,
    };

    await this.pendingActionService.upsert(userId, organizationId, 'assign_task_worker', assignParams, previewData);

    return { success: true, preview_data: previewData };
  }

  // ─── complete_task ─────────────────────────────────────────────────
  private async handleCompleteTask(
    parameters: Record<string, any>,
    userId: string,
    organizationId: string,
  ): Promise<{ success: boolean; preview_data?: any; error?: string }> {
    if (parameters.mode === 'execute') {
      return { success: false, error: 'Direct execute is not allowed. Use confirm_pending_action.' };
    }

    const client = this.databaseService.getAdminClient();

    const { data: task } = await client
      .from('tasks')
      .select('id, title, status')
      .eq('id', parameters.task_id)
      .eq('organization_id', organizationId)
      .single();

    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    if (task.status === 'completed') {
      return { success: false, error: 'Task is already completed' };
    }

    const completableStatuses = ['pending', 'assigned', 'in_progress'];
    if (!completableStatuses.includes(task.status)) {
      return { success: false, error: `Task cannot be completed from status: ${task.status}` };
    }

    const completeParams = {
      task_id: parameters.task_id,
      notes: parameters.notes,
      quality_rating: parameters.quality_rating,
    };

    const previewData = {
      action_type: 'complete_task',
      task_title: task.title,
      current_status: task.status,
      new_status: 'completed',
      notes: parameters.notes || 'No notes',
      quality_rating: parameters.quality_rating,
    };

    await this.pendingActionService.upsert(userId, organizationId, 'complete_task', completeParams, previewData);

    return { success: true, preview_data: previewData };
  }

  private async validateParameters<T extends object>(
    cls: new () => T,
    parameters: Record<string, any>,
  ): Promise<T> {
    if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) {
      throw new BadRequestException('Tool parameters must be a JSON object');
    }

    const instance = plainToInstance(cls, parameters);
    const errors = await validate(instance, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const messages = errors
        .flatMap((error) => Object.values(error.constraints ?? {}))
        .join(', ');
      throw new Error(messages || 'Invalid tool parameters');
    }

    return instance;
  }
}
