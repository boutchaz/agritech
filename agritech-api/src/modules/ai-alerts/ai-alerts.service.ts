import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export const AI_ALERT_TYPES = [
  'ai_drought_stress',
  'ai_frost_risk',
  'ai_heat_stress',
  'ai_pest_risk',
  'ai_nutrient_deficiency',
  'ai_yield_warning',
  'ai_phenology_alert',
  'ai_salinity_alert',
] as const;

export const AI_ALERT_SEVERITIES = ['info', 'warning', 'critical'] as const;

export type AiAlertType = (typeof AI_ALERT_TYPES)[number];
export type AiAlertSeverity = (typeof AI_ALERT_SEVERITIES)[number];

export interface AiAlertRecord {
  id: string;
  parcel_id: string;
  organization_id: string;
  alert_type: AiAlertType;
  severity: AiAlertSeverity;
  title: string;
  description: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  is_ai_generated: boolean;
  alert_code: string | null;
  category: string | null;
  priority: string | null;
  entry_threshold: number | null;
  exit_threshold: number | null;
  trigger_data: unknown;
  satellite_reading_id: string | null;
  action_delay: number | null;
  created_at: string;
  updated_at: string | null;
}

export interface AiAlertsResponse {
  data: AiAlertRecord[];
}

export interface AiAlertResponse {
  data: AiAlertRecord;
}

export interface CreateAiAlertInput {
  parcel_id: string;
  organization_id: string;
  alert_type: AiAlertType;
  severity: AiAlertSeverity;
  title: string;
  description?: string | null;
  alert_code?: string | null;
  category?: string | null;
  priority?: string | null;
  entry_threshold?: number | null;
  exit_threshold?: number | null;
  trigger_data?: unknown;
  satellite_reading_id?: string | null;
  action_delay?: number | null;
}

@Injectable()
export class AiAlertsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getAlerts(parcelId: string, organizationId: string): Promise<AiAlertRecord[]> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('performance_alerts')
      .select('*')
      .eq('parcel_id', parcelId)
      .eq('organization_id', organizationId)
      .eq('is_ai_generated', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(`Failed to fetch AI alerts: ${error.message}`);
    }

    return (data ?? []) as AiAlertRecord[];
  }

  async getActiveAlerts(parcelId: string, organizationId: string): Promise<AiAlertRecord[]> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('performance_alerts')
      .select('*')
      .eq('parcel_id', parcelId)
      .eq('organization_id', organizationId)
      .eq('is_ai_generated', true)
      .is('resolved_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(`Failed to fetch active AI alerts: ${error.message}`);
    }

    return (data ?? []) as AiAlertRecord[];
  }

  async acknowledgeAlert(alertId: string, organizationId: string): Promise<AiAlertRecord> {
    await this.ensureAiAlertExists(alertId, organizationId);

    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('performance_alerts')
      .update({
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .eq('organization_id', organizationId)
      .eq('is_ai_generated', true)
      .select('*')
      .single();

    if (error) {
      throw new BadRequestException(`Failed to acknowledge AI alert: ${error.message}`);
    }

    return data as AiAlertRecord;
  }

  async resolveAlert(alertId: string, organizationId: string): Promise<AiAlertRecord> {
    await this.ensureAiAlertExists(alertId, organizationId);

    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('performance_alerts')
      .update({
        resolved_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .eq('organization_id', organizationId)
      .eq('is_ai_generated', true)
      .select('*')
      .single();

    if (error) {
      throw new BadRequestException(`Failed to resolve AI alert: ${error.message}`);
    }

    return data as AiAlertRecord;
  }

  async createAiAlert(data: CreateAiAlertInput): Promise<AiAlertRecord> {
    this.validateCreateInput(data);

    const supabase = this.databaseService.getAdminClient();
    const { data: createdAlert, error } = await supabase
      .from('performance_alerts')
      .insert({
        ...data,
        description: data.description ?? null,
        alert_code: data.alert_code ?? null,
        category: data.category ?? null,
        priority: data.priority ?? null,
        entry_threshold: data.entry_threshold ?? null,
        exit_threshold: data.exit_threshold ?? null,
        trigger_data: data.trigger_data ?? null,
        satellite_reading_id: data.satellite_reading_id ?? null,
        action_delay: data.action_delay ?? null,
        is_ai_generated: true,
      })
      .select('*')
      .single();

    if (error) {
      throw new BadRequestException(`Failed to create AI alert: ${error.message}`);
    }

    return createdAlert as AiAlertRecord;
  }

  private async ensureAiAlertExists(alertId: string, organizationId: string): Promise<void> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('performance_alerts')
      .select('id')
      .eq('id', alertId)
      .eq('organization_id', organizationId)
      .eq('is_ai_generated', true)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(`Failed to fetch AI alert: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('AI alert not found');
    }
  }

  private validateCreateInput(data: CreateAiAlertInput): void {
    if (!data.parcel_id?.trim()) {
      throw new BadRequestException('parcel_id is required');
    }

    if (!data.organization_id?.trim()) {
      throw new BadRequestException('organization_id is required');
    }

    if (!data.title?.trim()) {
      throw new BadRequestException('title is required');
    }

    if (!this.isValidAlertType(data.alert_type)) {
      throw new BadRequestException(
        `Invalid AI alert type: ${data.alert_type}. Valid AI alert types are: ${AI_ALERT_TYPES.join(', ')}`,
      );
    }

    if (!this.isValidSeverity(data.severity)) {
      throw new BadRequestException(
        `Invalid AI alert severity: ${data.severity}. Valid severities are: ${AI_ALERT_SEVERITIES.join(', ')}`,
      );
    }
  }

  private isValidAlertType(alertType: string): alertType is AiAlertType {
    return AI_ALERT_TYPES.includes(alertType as AiAlertType);
  }

  private isValidSeverity(severity: string): severity is AiAlertSeverity {
    return AI_ALERT_SEVERITIES.includes(severity as AiAlertSeverity);
  }
}
