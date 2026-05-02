import { BadRequestException, Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateFiscalYearDto } from './dto/create-fiscal-year.dto';
import { UpdateFiscalYearDto } from './dto/update-fiscal-year.dto';

@Injectable()
export class FiscalYearsService {
  private readonly logger = new Logger(FiscalYearsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(organizationId: string) {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('fiscal_years')
      .select('*')
      .eq('organization_id', organizationId)
      .order('start_date', { ascending: false });

    if (error) {
      this.logger.error(`Failed to fetch fiscal years: ${error.message}`);
      throw error;
    }

    return data;
  }

  async findOne(id: string, organizationId: string) {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('fiscal_years')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      this.logger.error(`Failed to fetch fiscal year: ${error.message}`);
      throw error;
    }

    return data;
  }

  async create(organizationId: string, userId: string, createDto: CreateFiscalYearDto) {
    const client = this.databaseService.getAdminClient();

    // Check if fiscal year with same name exists
    const { data: existing } = await client
      .from('fiscal_years')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('name', createDto.name)
      .maybeSingle();

    if (existing) {
      throw new ConflictException('Fiscal year with this name already exists');
    }

    const { is_current, ...rest } = createDto as CreateFiscalYearDto & { is_current?: boolean };

    if (is_current) {
      await this.clearCurrentForOrg(organizationId);
    }

    const { data, error } = await client
      .from('fiscal_years')
      .insert({
        organization_id: organizationId,
        created_by: userId,
        is_current: is_current ?? false,
        ...rest,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create fiscal year: ${error.message}`);
      throw error;
    }

    return data;
  }

  async update(id: string, organizationId: string, userId: string, updateDto: UpdateFiscalYearDto) {
    const client = this.databaseService.getAdminClient();

    // Check if fiscal year exists
    const existing = await this.findOne(id, organizationId);
    if (!existing) {
      throw new NotFoundException('Fiscal year not found');
    }

    // If updating name, check for duplicates
    if (updateDto.name && updateDto.name !== existing.name) {
      const { data: duplicate } = await client
        .from('fiscal_years')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('name', updateDto.name)
        .neq('id', id)
        .maybeSingle();

      if (duplicate) {
        throw new ConflictException('Fiscal year with this name already exists');
      }
    }

    if (updateDto.is_current) {
      await this.clearCurrentForOrg(organizationId, id);
    }

    const { data, error } = await client
      .from('fiscal_years')
      .update({
        ...updateDto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update fiscal year: ${error.message}`);
      throw error;
    }

    return data;
  }

  private async clearCurrentForOrg(organizationId: string, exceptId?: string): Promise<void> {
    const client = this.databaseService.getAdminClient();
    let query = client
      .from('fiscal_years')
      .update({ is_current: false })
      .eq('organization_id', organizationId)
      .eq('is_current', true);

    if (exceptId) query = query.neq('id', exceptId);

    const { error } = await query;
    if (error) {
      this.logger.warn(`Failed to clear current fiscal year flag: ${error.message}`);
    }
  }

  async remove(id: string, organizationId: string) {
    const client = this.databaseService.getAdminClient();

    // Check if fiscal year exists
    const existing = await this.findOne(id, organizationId);
    if (!existing) {
      throw new NotFoundException('Fiscal year not found');
    }

    // Prevent deletion of current fiscal year
    if (existing.is_current) {
      throw new ConflictException('Cannot delete current fiscal year');
    }

    // Prevent deletion of closed fiscal year
    if (existing.status === 'closed') {
      throw new ConflictException('Cannot delete closed fiscal year');
    }

    const { error } = await client
      .from('fiscal_years')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to delete fiscal year: ${error.message}`);
      throw error;
    }

    return { id };
  }

  async close(id: string, organizationId: string, userId: string, closingNotes?: string) {
    const client = this.databaseService.getAdminClient();

    // Check if fiscal year exists
    const existing = await this.findOne(id, organizationId);
    if (!existing) {
      throw new NotFoundException('Fiscal year not found');
    }

    // Prevent closing already closed fiscal year
    if (existing.status === 'closed') {
      throw new ConflictException('Fiscal year is already closed');
    }

    const { data, error } = await client
      .from('fiscal_years')
      .update({
        status: 'closed',
        is_current: false,
        closed_at: new Date().toISOString(),
        closed_by: userId,
        closing_notes: closingNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to close fiscal year: ${error.message}`);
      throw error;
    }

    return data;
  }

  async reopen(id: string, organizationId: string, userId: string) {
    const client = this.databaseService.getAdminClient();

    // Check if fiscal year exists
    const existing = await this.findOne(id, organizationId);
    if (!existing) {
      throw new NotFoundException('Fiscal year not found');
    }

    // Prevent reopening already open fiscal year
    if (existing.status !== 'closed') {
      throw new ConflictException('Fiscal year is not closed');
    }

    const { data, error } = await client
      .from('fiscal_years')
      .update({
        status: 'open',
        closed_at: null,
        closed_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to reopen fiscal year: ${error.message}`);
      throw error;
    }

    return data;
  }

  async getActive(organizationId: string) {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('fiscal_years')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_current', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" which is ok
      this.logger.error(`Failed to fetch active fiscal year: ${error.message}`);
      throw error;
    }

    return data;
  }

  /**
   * Resolve the fiscal year ID for a given date.
   * Looks for an open fiscal year whose date range contains the given date.
   * Falls back to the active fiscal year if no match is found.
   */
  async resolveFiscalYear(organizationId: string, date: string): Promise<string | null> {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('fiscal_years')
      .select('id, start_date')
      .eq('organization_id', organizationId)
      .lte('start_date', date)
      .gte('end_date', date)
      .order('start_date', { ascending: false })
      .limit(1);

    if (error) {
      this.logger.warn(`Failed to resolve fiscal year for date ${date}: ${error.message}`);
      return null;
    }

    if (data?.length) return data[0].id;

    // Fallback: return active fiscal year
    const active = await this.getActive(organizationId);
    return active?.id || null;
  }

  /**
   * Throw if the fiscal year covering the given date is closed.
   * Soft-allows dates that fall outside any configured fiscal year
   * (orgs that have not yet set up accounting periods can still post).
   */
  async assertPeriodOpen(organizationId: string, date: string): Promise<void> {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('fiscal_years')
      .select('id, name, status')
      .eq('organization_id', organizationId)
      .lte('start_date', date)
      .gte('end_date', date)
      .limit(1);

    if (error) {
      throw new BadRequestException(`Failed to check fiscal year status: ${error.message}`);
    }

    if (!data || data.length === 0) {
      // No fiscal year covers this date — soft-allow (org has not configured accounting periods)
      return;
    }

    const fy = data[0];
    if (fy.status === 'closed') {
      throw new BadRequestException(
        `Cannot post to closed fiscal year "${fy.name}" (date: ${date}). Reopen the fiscal year or choose a date in an open period.`,
      );
    }
  }
}
