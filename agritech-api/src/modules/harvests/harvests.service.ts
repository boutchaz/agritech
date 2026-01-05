import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { CreateHarvestDto } from './dto/create-harvest.dto';
import { UpdateHarvestDto } from './dto/update-harvest.dto';
import { HarvestFiltersDto } from './dto/harvest-filters.dto';
import { SellHarvestDto, PaymentTerms } from './dto/sell-harvest.dto';
import { DatabaseService } from '../database/database.service';
import { AccountingAutomationService } from '../journal-entries/accounting-automation.service';

@Injectable()
export class HarvestsService {
  private readonly logger = new Logger(HarvestsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly accountingAutomationService: AccountingAutomationService,
  ) {}

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

  async findAll(userId: string, organizationId: string, filters?: HarvestFiltersDto) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    
    // Get total count first
    let countQuery = client
      .from('harvest_records')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    // Apply filters to count query
    if (filters?.status) {
      const statuses = filters.status.split(',');
      countQuery = countQuery.in('status', statuses);
    }
    if (filters?.farm_id) countQuery = countQuery.eq('farm_id', filters.farm_id);
    if (filters?.parcel_id) countQuery = countQuery.eq('parcel_id', filters.parcel_id);
    if (filters?.crop_id) countQuery = countQuery.eq('crop_id', filters.crop_id);
    const dateFrom = filters?.date_from || filters?.dateFrom;
    const dateTo = filters?.date_to || filters?.dateTo;
    if (dateFrom) countQuery = countQuery.gte('harvest_date', dateFrom);
    if (dateTo) countQuery = countQuery.lte('harvest_date', dateTo);
    if (filters?.intended_for) countQuery = countQuery.eq('intended_for', filters.intended_for);
    if (filters?.quality_grade) {
      const grades = filters.quality_grade.split(',');
      countQuery = countQuery.in('quality_grade', grades);
    }

    const { count: totalCount, error: countError } = await countQuery;
    if (countError) throw new Error(`Failed to count harvests: ${countError.message}`);

    // Build main query
    let query = client
      .from('harvest_records')
      .select('*')
      .eq('organization_id', organizationId);

    // Apply filters
    if (filters?.status) {
      const statuses = filters.status.split(',');
      query = query.in('status', statuses);
    }
    if (filters?.farm_id) query = query.eq('farm_id', filters.farm_id);
    if (filters?.parcel_id) query = query.eq('parcel_id', filters.parcel_id);
    if (filters?.crop_id) query = query.eq('crop_id', filters.crop_id);
    if (dateFrom) query = query.gte('harvest_date', dateFrom);
    if (dateTo) query = query.lte('harvest_date', dateTo);
    if (filters?.intended_for) query = query.eq('intended_for', filters.intended_for);
    if (filters?.quality_grade) {
      const grades = filters.quality_grade.split(',');
      query = query.in('quality_grade', grades);
    }

    // Apply sorting
    const sortBy = filters?.sortBy || 'harvest_date';
    const sortDir = filters?.sortDir || 'desc';
    query = query.order(sortBy, { ascending: sortDir === 'asc' });

