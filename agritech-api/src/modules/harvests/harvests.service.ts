import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { CreateHarvestDto } from './dto/create-harvest.dto';
import { UpdateHarvestDto } from './dto/update-harvest.dto';
import { HarvestFiltersDto } from './dto/harvest-filters.dto';
import { SellHarvestDto, PaymentTerms } from './dto/sell-harvest.dto';
import { DatabaseService } from '../database/database.service';
import { AccountingAutomationService } from '../journal-entries/accounting-automation.service';
import { ReceptionBatchesService } from '../reception-batches/reception-batches.service';
import { AdoptionService, MilestoneType } from '../adoption/adoption.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/notification.dto';
import { paginate } from '../../common/dto/paginated-query.dto';
import { sanitizeSearch } from '../../common/utils/sanitize-search';

@Injectable()
export class HarvestsService {
  private readonly logger = new Logger(HarvestsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly accountingAutomationService: AccountingAutomationService,
    private readonly receptionBatchesService: ReceptionBatchesService,
    private readonly adoptionService: AdoptionService,
    private readonly notificationsService: NotificationsService,
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

    const applyFilters = (q: any) => {
      q = q.eq('organization_id', organizationId);
      if (filters?.status) {
        const statuses = filters.status.split(',');
        q = q.in('status', statuses);
      }
      if (filters?.farm_id) q = q.eq('farm_id', filters.farm_id);
      if (filters?.parcel_id) q = q.eq('parcel_id', filters.parcel_id);
      if (filters?.crop_id) q = q.eq('crop_id', filters.crop_id);
      if (filters?.dateFrom) q = q.gte('harvest_date', filters.dateFrom);
      if (filters?.dateTo) q = q.lte('harvest_date', filters.dateTo);
      if (filters?.intended_for) q = q.eq('intended_for', filters.intended_for);
      if (filters?.quality_grade) {
        const grades = filters.quality_grade.split(',');
        q = q.in('quality_grade', grades);
      }
      if (filters?.search) {
        const s = sanitizeSearch(filters.search);
        if (s) q = q.or(`lot_number.ilike.%${s}%,notes.ilike.%${s}%,storage_location.ilike.%${s}%`);
      }
      return q;
    };

    const result = await paginate(client, 'harvest_records', {
      select: `
        *,
        farm:farms!farm_id(name),
        parcel:parcels!parcel_id(name)
      `,
      filters: applyFilters,
      page: filters?.page ?? 1,
      pageSize: filters?.pageSize ?? 10,
      orderBy: filters?.sortBy || 'harvest_date',
      ascending: (filters?.sortDir || 'desc') === 'asc',
      map: (row) => ({
        ...row,
        farm_name: Array.isArray(row.farm) ? row.farm[0]?.name : row.farm?.name,
        parcel_name: Array.isArray(row.parcel) ? row.parcel[0]?.name : row.parcel?.name,
        farm: undefined,
        parcel: undefined,
      }),
    });

    // Resolve crop names (crop_id has no FK constraint)
    const cropIds = [...new Set(result.data.filter((h: any) => h.crop_id).map((h: any) => h.crop_id))];
    let cropMap: Record<string, string> = {};
    if (cropIds.length > 0) {
      const { data: crops } = await client
        .from('crops')
        .select('id, name')
        .in('id', cropIds);
      cropMap = (crops || []).reduce((acc: Record<string, string>, c: any) => {
        acc[c.id] = c.name;
        return acc;
      }, {});
    }
    result.data = result.data.map((h: any) => ({
      ...h,
      crop_name: h.crop_id ? cropMap[h.crop_id] || null : null,
    }));

    return result;
  }

