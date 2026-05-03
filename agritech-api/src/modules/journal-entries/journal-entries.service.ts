import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SequencesService } from '../sequences/sequences.service';
import { FiscalYearsService } from '../fiscal-years/fiscal-years.service';
import { sanitizeSearch } from '../../common/utils/sanitize-search';
import { NotificationsService, ADMIN_ONLY_ROLES } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/notification.dto';

export interface CreateJournalEntryDto {
  entry_date: string;
  entry_type?: 'expense' | 'revenue' | 'transfer' | 'adjustment';
  description?: string;
  remarks?: string;
  reference_type?: string;
  reference_number?: string;
  fiscal_year_id?: string;
  /** Phase 4f: tag this JE as one side of an inter-org transaction. */
  intercompany_pair_id?: string;
  items: {
    account_id: string;
    debit: number;
    credit: number;
    description?: string;
    cost_center_id?: string;
    farm_id?: string;
    parcel_id?: string;
    currency?: string;
    exchange_rate?: number;
    fc_debit?: number;
    fc_credit?: number;
  }[];
}

export interface UpdateJournalEntryDto {
  entry_date?: string;
  entry_type?: 'expense' | 'revenue' | 'transfer' | 'adjustment';
  description?: string;
  remarks?: string;
  fiscal_year_id?: string;
  items?: {
    account_id: string;
    debit: number;
    credit: number;
    description?: string;
    cost_center_id?: string;
    farm_id?: string;
    parcel_id?: string;
    currency?: string;
    exchange_rate?: number;
    fc_debit?: number;
    fc_credit?: number;
  }[];
}

@Injectable()
export class JournalEntriesService {
  private readonly logger = new Logger(JournalEntriesService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly sequencesService: SequencesService,
    private readonly notificationsService: NotificationsService,
    private readonly fiscalYearsService: FiscalYearsService,
  ) {}

