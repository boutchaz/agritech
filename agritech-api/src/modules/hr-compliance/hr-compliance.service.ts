import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UpdateComplianceSettingsDto } from './dto';
import {
  COMPLIANCE_PRESETS,
  CompliancePreset,
  getPreset,
  listPresets,
} from './compliance-presets';

@Injectable()
export class HrComplianceService {
  constructor(private readonly databaseService: DatabaseService) {}

  /** Returns settings for org. Auto-creates a default row if missing. */
  async get(organizationId: string) {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('hr_compliance_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (data) return data;

    const { data: created, error: createErr } = await supabase
      .from('hr_compliance_settings')
      .insert({ organization_id: organizationId })
      .select('*')
      .single();
    if (createErr) throw new BadRequestException(createErr.message);
    return created;
  }

  async update(
    organizationId: string,
    userId: string | null,
    dto: UpdateComplianceSettingsDto,
  ) {
    await this.get(organizationId); // ensure row exists

    const supabase = this.databaseService.getAdminClient();
    const payload: Record<string, unknown> = {
      ...dto,
      last_updated_by: userId,
      updated_at: new Date().toISOString(),
    };
    // If admin edited individual fields, mark preset as 'custom' unless they
    // explicitly set a preset.
    if (!dto.compliance_preset) payload.compliance_preset = 'custom';

    const { data, error } = await supabase
      .from('hr_compliance_settings')
      .update(payload)
      .eq('organization_id', organizationId)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Compliance settings not found');
    return data;
  }

  async applyPreset(
    organizationId: string,
    userId: string | null,
    preset: CompliancePreset,
  ) {
    const def = getPreset(preset);
    if (!def) throw new BadRequestException(`Unknown preset: ${preset}`);

    await this.get(organizationId);

    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('hr_compliance_settings')
      .update({
        ...def.values,
        last_updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  listPresets() {
    return listPresets();
  }

  /** Human-readable summary for display in UI. */
  async summary(organizationId: string) {
    const s = await this.get(organizationId);
    const active: string[] = [];
    if (s.cnss_enabled) active.push('CNSS');
    if (s.amo_enabled) active.push('AMO');
    if (s.cis_enabled) active.push('CIS/RCAR');
    if (s.income_tax_enabled) active.push('IR');
    if (s.overtime_enabled) active.push('Overtime');
    if (s.minimum_wage_check_enabled) active.push('Min wage check');

    return {
      preset: s.compliance_preset,
      country: s.compliance_country,
      currency: s.default_currency,
      active_components: active,
      leave_mode: s.leave_compliance_mode,
      pay_frequency: s.default_pay_frequency,
      preset_label:
        COMPLIANCE_PRESETS[s.compliance_preset as CompliancePreset]?.label ??
        s.compliance_preset,
    };
  }
}