  async findOne(userId: string, organizationId: string, harvestId: string) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('harvest_records')
      .select(`
        *,
        farm:farms!farm_id(name),
        parcel:parcels!parcel_id(name)
      `)
      .eq('id', harvestId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch harvest: ${error.message}`);
    if (!data) throw new NotFoundException('Harvest not found');

    // Resolve crop name (crop_id has no FK constraint)
    let cropName: string | null = null;
    if (data.crop_id) {
      const { data: crop } = await client
        .from('crops')
        .select('name')
        .eq('id', data.crop_id)
        .maybeSingle();
      cropName = crop?.name || null;
    }

    return {
      ...data,
      farm_name: Array.isArray(data.farm) ? data.farm[0]?.name : data.farm?.name,
      parcel_name: Array.isArray(data.parcel) ? data.parcel[0]?.name : data.parcel?.name,
      crop_name: cropName,
      farm: undefined,
      parcel: undefined,
    };
  }

  /**
   * Generate a unique lot number for a harvest record
   * Format: LOT-YYYY-XXXX-P (for partial) or LOT-YYYY-XXXX (for final)
   */
  private async generateLotNumber(
    organizationId: string,
    parcelId: string,
    isPartial: boolean,
    harvestTaskId?: string,
  ): Promise<string> {
    const client = this.databaseService.getAdminClient();
    const year = new Date().getFullYear();
    const prefix = `LOT-${year}-`;

    // Get parcel info for context
    const { data: parcel } = await client
      .from('parcels')
      .select('name, farm_id, farm:farms(name)')
      .eq('id', parcelId)
      .maybeSingle();

    // If this is a partial harvest, check if there's a related task with previous partial harvests
    if (isPartial && harvestTaskId) {
      const { data: previousHarvests } = await client
        .from('harvest_records')
        .select('lot_number')
        .eq('harvest_task_id', harvestTaskId)
        .eq('is_partial', true)
        .eq('organization_id', organizationId)
        .not('lot_number', 'is', null)
        .order('created_at', { ascending: false });

      if (previousHarvests && previousHarvests.length > 0) {
        // Extract the sequence number from the last partial harvest
        const lastLot = previousHarvests[0].lot_number;
        if (lastLot && lastLot.includes('-P')) {
          const match = lastLot.match(/-(\d+)-P$/);
          if (match) {
            const lastNumber = parseInt(match[1], 10);
            return `${prefix}${String(lastNumber + 1).padStart(4, '0')}-P`;
          }
        }
      }
    }

    // Count existing harvests for this organization in this year
    const { count } = await client
      .from('harvest_records')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .like('lot_number', `${prefix}%`);

    const lotNumber = (count || 0) + 1;
    const suffix = isPartial ? '-P' : '';
    return `${prefix}${String(lotNumber).padStart(4, '0')}${suffix}`;
  }

  async create(userId: string, organizationId: string, createHarvestDto: CreateHarvestDto) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    // Generate lot number if not provided
    const isPartial = createHarvestDto.is_partial === true;
    const lotNumber = createHarvestDto.lot_number || 
      await this.generateLotNumber(organizationId, createHarvestDto.parcel_id, isPartial, createHarvestDto.harvest_task_id);

    // Compute estimated_revenue in application layer (no longer a generated column)
    const estimatedRevenue =
      (Number(createHarvestDto.quantity) || 0) *
      (Number(createHarvestDto.expected_price_per_unit) || 0);

    // Pre-validate account mappings if this harvest will generate revenue
    if (estimatedRevenue > 0) {
      const revenueAccountId = await this.accountingAutomationService.resolveAccountId(
        organizationId,
        'revenue_type',
        'harvest',
      );
      const cashAccountId = await this.accountingAutomationService.resolveAccountId(
        organizationId,
        'cash',
        'bank',
      );
      if (!revenueAccountId || !cashAccountId) {
        throw new BadRequestException(
          'Account mappings not configured for revenue_type: harvest. Please configure account mappings before creating harvests.',
        );
      }
    }

    // Create harvest record
    const { data: harvest, error } = await client
      .from('harvest_records')
      .insert({
        ...createHarvestDto,
        organization_id: organizationId,
        lot_number: lotNumber,
        estimated_revenue: Math.round(estimatedRevenue * 100) / 100,
        created_by: userId,
        status: 'stored',
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create harvest: ${error.message}`);

