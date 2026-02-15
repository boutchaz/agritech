import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreateCorrectiveActionDto,
  UpdateCorrectiveActionDto,
  CorrectiveActionStatsDto,
  CorrectiveActionFiltersDto,
  CorrectiveActionStatus,
  CorrectiveActionPriority,
} from './dto/corrective-action.dto';

@Injectable()
export class CorrectiveActionsService {
  private readonly logger = new Logger(CorrectiveActionsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(
    organizationId: string,
    filters?: CorrectiveActionFiltersDto,
  ) {
    const client = this.databaseService.getAdminClient();
    let query = client
      .from('corrective_actions')
      .select(`
        *,
        certification:certifications(id, certification_type, certification_number),
        compliance_check:compliance_checks(id, check_type, check_date, status)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters?.certification_id) {
      query = query.eq('certification_id', filters.certification_id);
    }
    if (filters?.overdue) {
      query = query.lt('due_date', new Date().toISOString().split('T')[0]);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to fetch corrective actions: ${error.message}`);
      throw error;
    }

    return data || [];
  }

  async findOne(organizationId: string, actionId: string) {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('corrective_actions')
      .select(`
        *,
        certification:certifications(id, certification_type, certification_number),
        compliance_check:compliance_checks(id, check_type, check_date, status),
        evidence:corrective_action_evidence(*)
      `)
      .eq('id', actionId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Corrective action not found');
    }

    return data;
  }

  async create(
    organizationId: string,
    userId: string,
    dto: CreateCorrectiveActionDto,
  ) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('corrective_actions')
      .insert({
        organization_id: organizationId,
        compliance_check_id: dto.compliance_check_id,
        certification_id: dto.certification_id,
        finding_description: dto.finding_description,
        requirement_code: dto.requirement_code,
        priority: dto.priority,
        action_description: dto.action_description,
        responsible_person: dto.responsible_person,
        due_date: dto.due_date,
        notes: dto.notes,
        status: CorrectiveActionStatus.OPEN,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create corrective action: ${error.message}`);
      throw error;
    }

    return data;
  }

  async update(
    organizationId: string,
    actionId: string,
    userId: string,
    dto: UpdateCorrectiveActionDto,
  ) {
    const client = this.databaseService.getAdminClient();

    // First verify it exists
    await this.findOne(organizationId, actionId);

    const updateData: any = {
      ...dto,
      updated_by: userId,
    };

    // If status is being set to resolved, set resolved_by
    if (dto.status === CorrectiveActionStatus.RESOLVED && !dto.resolved_at) {
      updateData.resolved_at = new Date().toISOString();
    }

    const { data, error } = await client
      .from('corrective_actions')
      .update(updateData)
      .eq('id', actionId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update corrective action: ${error.message}`);
      throw error;
    }

    return data;
  }

  async remove(organizationId: string, actionId: string): Promise<void> {
    const client = this.databaseService.getAdminClient();

    // First verify it exists
    await this.findOne(organizationId, actionId);

    const { error } = await client
      .from('corrective_actions')
      .delete()
      .eq('id', actionId)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to delete corrective action: ${error.message}`);
      throw error;
    }
  }

  async getStats(organizationId: string): Promise<CorrectiveActionStatsDto> {
    const client = this.databaseService.getAdminClient();

    const { data: actions, error } = await client
      .from('corrective_actions')
      .select('status, due_date, resolved_at')
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to fetch corrective action stats: ${error.message}`);
      throw error;
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const stats: CorrectiveActionStatsDto = {
      total: actions?.length || 0,
      open: 0,
      in_progress: 0,
      resolved: 0,
      verified: 0,
      overdue: 0,
      resolution_rate: 0,
      average_resolution_days: 0,
    };

    let totalResolutionDays = 0;
    let resolvedCount = 0;

    for (const action of actions || []) {
      switch (action.status) {
        case CorrectiveActionStatus.OPEN:
          stats.open++;
          break;
        case CorrectiveActionStatus.IN_PROGRESS:
          stats.in_progress++;
          break;
        case CorrectiveActionStatus.RESOLVED:
          stats.resolved++;
          break;
        case CorrectiveActionStatus.VERIFIED:
          stats.verified++;
          break;
      }

      // Check if overdue (open or in_progress past due date)
      if (
        (action.status === CorrectiveActionStatus.OPEN ||
          action.status === CorrectiveActionStatus.IN_PROGRESS) &&
        action.due_date < today
      ) {
        stats.overdue++;
      }

      // Calculate resolution time for resolved/verified actions
      if (
        (action.status === CorrectiveActionStatus.RESOLVED ||
          action.status === CorrectiveActionStatus.VERIFIED) &&
        action.resolved_at
      ) {
        const resolvedDate = new Date(action.resolved_at);
        const createdDate = new Date(action.due_date); // Use due_date as proxy for creation if needed
        const days = Math.floor(
          (resolvedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        totalResolutionDays += Math.abs(days);
        resolvedCount++;
      }
    }

    // Calculate resolution rate
    const closedCount = stats.resolved + stats.verified;
    stats.resolution_rate =
      stats.total > 0 ? Math.round((closedCount / stats.total) * 100) / 100 : 0;

    // Calculate average resolution days
    stats.average_resolution_days =
      resolvedCount > 0
        ? Math.round((totalResolutionDays / resolvedCount) * 10) / 10
        : 0;

    return stats;
  }
}
