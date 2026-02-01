import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface CreateTaskFromTemplateDto {
  templateId: string;
  farmId?: string;
  assignedTo?: string;
  scheduledDate?: Date;
}

export interface UpdateTaskStatusDto {
  taskId: string;
  status: string;
  notes?: string;
}

@Injectable()
export class TaskTemplatesService {
  private readonly logger = new Logger(TaskTemplatesService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Create a task from a template
   * Moved from SQL: create_task_from_template()
   */
  async createFromTemplate(
    userId: string,
    organizationId: string,
    dto: CreateTaskFromTemplateDto,
  ) {
    const client = this.databaseService.getAdminClient();

    // Get template with organization
    const { data: template, error: templateError } = await client
      .from('tasks')
      .select(`
        *,
        farm:farms!farm_id(id, organization_id)
      `)
      .eq('id', dto.templateId)
      .single();

    if (templateError || !template) {
      throw new NotFoundException('Task template not found');
    }

    // Verify template belongs to organization
    if (template.organization_id !== organizationId) {
      throw new BadRequestException('Task template does not belong to this organization');
    }

    // Create task from template
    const { data: newTask, error: taskError } = await client
      .from('tasks')
      .insert({
        title: template.title,
        description: template.description,
        task_type_id: template.task_type_id,
        priority: template.priority,
        farm_id: dto.farmId || template.farm_id,
        parcel_id: template.parcel_id,
        crop_id: template.crop_id,
        tree_id: template.tree_id,
        assigned_to: dto.assignedTo || template.assigned_to,
        status: 'pending',
        scheduled_date: dto.scheduledDate ? dto.scheduledDate.toISOString() : template.scheduled_date,
        due_date: template.due_date,
        organization_id: organizationId,
        estimated_duration: template.estimated_duration,
        equipment_required: template.equipment_required,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (taskError || !newTask) {
      throw new Error(`Failed to create task from template: ${taskError?.message}`);
    }

    // Copy task dependencies
    const { data: dependencies } = await client
      .from('task_dependencies')
      .select('depends_on_task_id')
      .eq('task_id', dto.templateId);

    if (dependencies && dependencies.length > 0) {
      const dependencyInserts = dependencies.map((dep: any) => ({
        task_id: newTask.id,
        depends_on_task_id: dep.depends_on_task_id,
      }));

      await client.from('task_dependencies').insert(dependencyInserts);
    }

    // Copy task equipment
    const { data: equipment } = await client
      .from('task_equipment')
      .select('equipment_id')
      .eq('task_id', dto.templateId);

    if (equipment && equipment.length > 0) {
      const equipmentInserts = equipment.map((eq: any) => ({
        task_id: newTask.id,
        equipment_id: eq.equipment_id,
      }));

      await client.from('task_equipment').insert(equipmentInserts);
    }

    this.logger.log(`Created task ${newTask.id} from template ${dto.templateId}`);

    return { taskId: newTask.id };
  }

  /**
   * Update task status with optional notes
   * Moved from SQL: update_task_status()
   */
  async updateStatus(
    userId: string,
    organizationId: string,
    dto: UpdateTaskStatusDto,
  ): Promise<{ success: boolean }> {
    const client = this.databaseService.getAdminClient();

    // Verify task exists and belongs to organization
    const { data: task } = await client
      .from('tasks')
      .select('id')
      .eq('id', dto.taskId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!task) {
      throw new NotFoundException('Task not found in this organization');
    }

    // Update task status
    const { error: updateError } = await client
      .from('tasks')
      .update({
        status: dto.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dto.taskId);

    if (updateError) {
      throw new Error(`Failed to update task status: ${updateError.message}`);
    }

    // Add note to comments if provided
    if (dto.notes) {
      await client.from('task_comments').insert({
        task_id: dto.taskId,
        comment: dto.notes,
        created_by_id: userId,
        created_at: new Date().toISOString(),
      });
    }

    this.logger.log(`Updated task ${dto.taskId} status to ${dto.status}`);

    return { success: true };
  }
}
