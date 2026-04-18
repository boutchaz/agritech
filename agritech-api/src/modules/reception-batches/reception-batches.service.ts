import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { CreateReceptionBatchDto } from './dto/create-reception-batch.dto';
import { UpdateQualityControlDto } from './dto/update-quality-control.dto';
import { MakeReceptionDecisionDto } from './dto/make-reception-decision.dto';
import { ProcessReceptionPaymentDto } from './dto/process-reception-payment.dto';
import { ReceptionBatchFiltersDto } from './dto/reception-batch-filters.dto';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/notification.dto';

@Injectable()
export class ReceptionBatchesService {
  private readonly logger = new Logger(ReceptionBatchesService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}
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
      .single();

    if (error || !data) {
      throw new NotFoundException('Organization not found or access denied');
    }
  }

  private async generateBatchCode(organizationId: string): Promise<string> {
    const client = this.databaseService.getAdminClient();
    const { count } = await client
      .from('reception_batches')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    const batchNumber = (count || 0) + 1;
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    return `RB-${date}-${String(batchNumber).padStart(4, '0')}`;
  }

  // Step 1: Create initial reception batch
  async create(
    userId: string,
    organizationId: string,
    createDto: CreateReceptionBatchDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const batchCode = await this.generateBatchCode(organizationId);

    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('reception_batches')
      .insert({
        ...createDto,
        organization_id: organizationId,
        batch_code: batchCode,
        status: 'received',
        decision: 'pending',
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to create reception batch: ${error.message}`);
    }

    return data;
  }

  // Step 2: Update quality control information
  async updateQualityControl(
    userId: string,
    organizationId: string,
    batchId: string,
    updateDto: UpdateQualityControlDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    // Verify batch exists and belongs to organization
    const { data: batch } = await client
      .from('reception_batches')
      .select('id, status')
      .eq('id', batchId)
      .eq('organization_id', organizationId)
      .single();

    if (!batch) {
      throw new NotFoundException('Reception batch not found');
    }

    if (batch.status === 'cancelled' || batch.status === 'processed') {
      throw new BadRequestException(
        `Cannot update quality control for ${batch.status} batch`,
      );
    }

    const { data, error } = await client
      .from('reception_batches')
      .update({
        ...updateDto,
        status: 'quality_checked',
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('id', batchId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(
        `Failed to update quality control: ${error.message}`,
      );
    }

    return data;
  }

  // Step 3: Make reception decision
  async makeDecision(
    userId: string,
    organizationId: string,
    batchId: string,
    decisionDto: MakeReceptionDecisionDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    // Verify batch exists and is quality checked
    const { data: batch } = await client
      .from('reception_batches')
      .select('id, status, quality_grade')
      .eq('id', batchId)
      .eq('organization_id', organizationId)
      .single();

    if (!batch) {
      throw new NotFoundException('Reception batch not found');
    }

    if (batch.status !== 'quality_checked' && batch.status !== 'received') {
      throw new BadRequestException(
        'Batch must be quality checked before making decision',
      );
    }

    const { data, error } = await client
      .from('reception_batches')
      .update({
        decision: decisionDto.decision,
        decision_notes: decisionDto.decision_notes,
        decision_date: new Date().toISOString().split('T')[0],
        decision_by: userId,
        destination_warehouse_id: decisionDto.destination_warehouse_id,
        sales_order_id: decisionDto.sales_order_id,
        transformation_order_id: decisionDto.transformation_order_id,
        stock_entry_id: decisionDto.stock_entry_id,
        status: 'decision_made',
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('id', batchId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to make decision: ${error.message}`);
    }

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
        const decisionLabels: Record<string, string> = {
          accepted: 'accepted',
          rejected: 'rejected',
          partial: 'partially accepted',
        };
        const decisionLabel = decisionLabels[decisionDto.decision] || decisionDto.decision;

        await this.notificationsService.createNotificationsForUsers(
          userIds,
          organizationId,
          NotificationType.RECEPTION_BATCH_DECISION,
          `Reception batch ${decisionLabel} (Grade: ${batch.quality_grade || 'N/A'})`,
          `A reception batch has been ${decisionLabel}${decisionDto.decision_notes ? `: ${decisionDto.decision_notes}` : ''}`,
          { batchId, decision: decisionDto.decision, qualityGrade: batch.quality_grade },
        );
      }
    } catch (notifError) {
      this.logger.warn(`Failed to send reception batch notification: ${notifError}`);
    }

    return data;
  }

  // Step 4: Process payment and create journal entry
  async processPayment(
    userId: string,
    organizationId: string,
    batchId: string,
    paymentDto: ProcessReceptionPaymentDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    // Verify batch exists and has decision
    const { data: batch } = await client
      .from('reception_batches')
      .select('id, status, decision, harvest_id, weight, quality_grade')
      .eq('id', batchId)
      .eq('organization_id', organizationId)
      .single();

    if (!batch) {
      throw new NotFoundException('Reception batch not found');
    }

    if (batch.status !== 'decision_made') {
      throw new BadRequestException(
        'Decision must be made before processing payment',
      );
    }

    let paymentRecordId: string | null = null;
    let journalEntryId: string | null = null;

    // Create payment record if requested
    if (paymentDto.create_payment && paymentDto.worker_id) {
      // Get harvest task_id if linked
      let taskIds: string[] = [];
      if (batch.harvest_id) {
        const { data: harvest } = await client
          .from('harvest_records')
          .select('harvest_task_id')
          .eq('id', batch.harvest_id)
          .single();

        if (harvest?.harvest_task_id) {
          taskIds = [harvest.harvest_task_id];
        }
      }

      // Calculate net amount
      const netAmount = paymentDto.amount ||
        (paymentDto.units_completed && paymentDto.rate_per_unit
          ? paymentDto.units_completed * paymentDto.rate_per_unit
          : 0);

      const { data: paymentRecord, error: paymentError } = await client
        .from('payment_records')
        .insert({
          organization_id: organizationId,
          worker_id: paymentDto.worker_id,
          payment_type: paymentDto.payment_type || 'per_unit',
          base_amount: netAmount,
          net_amount: netAmount,
          hours_worked: paymentDto.hours_worked,
          tasks_completed: taskIds.length,
          tasks_completed_ids: taskIds,
          status: 'approved',
          payment_method: paymentDto.payment_method,
          payment_date: new Date().toISOString().split('T')[0],
          notes: paymentDto.notes || `Payment for reception batch ${batchId}`,
          calculated_by: userId,
          calculated_at: new Date().toISOString(),
          approved_by: userId,
          approved_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (paymentError) {
        throw new BadRequestException(
          `Failed to create payment record: ${paymentError.message}`,
        );
      }

      paymentRecordId = paymentRecord.id;
    }

    // Create journal entry if requested
    if (paymentDto.create_journal_entry && paymentDto.debit_account_id && paymentDto.credit_account_id) {
      const amount = paymentDto.amount || 0;

      // Generate journal entry number
      const { count } = await client
        .from('journal_entries')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      const entryNumber = `JE-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String((count || 0) + 1).padStart(4, '0')}`;

      // Create journal entry
      const { data: journalEntry, error: journalError } = await client
        .from('journal_entries')
        .insert({
          organization_id: organizationId,
          entry_number: entryNumber,
          entry_date: new Date().toISOString().split('T')[0],
          reference_type: 'reception_batch',
          reference_id: batchId,
          remarks: paymentDto.journal_description || `Payment for reception batch ${batchId}`,
          status: 'posted',
          total_debit: amount,
          total_credit: amount,
          created_by: userId,
          posted_by: userId,
          posted_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (journalError) {
        throw new BadRequestException(
          `Failed to create journal entry: ${journalError.message}`,
        );
      }

      journalEntryId = journalEntry.id;

      // Create journal items (debit and credit)
      const journalItems = [
        {
          journal_entry_id: journalEntryId,
          account_id: paymentDto.debit_account_id,
          description: `Harvest labor expense - ${batchId}`,
          debit: amount,
          credit: 0,
          reference_type: 'reception_batch',
          reference_id: batchId,
        },
        {
          journal_entry_id: journalEntryId,
          account_id: paymentDto.credit_account_id,
          description: `Payment for harvest - ${batchId}`,
          debit: 0,
          credit: amount,
          reference_type: 'reception_batch',
          reference_id: batchId,
        },
      ];

      const { error: itemsError } = await client
        .from('journal_items')
        .insert(journalItems);

      if (itemsError) {
        throw new BadRequestException(
          `Failed to create journal items: ${itemsError.message}`,
        );
      }
    }

    // Update batch status to processed
    const { data, error } = await client
      .from('reception_batches')
      .update({
        status: 'processed',
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('id', batchId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(
        `Failed to update batch status: ${error.message}`,
      );
    }

    return {
      batch: data,
      payment_record_id: paymentRecordId,
      journal_entry_id: journalEntryId,
    };
  }

  // Get all batches with filters
  async findAll(
    userId: string,
    organizationId: string,
    filters?: ReceptionBatchFiltersDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    let query = client
      .from('reception_batches')
      .select(`
        *,
        warehouse:warehouses!warehouse_id(id, name),
        parcel:parcels!parcel_id(id, name, farm:farms!farm_id(id, name)),
        crop:crops!crop_id(id, name),
        harvest:harvest_records!harvest_id(id, harvest_date, quantity),
        receiver:workers!received_by(id, first_name, last_name),
        quality_checker:workers!quality_checked_by(id, first_name, last_name)
      `)
      .eq('organization_id', organizationId);

    if (filters?.warehouse_id) {
      query = query.eq('warehouse_id', filters.warehouse_id);
    }

    if (filters?.parcel_id) {
      query = query.eq('parcel_id', filters.parcel_id);
    }

    if (filters?.crop_id) {
      query = query.eq('crop_id', filters.crop_id);
    }

    if (filters?.harvest_id) {
      query = query.eq('harvest_id', filters.harvest_id);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.decision) {
      query = query.eq('decision', filters.decision);
    }

    if (filters?.quality_grade) {
      query = query.eq('quality_grade', filters.quality_grade);
    }

    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.or(
        `batch_code.ilike.${searchTerm},producer_name.ilike.${searchTerm},notes.ilike.${searchTerm}`,
      );
    }

    const dateFrom = filters?.date_from || filters?.dateFrom;
    const dateTo = filters?.date_to || filters?.dateTo;

    if (dateFrom) {
      query = query.gte('reception_date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('reception_date', dateTo);
    }

    // Handle sorting
    const sortBy = filters?.sortBy || 'reception_date';
    const sortDir = filters?.sortDir || 'desc';
    query = query.order(sortBy, { ascending: sortDir === 'asc' });

    // Handle pagination
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 10;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Get total count first
    const countQuery = client
      .from('reception_batches')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    // Apply same filters to count query
    if (filters?.warehouse_id) countQuery.eq('warehouse_id', filters.warehouse_id);
    if (filters?.parcel_id) countQuery.eq('parcel_id', filters.parcel_id);
    if (filters?.crop_id) countQuery.eq('crop_id', filters.crop_id);
    if (filters?.harvest_id) countQuery.eq('harvest_id', filters.harvest_id);
    if (filters?.status) countQuery.eq('status', filters.status);
    if (filters?.decision) countQuery.eq('decision', filters.decision);
    if (filters?.quality_grade) countQuery.eq('quality_grade', filters.quality_grade);
    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      countQuery.or(
        `batch_code.ilike.${searchTerm},producer_name.ilike.${searchTerm},notes.ilike.${searchTerm}`,
      );
    }
    if (dateFrom) countQuery.gte('reception_date', dateFrom);
    if (dateTo) countQuery.lte('reception_date', dateTo);

    const { count } = await countQuery;

    // Apply pagination
    query = query.range(from, to);

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch reception batches: ${error.message}`);
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  }

  // Get single batch
  async findOne(userId: string, organizationId: string, batchId: string) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('reception_batches')
      .select(`
        *,
        warehouse:warehouses!warehouse_id(id, name),
        parcel:parcels!parcel_id(id, name, farm:farms!farm_id(id, name)),
        crop:crops!crop_id(id, name),
        harvest:harvest_records!harvest_id(id, harvest_date, quantity, harvest_task_id),
        receiver:workers!received_by(id, first_name, last_name),
        quality_checker:workers!quality_checked_by(id, first_name, last_name),
        destination_warehouse:warehouses!destination_warehouse_id(id, name)
      `)
      .eq('id', batchId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Reception batch not found');
    }

    return data;
  }

  async update(
    userId: string,
    organizationId: string,
    batchId: string,
    updateDto: Partial<CreateReceptionBatchDto>,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data: batch } = await client
      .from('reception_batches')
      .select('id, status')
      .eq('id', batchId)
      .eq('organization_id', organizationId)
      .single();

    if (!batch) {
      throw new NotFoundException('Reception batch not found');
    }

    if (batch.status === 'cancelled' || batch.status === 'processed') {
      throw new BadRequestException(
        `Cannot update ${batch.status} batch`,
      );
    }

    const { data, error } = await client
      .from('reception_batches')
      .update({
        ...updateDto,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('id', batchId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to update batch: ${error.message}`);
    }

    return data;
  }

  async cancel(userId: string, organizationId: string, batchId: string) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data: batch } = await client
      .from('reception_batches')
      .select('status')
      .eq('id', batchId)
      .eq('organization_id', organizationId)
      .single();

    if (!batch) {
      throw new NotFoundException('Reception batch not found');
    }

    if (batch.status === 'processed') {
      throw new BadRequestException('Cannot cancel processed batch');
    }

    const { data, error } = await client
      .from('reception_batches')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('id', batchId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to cancel batch: ${error.message}`);
    }

    return data;
  }
}
