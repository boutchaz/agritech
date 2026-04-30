import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UpdatePrintSettingsDto } from './dto';

type PrintSettingsRow = {
  id: string;
  organization_id: string;
  paper_size: string;
  compact_tables: boolean;
  repeat_header_footer: boolean;
  created_at: string;
  updated_at: string;
};

@Injectable()
export class PrintSettingsService {
  constructor(private readonly databaseService: DatabaseService) {}

  private async verifyOrganizationAccess(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('organization_users')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      throw new NotFoundException('Organization not found or access denied');
    }
  }

  async getOrCreate(userId: string, organizationId: string) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('print_settings')
      .upsert(
        {
          organization_id: organizationId,
        },
        { onConflict: 'organization_id' },
      )
      .select('*')
      .single<PrintSettingsRow>();

    if (error || !data) {
      throw new BadRequestException(`Failed to fetch print settings: ${error?.message ?? 'Unknown error'}`);
    }

    return data;
  }

  async upsert(userId: string, organizationId: string, data: UpdatePrintSettingsDto) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data: settings, error } = await client
      .from('print_settings')
      .upsert(
        {
          organization_id: organizationId,
          ...data,
        },
        { onConflict: 'organization_id' },
      )
      .select('*')
      .single<PrintSettingsRow>();

    if (error || !settings) {
      throw new BadRequestException(`Failed to update print settings: ${error?.message ?? 'Unknown error'}`);
    }

    return settings;
  }
}