  async findAll(organizationId: string, filters?: any) {
    const supabaseClient = this.databaseService.getAdminClient();

    try {
      const page = filters?.page || 1;
      const pageSize = filters?.pageSize || 10;
      const sortBy = filters?.sortBy || 'entry_date';
      const sortDir = filters?.sortDir || 'desc';
      const search = filters?.search;
      const dateFrom = filters?.dateFrom;
      const dateTo = filters?.dateTo;

      const hasPagination = filters?.page !== undefined || filters?.pageSize !== undefined;

      let countQuery = supabaseClient
        .from('journal_entries')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      let query = supabaseClient
        .from('journal_entries')
        .select(`
          *,
          journal_items(
            *,
            accounts(code, name)
          )
        `)
        .eq('organization_id', organizationId);

      if (filters?.status) {
        query = query.eq('status', filters.status);
        countQuery = countQuery.eq('status', filters.status);
      }

      if (filters?.entry_type) {
        query = query.eq('entry_type', filters.entry_type);
        countQuery = countQuery.eq('entry_type', filters.entry_type);
      }

      if (dateFrom || filters?.date_from) {
        const fromDate = dateFrom || filters.date_from;
        query = query.gte('entry_date', fromDate);
        countQuery = countQuery.gte('entry_date', fromDate);
      }

      if (dateTo || filters?.date_to) {
        const toDate = dateTo || filters.date_to;
        query = query.lte('entry_date', toDate);
        countQuery = countQuery.lte('entry_date', toDate);
      }

      if (search) {
        const safeSearch = sanitizeSearch(search);
        if (safeSearch) {
          const searchPattern = `%${safeSearch}%`;
          query = query.or(`entry_number.ilike.${searchPattern},reference_number.ilike.${searchPattern},remarks.ilike.${searchPattern}`);
          countQuery = countQuery.or(`entry_number.ilike.${searchPattern},reference_number.ilike.${searchPattern},remarks.ilike.${searchPattern}`);
        }
      }

      if (filters?.account_id) {
        query = query.filter('journal_items.account_id', 'eq', filters.account_id);
      }

      if (filters?.cost_center_id) {
        query = query.filter('journal_items.cost_center_id', 'eq', filters.cost_center_id);
      }

      if (filters?.farm_id) {
        query = query.filter('journal_items.farm_id', 'eq', filters.farm_id);
      }

      if (filters?.parcel_id) {
        query = query.filter('journal_items.parcel_id', 'eq', filters.parcel_id);
      }

      if (filters?.fiscal_year_id) {
        query = query.eq('fiscal_year_id', filters.fiscal_year_id);
        countQuery = countQuery.eq('fiscal_year_id', filters.fiscal_year_id);
      }

      query = query.order(sortBy, { ascending: sortDir === 'asc' });

      if (hasPagination) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        const { count: totalCount } = await countQuery;
        const { data, error } = await query;

        if (error) {
          this.logger.error('Error fetching journal entries:', error);
          throw new BadRequestException(`Failed to fetch journal entries: ${error.message}`);
        }

        const total = totalCount || 0;
        const totalPages = Math.ceil(total / pageSize);

        return {
          data: data || [],
          total,
          page,
          pageSize,
          totalPages,
        };
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error('Error fetching journal entries:', error);
        throw new BadRequestException(`Failed to fetch journal entries: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      this.logger.error('Error in findAll journal entries:', error);
      throw error;
    }
  }

  /**
   * Get a single journal entry by ID
   */
  async findOne(id: string, organizationId: string) {
    const supabaseClient = this.databaseService.getAdminClient();

    try {
      const { data, error } = await supabaseClient
        .from('journal_entries')
        .select(`
          *,
          journal_items(
            *,
            accounts(code, name)
          )
        `)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (error || !data) {
        throw new NotFoundException(`Journal entry with ID ${id} not found`);
      }

      return data;
    } catch (error) {
      this.logger.error('Error in findOne journal entry:', error);
      throw error;
    }
  }

  /**
   * Create a new journal entry
   */
  async create(dto: CreateJournalEntryDto, organizationId: string, userId: string) {
    const supabaseClient = this.databaseService.getAdminClient();

    try {
      if (!dto?.entry_date || String(dto.entry_date).trim() === '') {
        throw new BadRequestException('entry_date is required');
      }
      if (!dto.items || !Array.isArray(dto.items) || dto.items.length === 0) {
        throw new BadRequestException('At least one journal line item is required');
      }

      // Validate double-entry principle
      const totalDebit = dto.items.reduce((sum, item) => sum + (item.debit || 0), 0);
      const totalCredit = dto.items.reduce((sum, item) => sum + (item.credit || 0), 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new BadRequestException(
          `Journal entry is not balanced: debits (${totalDebit}) must equal credits (${totalCredit})`
        );
      }

       // Generate entry number
       const entryNumber = await this.sequencesService.generateJournalEntryNumber(organizationId);

      // Resolve fiscal year from date if not provided
      const fiscalYearId = dto.fiscal_year_id ||
        await this.fiscalYearsService.resolveFiscalYear(organizationId, dto.entry_date);

      // Create journal entry
      // Note: entry_type and description columns don't exist in the database schema
      const { data: entry, error: entryError } = await supabaseClient
        .from('journal_entries')
        .insert({
          organization_id: organizationId,
          entry_number: entryNumber,
          entry_date: dto.entry_date,
          remarks: dto.remarks || dto.description || null,
          reference_type: dto.reference_type,
          reference_number: dto.reference_number,
          total_debit: totalDebit,
          total_credit: totalCredit,
          status: 'draft',
          created_by: userId,
          ...(fiscalYearId ? { fiscal_year_id: fiscalYearId } : {}),
          ...(dto.intercompany_pair_id ? { intercompany_pair_id: dto.intercompany_pair_id } : {}),
        })
        .select()
        .single();

      if (entryError) {
        this.logger.error('Error creating journal entry:', entryError);
        throw new BadRequestException(`Failed to create journal entry: ${entryError.message}`);
      }

      // Resolve org base currency + per-account currency (for FX defaulting)
      const { data: orgRow } = await supabaseClient
        .from('organizations')
        .select('currency_code')
        .eq('id', organizationId)
        .maybeSingle();
      const baseCurrency = ((orgRow?.currency_code as string | undefined) || 'MAD').toUpperCase();

      const accountIds = Array.from(new Set(dto.items.map((it) => it.account_id)));
      const accountCurrencyMap = new Map<string, string>();
      if (accountIds.length > 0) {
        const { data: accs } = await supabaseClient
          .from('accounts')
          .select('id, currency_code')
          .in('id', accountIds);
        for (const a of accs || []) {
          accountCurrencyMap.set(a.id, ((a.currency_code as string | undefined) || baseCurrency).toUpperCase());
        }
      }

      // Create journal items (with FX columns)
      const items = dto.items.map((item) => {
        const debit = item.debit || 0;
        const credit = item.credit || 0;
        const ccy = (item.currency || accountCurrencyMap.get(item.account_id) || baseCurrency).toUpperCase();
        const rate = item.exchange_rate ?? (ccy === baseCurrency ? 1 : 1);
        return {
          journal_entry_id: entry.id,
          account_id: item.account_id,
          debit,
          credit,
          description: item.description,
          cost_center_id: item.cost_center_id,
          farm_id: item.farm_id,
          parcel_id: item.parcel_id,
          currency: ccy,
          exchange_rate: rate,
          fc_debit: item.fc_debit ?? debit,
          fc_credit: item.fc_credit ?? credit,
          ...(fiscalYearId ? { fiscal_year_id: fiscalYearId } : {}),
        };
      });

      const { error: itemsError } = await supabaseClient
        .from('journal_items')
        .insert(items);

      if (itemsError) {
        // Rollback: delete the entry
        await supabaseClient.from('journal_entries').delete().eq('id', entry.id);
        this.logger.error('Error creating journal items:', itemsError);
        throw new BadRequestException(`Failed to create journal items: ${itemsError.message}`);
      }

      return this.findOne(entry.id, organizationId);
    } catch (error) {
      this.logger.error('Error in create journal entry:', error);
      throw error;
    }
  }

  /**
   * Update a draft journal entry
   */
  async update(id: string, dto: UpdateJournalEntryDto, organizationId: string, userId: string) {
    const supabaseClient = this.databaseService.getAdminClient();

    try {
      // Check if entry exists and is draft
      const entry = await this.findOne(id, organizationId);

      if (entry.status !== 'draft') {
        throw new BadRequestException('Only draft journal entries can be updated');
      }

      // Build update data
      // Note: entry_type and description columns don't exist in the database schema
      const updateData: any = {};

      if (dto.entry_date) updateData.entry_date = dto.entry_date;
      if (dto.remarks !== undefined) updateData.remarks = dto.remarks;
      if (dto.description !== undefined && dto.remarks === undefined) {
        updateData.remarks = dto.description; // Map description to remarks
      }

      // If items are provided, recalculate totals
      if (dto.items) {
        const totalDebit = dto.items.reduce((sum, item) => sum + (item.debit || 0), 0);
        const totalCredit = dto.items.reduce((sum, item) => sum + (item.credit || 0), 0);

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
          throw new BadRequestException(
            `Journal entry is not balanced: debits (${totalDebit}) must equal credits (${totalCredit})`
          );
        }

        updateData.total_debit = totalDebit;
        updateData.total_credit = totalCredit;
      }

      // Update entry header
      const { error: updateError } = await supabaseClient
        .from('journal_entries')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (updateError) {
        throw new BadRequestException(`Failed to update journal entry: ${updateError.message}`);
      }

      // Update items if provided
      if (dto.items) {
        // Delete existing items
        const { error: deleteError } = await supabaseClient
          .from('journal_items')
          .delete()
          .eq('journal_entry_id', id);

        if (deleteError) {
          throw new BadRequestException(`Failed to delete existing items: ${deleteError.message}`);
        }

        // Resolve fiscal year for updated items
        const entryDate = dto.entry_date || entry.entry_date;
        const updateFiscalYearId = dto.fiscal_year_id || entry.fiscal_year_id ||
          await this.fiscalYearsService.resolveFiscalYear(organizationId, entryDate);

        // Resolve org base + per-account currencies for FX defaults
        const { data: orgRowU } = await supabaseClient
          .from('organizations')
          .select('currency_code')
          .eq('id', organizationId)
          .maybeSingle();
        const baseCurrencyU = ((orgRowU?.currency_code as string | undefined) || 'MAD').toUpperCase();
        const accountIdsU = Array.from(new Set(dto.items.map((it) => it.account_id)));
        const accountCcyMap = new Map<string, string>();
        if (accountIdsU.length > 0) {
          const { data: accs } = await supabaseClient
            .from('accounts')
            .select('id, currency_code')
            .in('id', accountIdsU);
          for (const a of accs || []) {
            accountCcyMap.set(a.id, ((a.currency_code as string | undefined) || baseCurrencyU).toUpperCase());
          }
        }

        // Insert new items (with FX columns)
        const items = dto.items.map((item) => {
          const debit = item.debit || 0;
          const credit = item.credit || 0;
          const ccy = (item.currency || accountCcyMap.get(item.account_id) || baseCurrencyU).toUpperCase();
          const rate = item.exchange_rate ?? 1;
          return {
            journal_entry_id: id,
            account_id: item.account_id,
            debit,
            credit,
            description: item.description,
            cost_center_id: item.cost_center_id,
            farm_id: item.farm_id,
            parcel_id: item.parcel_id,
            currency: ccy,
            exchange_rate: rate,
            fc_debit: item.fc_debit ?? debit,
            fc_credit: item.fc_credit ?? credit,
            ...(updateFiscalYearId ? { fiscal_year_id: updateFiscalYearId } : {}),
          };
        });

        const { error: insertError } = await supabaseClient
          .from('journal_items')
          .insert(items);

        if (insertError) {
          throw new BadRequestException(`Failed to create journal items: ${insertError.message}`);
        }
      }

      return this.findOne(id, organizationId);
    } catch (error) {
      this.logger.error('Error in update journal entry:', error);
      throw error;
    }
  }

  /**
   * Post a journal entry
   */
  async post(id: string, organizationId: string, userId: string) {
    const supabaseClient = this.databaseService.getAdminClient();

    try {
      const entry = await this.findOne(id, organizationId);

      if (entry.status !== 'draft') {
        throw new BadRequestException('Only draft journal entries can be posted');
      }

      const now = new Date().toISOString();
      const { error } = await supabaseClient
        .from('journal_entries')
        .update({
          status: 'posted',
          posted_by: userId,
          posted_at: now,
        })
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) {
        throw new BadRequestException(`Failed to post journal entry: ${error.message}`);
      }

      // Notify admins about posted journal entry
      try {
        await this.notificationsService.createNotificationsForRoles(
          organizationId,
          ADMIN_ONLY_ROLES,
          userId,
          NotificationType.JOURNAL_ENTRY_POSTED,
          `📒 Journal entry ${entry.entry_number || id} posted`,
          entry.description || undefined,
          { journalEntryId: id, entryNumber: entry.entry_number },
        );
      } catch (notifError) {
        this.logger.warn(`Failed to send journal entry notification: ${notifError}`);
      }

      return this.findOne(id, organizationId);
    } catch (error) {
      this.logger.error('Error in post journal entry:', error);
      throw error;
    }
  }

  /**
   * Cancel a journal entry
   */
  async cancel(id: string, organizationId: string) {
    const supabaseClient = this.databaseService.getAdminClient();

    try {
      const entry = await this.findOne(id, organizationId);

      if (entry.status === 'cancelled') {
        throw new BadRequestException('Journal entry is already cancelled');
      }

      const { error } = await supabaseClient
        .from('journal_entries')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) {
        throw new BadRequestException(`Failed to cancel journal entry: ${error.message}`);
      }

      return this.findOne(id, organizationId);
    } catch (error) {
      this.logger.error('Error in cancel journal entry:', error);
      throw error;
    }
  }

  /**
   * Delete a draft journal entry
   */
  async delete(id: string, organizationId: string) {
    const supabaseClient = this.databaseService.getAdminClient();

    try {
      const entry = await this.findOne(id, organizationId);

      if (entry.status !== 'draft') {
        throw new BadRequestException('Only draft journal entries can be deleted');
      }

      // Delete items first
      const { error: itemsError } = await supabaseClient
        .from('journal_items')
        .delete()
        .eq('journal_entry_id', id);

      if (itemsError) {
        throw new BadRequestException(`Failed to delete journal items: ${itemsError.message}`);
      }

      // Delete entry
      const { error } = await supabaseClient
        .from('journal_entries')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) {
        throw new BadRequestException(`Failed to delete journal entry: ${error.message}`);
      }

      return { message: 'Journal entry deleted successfully' };
    } catch (error) {
      this.logger.error('Error in delete journal entry:', error);
      throw error;
    }
  }
}