    // Create journal entry for harvest revenue FIRST — if it fails, compensate by deleting the harvest
    // to keep books consistent with record-of-truth. Reception batch + notifications are best-effort
    // (they don't affect GL).
    if (estimatedRevenue > 0) {
      try {
        await this.accountingAutomationService.createJournalEntryFromRevenue(
          organizationId,
          harvest.id,
          'harvest',
          estimatedRevenue,
          new Date(createHarvestDto.harvest_date),
          `Harvest: ${createHarvestDto.crop_id || 'unknown crop'}`,
          userId,
          createHarvestDto.parcel_id,
        );
        this.logger.log(`Journal entry created for harvest ${harvest.id} with revenue ${estimatedRevenue}`);
      } catch (journalError) {
        const err = journalError as Error;
        // Compensating action: delete the harvest so books + harvest table stay consistent
        await client.from('harvest_records').delete().eq('id', harvest.id);
        this.logger.error(
          `Journal entry failed for harvest ${harvest.id}; harvest rolled back: ${err.message}`,
          err.stack,
        );
        throw new BadRequestException(
          `Harvest not created: journal entry failed — ${err.message}`,
        );
      }
    }

    // Automatically create a reception batch for this harvest
    try {
      // Get default warehouse (reception center) for the organization
      const { data: warehouse } = await client
        .from('warehouses')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('is_reception_center', true)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (warehouse) {
        await this.receptionBatchesService.create(userId, organizationId, {
          warehouse_id: warehouse.id,
          harvest_id: harvest.id,
          parcel_id: harvest.parcel_id,
          crop_id: harvest.crop_id || undefined,
          reception_date: harvest.harvest_date,
          weight: Number(harvest.quantity),
          weight_unit: harvest.unit,
          quantity: Number(harvest.quantity),
          quantity_unit: harvest.unit,
          lot_code: lotNumber,
          notes: `Lot de réception généré automatiquement pour la récolte ${lotNumber}${isPartial ? ' (partielle)' : ''}`,
        });

        this.logger.log(`Reception batch created automatically for harvest ${harvest.id} with lot number ${lotNumber}`);
      } else {
        this.logger.warn(`No reception center warehouse found for organization ${organizationId}. Reception batch not created.`);
      }
    } catch (receptionError) {
      const err = receptionError as Error;
      // Log error but don't fail the harvest creation (GL already succeeded; reception batch is ancillary)
      this.logger.error(`Failed to create reception batch for harvest ${harvest.id}: ${err.message}`, err.stack);
    }

    // Track first harvest recorded milestone
    await this.adoptionService.recordMilestone(
      userId,
      MilestoneType.FIRST_HARVEST_RECORDED,
      organizationId,
      {
        harvest_id: harvest.id,
        lot_number: harvest.lot_number,
        quantity: harvest.quantity,
        unit: harvest.unit,
      },
    );

    try {
      const { data: orgUsers } = await client
        .from('organization_users')
        .select('user_id')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      const userIds = (orgUsers || [])
        .map((u: { user_id: string }) => u.user_id)
        .filter((id: string) => id !== userId);

      if (userIds.length > 0) {
        const { data: parcel } = await client
          .from('parcels')
          .select('name')
          .eq('id', harvest.parcel_id)
          .maybeSingle();

        const parcelName = parcel?.name || 'Unknown parcel';

        await this.notificationsService.createNotificationsForUsers(
          userIds,
          organizationId,
          NotificationType.HARVEST_COMPLETED,
          `Harvest recorded: ${harvest.quantity} ${harvest.unit} from ${parcelName}`,
          `Lot ${harvest.lot_number} — ${harvest.quantity} ${harvest.unit} harvested from ${parcelName}`,
          {
            harvestId: harvest.id,
            lotNumber: harvest.lot_number,
            quantity: harvest.quantity,
            unit: harvest.unit,
            parcelId: harvest.parcel_id,
            parcelName,
          },
        );
      }
    } catch (notifError) {
      const err = notifError as Error;
      this.logger.warn(`Failed to send harvest notification: ${err.message}`);
    }

