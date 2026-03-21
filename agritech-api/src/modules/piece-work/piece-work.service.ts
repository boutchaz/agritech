import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreatePieceWorkDto, UpdatePieceWorkDto, PieceWorkFiltersDto } from './dto';

@Injectable()
export class PieceWorkService {
  private readonly logger = new Logger(PieceWorkService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Get all piece work records with optional filters
   */
  async findAll(organizationId: string, farmId: string, filters?: PieceWorkFiltersDto): Promise<any> {
    const client = this.databaseService.getAdminClient();

    try {
      let query = client
        .from('piece_work_records')
        .select(`
          *,
          worker:workers!inner(id, first_name, last_name),
          work_unit:work_units!inner(id, name, code),
          task:tasks(id, title),
          parcel:parcels(id, name)
        `)
        .eq('organization_id', organizationId)
        .eq('farm_id', farmId);

      // Apply filters
      if (filters?.worker_id) {
        query = query.eq('worker_id', filters.worker_id);
      }

      if (filters?.task_id) {
        query = query.eq('task_id', filters.task_id);
      }

      if (filters?.parcel_id) {
        query = query.eq('parcel_id', filters.parcel_id);
      }

      if (filters?.start_date) {
        query = query.gte('work_date', filters.start_date);
      }

      if (filters?.end_date) {
        query = query.lte('work_date', filters.end_date);
      }

      if (filters?.payment_status) {
        query = query.eq('payment_status', filters.payment_status);
      }

      if (filters?.search) {
        query = query.ilike('notes', `%${filters.search}%`);
      }

      // Default ordering: most recent first
      query = query.order('work_date', { ascending: false });

      const { data, error } = await query;

      if (error) {
        this.logger.error(`Failed to fetch piece work records: ${error.message}`);
        throw new BadRequestException(`Failed to fetch piece work records: ${error.message}`);
      }

      return data;
    } catch (error) {
      this.logger.error('Error fetching piece work records:', error);
      throw error;
    }
  }

  /**
   * Get a single piece work record by ID
   */
  async findOne(id: string, organizationId: string): Promise<any> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('piece_work_records')
      .select(`
        *,
        worker:workers!inner(id, first_name, last_name),
        work_unit:work_units!inner(id, name, code),
        task:tasks(id, title),
        parcel:parcels(id, name)
      `)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to fetch piece work record: ${error.message}`);
      throw new BadRequestException(`Failed to fetch piece work record: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Piece work record not found');
    }

