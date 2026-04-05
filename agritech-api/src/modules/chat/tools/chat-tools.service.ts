import {
  BadRequestException,
  ForbiddenException,
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

class CreateTaskFromRecommendationParams {
  @IsUUID()
  parcel_id: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsIn(['high', 'medium', 'low'])
  priority: 'high' | 'medium' | 'low';

  @IsUUID()
  farm_id: string;

  @IsOptional()
  @IsDateString()
  due_date?: string;
}

class MarkInterventionDoneParams {
  @IsUUID()
  intervention_id: string;
}

@Injectable()
export class ChatToolsService {
  private readonly logger = new Logger(ChatToolsService.name);

  constructor(
    private readonly tasksService: TasksService,
    private readonly annualPlanService: AnnualPlanService,
    private readonly caslAbilityFactory: CaslAbilityFactory,
  ) {}

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        type: 'function',
        function: {
          name: 'create_task_from_recommendation',
          description:
            'Create a farm task when the user explicitly asks you to take action on a recommendation.',
          parameters: {
            type: 'object',
            properties: {
              parcel_id: {
                type: 'string',
                description: 'UUID of the parcel related to the recommended action.',
              },
              title: {
                type: 'string',
                description: 'Short task title visible to farm operations staff.',
              },
              description: {
                type: 'string',
                description: 'Operational details for the task to execute.',
              },
              priority: {
                type: 'string',
                description: 'Task priority level.',
                enum: ['high', 'medium', 'low'],
              },
              farm_id: {
                type: 'string',
                description: 'UUID of the farm where the task should be created.',
              },
              due_date: {
                type: 'string',
                description: 'Optional ISO date when the task should be due.',
              },
            },
            required: ['parcel_id', 'title', 'description', 'priority', 'farm_id'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'mark_intervention_done',
          description:
            'Mark an annual plan intervention as executed when the user explicitly asks to complete it.',
          parameters: {
            type: 'object',
            properties: {
              intervention_id: {
                type: 'string',
                description: 'UUID of the annual plan intervention to mark as executed.',
              },
            },
            required: ['intervention_id'],
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
        case 'create_task_from_recommendation':
          await this.assertPermission(userId, organizationId, Action.Create, Subject.TASK);
          return await this.createTaskFromRecommendation(
            parameters,
            userId,
            organizationId,
          );
        case 'mark_intervention_done':
          await this.assertPermission(userId, organizationId, Action.Update, Subject.TASK);
          return await this.markInterventionDone(parameters, organizationId);
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

  private async createTaskFromRecommendation(
    parameters: Record<string, any>,
    userId: string,
    organizationId: string,
  ): Promise<{ success: boolean; task_id?: string; error?: string }> {
    const payload = await this.validateParameters(
      CreateTaskFromRecommendationParams,
      parameters,
    );

    const createTaskDto: CreateTaskDto = {
      farm_id: payload.farm_id,
      parcel_id: payload.parcel_id,
      title: payload.title,
      description: payload.description,
      priority: payload.priority,
      due_date: payload.due_date,
      task_type: 'general',
    };

    const task = await this.tasksService.create(userId, organizationId, createTaskDto);

    return {
      success: true,
      task_id: task.id,
    };
  }

  private async markInterventionDone(
    parameters: Record<string, any>,
    organizationId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const payload = await this.validateParameters(MarkInterventionDoneParams, parameters);
    await this.annualPlanService.executeIntervention(payload.intervention_id, organizationId);

    return { success: true };
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