    return harvest;
  }

  async update(userId: string, organizationId: string, harvestId: string, updateHarvestDto: UpdateHarvestDto) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data: current } = await client
      .from('harvest_records')
      .select('id, quantity, expected_price_per_unit, estimated_revenue, parcel_id, harvest_date, crop_id, lot_number')
      .eq('id', harvestId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!current) throw new NotFoundException('Harvest not found');

    // Recompute estimated_revenue if quantity or expected_price_per_unit changed
    const updateData: Record<string, unknown> = { ...updateHarvestDto };
    let newRevenue: number | null = null;
    const oldRevenue = Number(current.estimated_revenue) || 0;

    if (updateHarvestDto.quantity !== undefined || updateHarvestDto.expected_price_per_unit !== undefined) {
      const qty = Number(updateHarvestDto.quantity ?? current.quantity) || 0;
      const price = Number(updateHarvestDto.expected_price_per_unit ?? current.expected_price_per_unit) || 0;
      newRevenue = Math.round(qty * price * 100) / 100;
      updateData.estimated_revenue = newRevenue;
    }

    // If revenue changed and a posted revenue journal entry exists, reverse it and post a new one
    const revenueChanged = newRevenue !== null && Math.abs(newRevenue - oldRevenue) >= 0.01;

    if (revenueChanged) {
      const { data: existingJe } = await client
        .from('journal_entries')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('reference_type', 'revenue')
        .eq('reference_id', harvestId)
        .eq('status', 'posted')
        .maybeSingle();

      if (existingJe?.id) {
        await this.accountingAutomationService.createReversalEntry(
          organizationId,
          existingJe.id,
          userId,
          `Harvest ${current.lot_number} update — revenue changed from ${oldRevenue} to ${newRevenue}`,
        );
      }
    }

    const { data, error } = await client
      .from('harvest_records')
      .update(updateData)
      .eq('id', harvestId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update harvest: ${error.message}`);

    // Post new journal entry for updated revenue (non-zero only)
    if (revenueChanged && newRevenue !== null && newRevenue > 0) {
      try {
        await this.accountingAutomationService.createJournalEntryFromRevenue(
          organizationId,
          harvestId,
          'harvest',
          newRevenue,
          new Date(current.harvest_date),
          `Harvest (updated): ${current.crop_id || 'unknown crop'}`,
          userId,
          current.parcel_id,
        );
        this.logger.log(`Journal entry re-posted for harvest ${harvestId} at new revenue ${newRevenue}`);
      } catch (journalError) {
        const err = journalError as Error;
        this.logger.error(
          `Failed to re-post journal entry for harvest ${harvestId} after update: ${err.message}`,
          err.stack,
        );
        throw new BadRequestException(
          `Harvest updated but new journal entry failed: ${err.message}. Original entry was reversed; please re-post manually.`,
        );
      }
    }

    return data;
  }

  async remove(userId: string, organizationId: string, harvestId: string) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data: existing } = await client
      .from('harvest_records')
      .select('id, lot_number')
      .eq('id', harvestId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!existing) throw new NotFoundException('Harvest not found');

    // If a posted revenue journal entry exists, reverse it before deleting the harvest
    const { data: existingJe } = await client
      .from('journal_entries')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('reference_type', 'revenue')
      .eq('reference_id', harvestId)
      .eq('status', 'posted')
      .maybeSingle();

    if (existingJe?.id) {
      await this.accountingAutomationService.createReversalEntry(
        organizationId,
        existingJe.id,
        userId,
        `Deletion of harvest ${existing.lot_number}`,
      );
    }

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
      const err = journalError as Error;
      // Log the error but don't fail the entire sale
      this.logger.error(`Failed to create journal entry for harvest sale ${harvestId}: ${err.message}`, err.stack);

      // Return success but indicate journal entry issue
      return {
        success: true,
        message: 'Harvest sold successfully but journal entry creation failed',
        data: {
          harvest_id: harvestId,
          invoice_number: invoiceNumber,
          total_revenue: totalRevenue,
          error: err.message,
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
