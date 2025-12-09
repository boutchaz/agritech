import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateUtilityDto } from './dto/create-utility.dto';
import { UpdateUtilityDto } from './dto/update-utility.dto';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class UtilitiesService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Verify user has access to the organization
   */
  private async verifyOrganizationAccess(userId: string, organizationId: string) {
    const client = this.databaseService.getAdminClient();
    const { data: orgUser } = await client
      .from('organization_users')
      .select('organization_id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (!orgUser) {
      throw new ForbiddenException('You do not have access to this organization');
    }
  }

  /**
   * Get all utilities for a farm
   */
  async findAll(userId: string, organizationId: string, farmId: string) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data: utilities, error } = await client
      .from('utilities')
      .select('*')
      .eq('farm_id', farmId)
      .order('billing_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch utilities: ${error.message}`);
    }

    return utilities || [];
  }

  /**
   * Get a single utility by ID
   */
  async findOne(userId: string, organizationId: string, farmId: string, utilityId: string) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data: utility, error } = await client
      .from('utilities')
      .select('*')
      .eq('id', utilityId)
      .eq('farm_id', farmId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch utility: ${error.message}`);
    }

    if (!utility) {
      throw new NotFoundException('Utility not found');
    }

    return utility;
  }

  /**
   * Create a new utility
   */
  async create(userId: string, organizationId: string, createUtilityDto: CreateUtilityDto) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    // Verify the farm belongs to the organization
    const { data: farm } = await client
      .from('farms')
      .select('id')
      .eq('id', createUtilityDto.farm_id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!farm) {
      throw new NotFoundException('Farm not found or does not belong to this organization');
    }

    const { data: utility, error } = await client
      .from('utilities')
      .insert({
        ...createUtilityDto,
        provider: createUtilityDto.provider || null,
        account_number: createUtilityDto.account_number || null,
        consumption_value: createUtilityDto.consumption_value || null,
        consumption_unit: createUtilityDto.consumption_unit || null,
        due_date: createUtilityDto.due_date || null,
        is_recurring: createUtilityDto.is_recurring || false,
        recurring_frequency: createUtilityDto.recurring_frequency || null,
        invoice_url: createUtilityDto.invoice_url || null,
        notes: createUtilityDto.notes || null,
        journal_entry_id: createUtilityDto.journal_entry_id || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create utility: ${error.message}`);
    }

    return utility;
  }

  /**
   * Update a utility
   */
  async update(
    userId: string,
    organizationId: string,
    farmId: string,
    utilityId: string,
    updateUtilityDto: UpdateUtilityDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    // Verify the utility exists and belongs to the farm
    const { data: existingUtility } = await client
      .from('utilities')
      .select('id, farm_id')
      .eq('id', utilityId)
      .eq('farm_id', farmId)
      .maybeSingle();

    if (!existingUtility) {
      throw new NotFoundException('Utility not found');
    }

    // Verify the farm belongs to the organization
    const { data: farm } = await client
      .from('farms')
      .select('id')
      .eq('id', farmId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!farm) {
      throw new NotFoundException('Farm not found or does not belong to this organization');
    }

    // Sanitize data: convert empty strings to null
    const sanitizedData: any = { ...updateUtilityDto };

    if ('provider' in sanitizedData) sanitizedData.provider = sanitizedData.provider || null;
    if ('account_number' in sanitizedData) sanitizedData.account_number = sanitizedData.account_number || null;
    if ('consumption_value' in sanitizedData) sanitizedData.consumption_value = sanitizedData.consumption_value || null;
    if ('consumption_unit' in sanitizedData) sanitizedData.consumption_unit = sanitizedData.consumption_unit || null;
    if ('due_date' in sanitizedData) sanitizedData.due_date = sanitizedData.due_date || null;
    if ('recurring_frequency' in sanitizedData) sanitizedData.recurring_frequency = sanitizedData.recurring_frequency || null;
    if ('invoice_url' in sanitizedData) sanitizedData.invoice_url = sanitizedData.invoice_url || null;
    if ('notes' in sanitizedData) sanitizedData.notes = sanitizedData.notes || null;
    if ('journal_entry_id' in sanitizedData) sanitizedData.journal_entry_id = sanitizedData.journal_entry_id || null;

    const { data: utility, error } = await client
      .from('utilities')
      .update(sanitizedData)
      .eq('id', utilityId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update utility: ${error.message}`);
    }

    return utility;
  }

  /**
   * Delete a utility
   */
  async remove(userId: string, organizationId: string, farmId: string, utilityId: string) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    // Verify the utility exists and belongs to the farm
    const { data: existingUtility } = await client
      .from('utilities')
      .select('id, farm_id')
      .eq('id', utilityId)
      .eq('farm_id', farmId)
      .maybeSingle();

    if (!existingUtility) {
      throw new NotFoundException('Utility not found');
    }

    // Verify the farm belongs to the organization
    const { data: farm } = await client
      .from('farms')
      .select('id')
      .eq('id', farmId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!farm) {
      throw new NotFoundException('Farm not found or does not belong to this organization');
    }

    const { error } = await client
      .from('utilities')
      .delete()
      .eq('id', utilityId);

    if (error) {
      throw new Error(`Failed to delete utility: ${error.message}`);
    }

    return { message: 'Utility deleted successfully' };
  }

  /**
   * Get accounts for account lookups (helper for journal entries)
   */
  async getAccountByType(
    userId: string,
    organizationId: string,
    accountType: string,
    accountSubtype?: string,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    let query = client
      .from('accounts')
      .select('id, code, name')
      .eq('organization_id', organizationId)
      .eq('account_type', accountType)
      .eq('is_active', true)
      .eq('is_group', false);

    if (accountSubtype) {
      query = query.eq('account_subtype', accountSubtype);
    }

    const { data, error } = await query.order('code', { ascending: true }).limit(1).maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch account: ${error.message}`);
    }

    if (!data?.id) {
      const subtypeMsg = accountSubtype ? ` (${accountSubtype})` : '';
      throw new NotFoundException(
        `Compte comptable de type "${accountType}"${subtypeMsg} introuvable. Veuillez créer ce compte dans le plan comptable.`,
      );
    }

    return data;
  }
}