    // Apply pagination
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 10;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch harvests: ${error.message}`);

    return {
      data: data || [],
      total: totalCount || 0,
      page,
      pageSize,
      totalPages: Math.ceil((totalCount || 0) / pageSize),
    };
  }

  async findOne(userId: string, organizationId: string, harvestId: string) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('harvest_records')
      .select('*')
      .eq('id', harvestId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch harvest: ${error.message}`);
    if (!data) throw new NotFoundException('Harvest not found');

    return data;
  }

  async create(userId: string, organizationId: string, createHarvestDto: CreateHarvestDto) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('harvest_records')
      .insert({
        ...createHarvestDto,
        organization_id: organizationId,
        created_by: userId,
        status: 'stored',
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create harvest: ${error.message}`);
    return data;
  }

  async update(userId: string, organizationId: string, harvestId: string, updateHarvestDto: UpdateHarvestDto) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data: existing } = await client
      .from('harvest_records')
      .select('id')
      .eq('id', harvestId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!existing) throw new NotFoundException('Harvest not found');

    const { data, error } = await client
      .from('harvest_records')
      .update(updateHarvestDto)
      .eq('id', harvestId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update harvest: ${error.message}`);
    return data;
  }

  async remove(userId: string, organizationId: string, harvestId: string) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data: existing } = await client
      .from('harvest_records')
      .select('id')
      .eq('id', harvestId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!existing) throw new NotFoundException('Harvest not found');

    const { error } = await client
      .from('harvest_records')
      .delete()
      .eq('id', harvestId);

    if (error) throw new Error(`Failed to delete harvest: ${error.message}`);
    return { message: 'Harvest deleted successfully' };
  }

  async sellHarvest(userId: string, organizationId: string, harvestId: string, sellDto: SellHarvestDto) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    // 1. Fetch the harvest record
    const { data: harvest, error: fetchError } = await client
      .from('harvest_records')
      .select('*')
      .eq('id', harvestId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (fetchError) throw new Error(`Failed to fetch harvest: ${fetchError.message}`);
    if (!harvest) throw new NotFoundException('Harvest not found');

    // 2. Validate harvest status
    if (harvest.status === 'sold') {
      throw new BadRequestException('This harvest has already been sold');
    }
    if (harvest.status === 'spoiled') {
      throw new BadRequestException('Cannot sell spoiled harvest');
    }

    // 3. Validate quantity
    if (sellDto.quantity_sold > harvest.quantity) {
      throw new BadRequestException(
        `Cannot sell ${sellDto.quantity_sold} ${harvest.unit}. Only ${harvest.quantity} ${harvest.unit} available.`,
      );
    }

    // 4. Calculate total revenue
    const totalRevenue = sellDto.quantity_sold * sellDto.price_per_unit;

    // 5. Determine customer
    const customerName = sellDto.customer_name || 'Direct Sale';

    // 6. Generate invoice number if not provided
    const invoiceNumber = sellDto.invoice_number || `HSL-${new Date().getFullYear()}-${Date.now()}`;

    // 7. Update harvest record
    const { error: updateError } = await client
      .from('harvest_records')
      .update({
        status: 'sold',
        updated_at: new Date().toISOString(),
      })
      .eq('id', harvestId);

    if (updateError) throw new Error(`Failed to update harvest: ${updateError.message}`);

    // 8. Create journal entry for the sale
    try {
      this.logger.log(
        `Creating journal entry for harvest sale: ${harvest.crop_id || 'Unknown crop'}, Qty: ${sellDto.quantity_sold} ${harvest.unit}, Revenue: ${totalRevenue}`,
      );

      // Get account mappings for harvest sale
      const { data: mapping, error: mappingError } = await client
        .from('account_mappings')
        .select('account_id, metadata')
        .eq('organization_id', organizationId)
        .eq('mapping_type', 'harvest_sale')
        .eq('source_key', harvest.intended_for || 'market')
        .eq('is_active', true)
        .maybeSingle();

      if (mappingError || !mapping) {
        this.logger.warn(
          `No account mapping found for harvest sale type: ${harvest.intended_for || 'market'}. Journal entry not created.`,
        );
        return {
          success: true,
          message: 'Harvest sold successfully (no journal entry created - mappings not set up)',
          data: {
            harvest_id: harvestId,
            invoice_number: invoiceNumber,
            total_revenue: totalRevenue,
          },
        };
      }

      const revenueAccountId = mapping.account_id;
      const arAccountId = mapping.metadata?.ar_account_id;
      const cashAccountId = mapping.metadata?.cash_account_id;

      if (!arAccountId || !cashAccountId) {
        throw new BadRequestException('Account mapping metadata incomplete (missing AR or Cash account)');
      }

      // Generate journal entry number
      const journalEntryNumber = await this.generateJournalEntryNumber(client, organizationId);

      // Determine which account to debit based on payment terms
      const debitAccountId = sellDto.payment_terms === PaymentTerms.CASH ? cashAccountId : arAccountId;
      const debitDescription =
        sellDto.payment_terms === PaymentTerms.CASH
          ? `Cash sale - ${customerName}`
          : `Credit sale - ${customerName} (${invoiceNumber})`;

      // Create journal entry header
      const { data: journalEntry, error: journalError } = await client
        .from('journal_entries')
        .insert({
          organization_id: organizationId,
          entry_number: journalEntryNumber,
          entry_date: sellDto.sale_date,
          reference_type: 'harvest_sale',
          reference_id: harvestId,
          description: `Harvest sale: ${harvest.crop_id || 'Crop'} - ${sellDto.quantity_sold} ${harvest.unit} @ ${sellDto.price_per_unit}/${harvest.unit}`,
          notes: sellDto.notes,
          created_by: userId,
          total_debit: 0, // Will be calculated by trigger
          total_credit: 0, // Will be calculated by trigger
        })
        .select()
        .single();

      if (journalError || !journalEntry) {
        throw new Error(`Failed to create journal entry: ${journalError?.message}`);
      }

      // Create journal items (Double-entry)
      const journalItems = [
        {
          journal_entry_id: journalEntry.id,
          account_id: debitAccountId, // Dr. Cash or AR
          debit: totalRevenue,
          credit: 0,
          description: debitDescription,
        },
        {
          journal_entry_id: journalEntry.id,
          account_id: revenueAccountId, // Cr. Revenue
          debit: 0,
          credit: totalRevenue,
          description: `Revenue from harvest sale - ${harvest.crop_id || 'Crop'}`,
        },
      ];

      const { error: itemsError } = await client.from('journal_items').insert(journalItems);

      if (itemsError) {
        // Rollback journal entry
        await client.from('journal_entries').delete().eq('id', journalEntry.id);
        throw new Error(`Failed to create journal items: ${itemsError.message}`);
      }

      // Validate double-entry (totals should be automatically calculated by trigger)
      const { data: updatedEntry, error: validateError } = await client
        .from('journal_entries')
        .select('total_debit, total_credit')
        .eq('id', journalEntry.id)
        .single();

      if (validateError || !updatedEntry) {
        throw new Error('Failed to validate journal entry totals');
      }

      if (Math.abs(updatedEntry.total_debit - updatedEntry.total_credit) >= 0.01) {
        // Rollback
        await client.from('journal_entries').delete().eq('id', journalEntry.id);
        throw new BadRequestException(
          `Journal entry is not balanced: debits=${updatedEntry.total_debit}, credits=${updatedEntry.total_credit}`,
        );
      }

      this.logger.log(`Journal entry created successfully for harvest sale ${harvestId}`);

      return {
        success: true,
        message: 'Harvest sold successfully with journal entry',
        data: {
          harvest_id: harvestId,
          journal_entry_id: journalEntry.id,
          invoice_number: invoiceNumber,
          total_revenue: totalRevenue,
          payment_terms: sellDto.payment_terms,
        },
      };
    } catch (journalError) {
      // Log the error but don't fail the entire sale
      this.logger.error(`Failed to create journal entry for harvest sale ${harvestId}: ${journalError.message}`, journalError.stack);

      // Return success but indicate journal entry issue
      return {
        success: true,
        message: 'Harvest sold successfully but journal entry creation failed',
        data: {
          harvest_id: harvestId,
          invoice_number: invoiceNumber,
          total_revenue: totalRevenue,
          error: journalError.message,
        },
      };
    }
  }

  private async generateJournalEntryNumber(client: any, organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `JE-${year}-`;

    const { data: lastEntry } = await client
      .from('journal_entries')
      .select('entry_number')
      .eq('organization_id', organizationId)
      .like('entry_number', `${prefix}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastEntry?.entry_number) {
      const lastNumber = parseInt(lastEntry.entry_number.split('-').pop() || '0', 10);
      return `${prefix}${String(lastNumber + 1).padStart(5, '0')}`;
    }

    return `${prefix}00001`;
  }
}
