import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

interface OnboardingActivityInput {
  title: string;
  description?: string;
  role?: string;
  user_id?: string;
  begin_on_days?: number;
  duration_days?: number;
}

interface CorrectiveAction {
  action: string;
  responsible?: string;
  deadline?: string;
  status?: 'pending' | 'in_progress' | 'completed';
}

@Injectable()
export class HrTasksBridgeService {
  private readonly logger = new Logger(HrTasksBridgeService.name);
  constructor(private readonly db: DatabaseService) {}

  /**
   * Create tasks for each activity in an onboarding record.
   * Idempotent: skips activities that already have a linked task
   * (matched on parent_task_id + title).
   */
  async syncOnboardingTasks(
    organizationId: string,
    recordId: string,
    userId: string | null,
  ): Promise<{ created: number }> {
    const supabase = this.db.getAdminClient();
    const { data: record, error } = await supabase
      .from('onboarding_records')
      .select('id, worker_id, started_at, activities, worker:workers(farm_id, first_name, last_name)')
      .eq('organization_id', organizationId)
      .eq('id', recordId)
      .single();
    if (error || !record) throw new BadRequestException(error?.message ?? 'Record not found');

    const activities = (record.activities as Array<OnboardingActivityInput & { task_id?: string }>) ?? [];
    if (!activities.length) return { created: 0 };

    const startedAt = new Date(record.started_at);
    const farmId = (record.worker as any)?.farm_id ?? null;
    const workerName = `${(record.worker as any)?.first_name ?? ''} ${(record.worker as any)?.last_name ?? ''}`.trim();

    const toInsert = activities
      .filter((a) => !a.task_id && a.title?.trim())
      .map((a) => {
        const due = new Date(startedAt);
        const offset = (a.begin_on_days ?? 0) + (a.duration_days ?? 1);
        due.setDate(startedAt.getDate() + offset);
        return {
          organization_id: organizationId,
          farm_id: farmId,
          title: `Onboarding: ${a.title}${workerName ? ` (${workerName})` : ''}`,
          description: a.description ?? null,
          task_type: 'general',
          status: 'pending',
          priority: 'medium',
          assigned_to: a.user_id ?? null,
          worker_id: record.worker_id,
          due_date: due.toISOString().slice(0, 10),
          created_by: userId,
        };
      });

    if (!toInsert.length) return { created: 0 };

    const { data: tasks, error: taskErr } = await supabase
      .from('tasks')
      .insert(toInsert)
      .select('id, title');
    if (taskErr) throw new BadRequestException(taskErr.message);

    // Back-link task_id on activity entries (best-effort matching by title)
    const updated = activities.map((a) => {
      if (a.task_id) return a;
      const match = (tasks ?? []).find((t) => t.title.includes(a.title));
      return match ? { ...a, task_id: match.id } : a;
    });
    await supabase
      .from('onboarding_records')
      .update({ activities: updated })
      .eq('id', recordId);

    this.logger.log(`Created ${tasks?.length ?? 0} onboarding tasks for record ${recordId}`);
    return { created: tasks?.length ?? 0 };
  }

  /**
   * Create tasks from corrective_actions on a safety incident.
   * Idempotent: skips actions that already have task_id.
   */
  async syncSafetyIncidentTasks(
    organizationId: string,
    incidentId: string,
    userId: string | null,
  ): Promise<{ created: number }> {
    const supabase = this.db.getAdminClient();
    const { data: incident, error } = await supabase
      .from('safety_incidents')
      .select('id, farm_id, description, severity, corrective_actions')
      .eq('organization_id', organizationId)
      .eq('id', incidentId)
      .single();
    if (error || !incident) throw new BadRequestException(error?.message ?? 'Incident not found');

    const actions = (incident.corrective_actions as Array<CorrectiveAction & { task_id?: string }>) ?? [];
    const todo = actions.filter((a) => !a.task_id && a.action?.trim());
    if (!todo.length) return { created: 0 };

    const priority = incident.severity === 'fatal' || incident.severity === 'serious' ? 'urgent' : 'high';

    const toInsert = todo.map((a) => ({
      organization_id: organizationId,
      farm_id: incident.farm_id,
      title: `Safety: ${a.action}`,
      description: `Corrective action for incident: ${incident.description}`,
      task_type: 'general',
      status: 'pending',
      priority,
      assigned_to: a.responsible ?? null,
      due_date: a.deadline ?? null,
      created_by: userId,
    }));

    const { data: tasks, error: taskErr } = await supabase
      .from('tasks')
      .insert(toInsert)
      .select('id, title');
    if (taskErr) throw new BadRequestException(taskErr.message);

    // Back-link task_id on action entries
    let taskIdx = 0;
    const updated = actions.map((a) => {
      if (a.task_id || !a.action?.trim()) return a;
      const t = (tasks ?? [])[taskIdx++];
      return t ? { ...a, task_id: t.id } : a;
    });
    await supabase
      .from('safety_incidents')
      .update({ corrective_actions: updated })
      .eq('id', incidentId);

    this.logger.log(`Created ${tasks?.length ?? 0} corrective tasks for incident ${incidentId}`);
    return { created: tasks?.length ?? 0 };
  }
}