    return data;
  }

  /**
   * Create a new piece work record
   */
  async create(dto: CreatePieceWorkDto, organizationId: string, farmId: string, createdBy: string): Promise<any> {
    const client = this.databaseService.getAdminClient();

    try {
      // Calculate total amount
      const totalAmount = dto.units_completed * dto.rate_per_unit;

      const insertData = {
        organization_id: organizationId,
        farm_id: farmId,
        worker_id: dto.worker_id,
        work_date: dto.work_date,
        task_id: dto.task_id || null,
        parcel_id: dto.parcel_id || null,
        work_unit_id: dto.work_unit_id,
        units_completed: dto.units_completed,
        rate_per_unit: dto.rate_per_unit,
        total_amount: totalAmount,
        quality_rating: dto.quality_rating || null,
        start_time: dto.start_time || null,
        end_time: dto.end_time || null,
        break_duration: dto.break_duration || 0,
        notes: dto.notes || null,
        payment_status: 'pending',
        created_by: createdBy,
      };

      const { data, error } = await client
        .from('piece_work_records')
        .insert(insertData)
        .select(`
          *,
          worker:workers!inner(id, first_name, last_name),
          work_unit:work_units!inner(id, name, code),
          task:tasks(id, title),
          parcel:parcels(id, name)
        `)
        .single();

      if (error) {
        this.logger.error(`Failed to create piece work record: ${error.message}`);
        throw new BadRequestException(`Failed to create piece work record: ${error.message}`);
      }

      const { data: workUnit, error: workUnitError } = await client
        .from('work_units')
        .select('usage_count')
        .eq('id', dto.work_unit_id)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (workUnitError) {
        this.logger.warn(`Failed to fetch work unit usage count: ${workUnitError.message}`);
      } else if (workUnit) {
        const nextCount = (workUnit.usage_count ?? 0) + 1;
        const { error: updateError } = await client
          .from('work_units')
          .update({ usage_count: nextCount })
          .eq('id', dto.work_unit_id)
          .eq('organization_id', organizationId);

        if (updateError) {
          this.logger.warn(`Failed to increment work unit usage count: ${updateError.message}`);
        }
      }

      return data;
    } catch (error) {
      this.logger.error('Error creating piece work record:', error);
      throw error;
    }
  }

  /**
   * Update a piece work record
   */
  async update(id: string, organizationId: string, dto: UpdatePieceWorkDto): Promise<any> {
    const client = this.databaseService.getAdminClient();

    // Verify record exists
    await this.findOne(id, organizationId);

    try {
      const updateData: any = { ...dto };

      // Recalculate total amount if units or rate changed
      if (dto.units_completed || dto.rate_per_unit) {
        const record = await this.findOne(id, organizationId);
        const unitsCompleted = dto.units_completed ?? record.units_completed;
        const ratePerUnit = dto.rate_per_unit ?? record.rate_per_unit;
        updateData.total_amount = unitsCompleted * ratePerUnit;
      }

      const { data, error } = await client
        .from('piece_work_records')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select(`
          *,
          worker:workers!inner(id, first_name, last_name),
          work_unit:work_units!inner(id, name, code),
          task:tasks(id, title),
          parcel:parcels(id, name)
        `)
        .single();

      if (error) {
        this.logger.error(`Failed to update piece work record: ${error.message}`);
        throw new BadRequestException(`Failed to update piece work record: ${error.message}`);
      }

      return data;
    } catch (error) {
      this.logger.error('Error updating piece work record:', error);
      throw error;
    }
  }

  /**
   * Delete a piece work record
   */
  async delete(id: string, organizationId: string): Promise<any> {
    const client = this.databaseService.getAdminClient();

    // Verify record exists
    const record = await this.findOne(id, organizationId);

    // Check if already paid
    if (record.payment_status === 'paid') {
      throw new BadRequestException('Cannot delete a piece work record that has been paid');
    }

    const { error } = await client
      .from('piece_work_records')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to delete piece work record: ${error.message}`);
      throw new BadRequestException(`Failed to delete piece work record: ${error.message}`);
    }

    return { message: 'Piece work record deleted successfully' };
  }

  /**
   * Verify a piece work record
   */
  async verify(id: string, organizationId: string, verifiedBy: string): Promise<any> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('piece_work_records')
      .update({
        verified_by: verifiedBy,
        verified_at: new Date().toISOString(),
        payment_status: 'approved',
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select(`
        *,
        worker:workers!inner(id, first_name, last_name),
        work_unit:work_units!inner(id, name, code),
        task:tasks(id, title),
        parcel:parcels(id, name)
      `)
      .single();

    if (error) {
      this.logger.error(`Failed to verify piece work record: ${error.message}`);
      throw new BadRequestException(`Failed to verify piece work record: ${error.message}`);
    }

    return data;
  }

  /**
   * Generate a payment record for an approved piece-work record
   */
  async generatePayment(organizationId: string, farmId: string, pieceWorkId: string): Promise<any> {
    const client = this.databaseService.getAdminClient();

    // Find the piece-work record
    const record = await this.findOne(pieceWorkId, organizationId);

    // Validate status
    if (record.payment_status !== 'approved') {
      throw new BadRequestException(
        `Piece work record must be in 'approved' status to generate payment. Current status: ${record.payment_status}`,
      );
    }

    try {
      // Create payment record
      const { data: paymentRecord, error: paymentError } = await client
        .from('payment_records')
        .insert({
          organization_id: organizationId,
          farm_id: farmId,
          worker_id: record.worker_id,
          payment_type: 'piece_work',
          base_amount: record.total_amount,
          net_amount: record.total_amount,
          status: 'pending',
          period_start: record.work_date,
          period_end: record.work_date,
        })
        .select()
        .single();

      if (paymentError) {
        this.logger.error(`Failed to create payment record: ${paymentError.message}`);
        throw new BadRequestException(`Failed to create payment record: ${paymentError.message}`);
      }

      // Update piece-work record payment status
      const { error: updateError } = await client
        .from('piece_work_records')
        .update({ payment_status: 'paid' })
        .eq('id', pieceWorkId)
        .eq('organization_id', organizationId);

      if (updateError) {
        this.logger.error(`Failed to update piece work payment status: ${updateError.message}`);
        throw new BadRequestException(`Failed to update piece work payment status: ${updateError.message}`);
      }

      return paymentRecord;
    } catch (error) {
      this.logger.error('Error generating payment:', error);
      throw error;
    }
  }

  /**
   * Bulk generate payments for multiple approved piece-work records
   */
  async bulkGeneratePayments(organizationId: string, farmId: string, ids: string[]): Promise<any[]> {
    const results: any[] = [];

    for (const id of ids) {
      try {
        const paymentRecord = await this.generatePayment(organizationId, farmId, id);
        results.push({ id, success: true, paymentRecord });
      } catch (error) {
        results.push({ id, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Bulk verify multiple piece-work records
   */
  async bulkVerify(organizationId: string, farmId: string, ids: string[], verifiedBy: string): Promise<{ count: number }> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('piece_work_records')
      .update({
        payment_status: 'approved',
        verified_at: new Date().toISOString(),
        verified_by: verifiedBy,
      })
      .eq('organization_id', organizationId)
      .eq('farm_id', farmId)
      .in('id', ids)
      .select('id');

    if (error) {
      this.logger.error(`Failed to bulk verify piece work records: ${error.message}`);
      throw new BadRequestException(`Failed to bulk verify piece work records: ${error.message}`);
    }

    return { count: data?.length || 0 };
  }
}
