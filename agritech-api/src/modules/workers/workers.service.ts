import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class WorkersService {
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
   * Get all workers for an organization
   */
  async findAll(userId: string, organizationId: string, farmId?: string) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    let query = client
      .from('workers')
      .select(`
        *,
        organizations!inner(name),
        farms(name)
      `)
      .eq('organization_id', organizationId)
      .order('last_name', { ascending: true });

    if (farmId) {
      query = query.eq('farm_id', farmId);
    }

    const { data: workers, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch workers: ${error.message}`);
    }

    return (workers || []).map(worker => ({
      ...worker,
      organization_name: Array.isArray(worker.organizations)
        ? worker.organizations[0]?.name
        : worker.organizations?.name,
      farm_name: Array.isArray(worker.farms)
        ? worker.farms[0]?.name
        : worker.farms?.name,
    }));
  }

  /**
   * Get active workers for an organization
   */
  async findActive(userId: string, organizationId: string) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data: workers, error } = await client
      .from('workers')
      .select(`
        *,
        organizations!inner(name),
        farms(name)
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('last_name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch active workers: ${error.message}`);
    }

    return (workers || []).map(worker => ({
      ...worker,
      organization_name: Array.isArray(worker.organizations)
        ? worker.organizations[0]?.name
        : worker.organizations?.name,
      farm_name: Array.isArray(worker.farms)
        ? worker.farms[0]?.name
        : worker.farms?.name,
    }));
  }

  /**
   * Get a single worker by ID
   */
  async findOne(userId: string, organizationId: string, workerId: string) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data: worker, error } = await client
      .from('workers')
      .select(`
        *,
        organizations(name),
        farms(name)
      `)
      .eq('id', workerId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch worker: ${error.message}`);
    }

    if (!worker) {
      throw new NotFoundException('Worker not found');
    }

    return {
      ...worker,
      organization_name: Array.isArray(worker.organizations)
        ? worker.organizations[0]?.name
        : worker.organizations?.name,
      farm_name: Array.isArray(worker.farms)
        ? worker.farms[0]?.name
        : worker.farms?.name,
    };
  }

  /**
   * Create a new worker
   */
  async create(userId: string, organizationId: string, createWorkerDto: CreateWorkerDto) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    // Sanitize data: convert empty strings to null
    const sanitizedData = {
      ...createWorkerDto,
      organization_id: organizationId,
      created_by: userId,
      farm_id: createWorkerDto.farm_id || null,
      email: createWorkerDto.email || null,
      cin: createWorkerDto.cin || null,
      phone: createWorkerDto.phone || null,
      address: createWorkerDto.address || null,
      date_of_birth: createWorkerDto.date_of_birth || null,
      position: createWorkerDto.position || null,
      cnss_number: createWorkerDto.cnss_number || null,
      bank_account: createWorkerDto.bank_account || null,
      payment_method: createWorkerDto.payment_method || null,
      notes: createWorkerDto.notes || null,
      monthly_salary: createWorkerDto.monthly_salary || null,
      daily_rate: createWorkerDto.daily_rate || null,
      metayage_type: createWorkerDto.metayage_type || null,
      metayage_percentage: createWorkerDto.metayage_percentage || null,
      calculation_basis: createWorkerDto.calculation_basis || null,
      payment_frequency: createWorkerDto.payment_frequency || null,
      metayage_contract_details: createWorkerDto.metayage_contract_details || null,
      specialties: createWorkerDto.specialties || null,
      certifications: createWorkerDto.certifications || null,
    };

    const { data: worker, error } = await client
      .from('workers')
      .insert(sanitizedData)
      .select(`
        *,
        organizations(name),
        farms(name)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create worker: ${error.message}`);
    }

    return {
      ...worker,
      organization_name: Array.isArray(worker.organizations)
        ? worker.organizations[0]?.name
        : worker.organizations?.name,
      farm_name: Array.isArray(worker.farms)
        ? worker.farms[0]?.name
        : worker.farms?.name,
    };
  }

  /**
   * Update a worker
   */
  async update(userId: string, organizationId: string, workerId: string, updateWorkerDto: UpdateWorkerDto) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    // Verify worker belongs to organization
    const { data: existingWorker } = await client
      .from('workers')
      .select('id')
      .eq('id', workerId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!existingWorker) {
      throw new NotFoundException('Worker not found');
    }

    // Sanitize data: convert empty strings to null
    const sanitizedData: any = { ...updateWorkerDto };

    if ('farm_id' in sanitizedData) sanitizedData.farm_id = sanitizedData.farm_id || null;
    if ('email' in sanitizedData) sanitizedData.email = sanitizedData.email || null;
    if ('cin' in sanitizedData) sanitizedData.cin = sanitizedData.cin || null;
    if ('phone' in sanitizedData) sanitizedData.phone = sanitizedData.phone || null;
    if ('address' in sanitizedData) sanitizedData.address = sanitizedData.address || null;
    if ('date_of_birth' in sanitizedData) sanitizedData.date_of_birth = sanitizedData.date_of_birth || null;
    if ('position' in sanitizedData) sanitizedData.position = sanitizedData.position || null;
    if ('cnss_number' in sanitizedData) sanitizedData.cnss_number = sanitizedData.cnss_number || null;
    if ('bank_account' in sanitizedData) sanitizedData.bank_account = sanitizedData.bank_account || null;
    if ('payment_method' in sanitizedData) sanitizedData.payment_method = sanitizedData.payment_method || null;
    if ('notes' in sanitizedData) sanitizedData.notes = sanitizedData.notes || null;
    if ('monthly_salary' in sanitizedData) sanitizedData.monthly_salary = sanitizedData.monthly_salary || null;
    if ('daily_rate' in sanitizedData) sanitizedData.daily_rate = sanitizedData.daily_rate || null;
    if ('metayage_type' in sanitizedData) sanitizedData.metayage_type = sanitizedData.metayage_type || null;
    if ('metayage_percentage' in sanitizedData) sanitizedData.metayage_percentage = sanitizedData.metayage_percentage || null;
    if ('calculation_basis' in sanitizedData) sanitizedData.calculation_basis = sanitizedData.calculation_basis || null;
    if ('payment_frequency' in sanitizedData) sanitizedData.payment_frequency = sanitizedData.payment_frequency || null;
    if ('metayage_contract_details' in sanitizedData) sanitizedData.metayage_contract_details = sanitizedData.metayage_contract_details || null;
    if ('specialties' in sanitizedData) sanitizedData.specialties = sanitizedData.specialties || null;
    if ('certifications' in sanitizedData) sanitizedData.certifications = sanitizedData.certifications || null;

    const { data: worker, error } = await client
      .from('workers')
      .update(sanitizedData)
      .eq('id', workerId)
      .select(`
        *,
        organizations(name),
        farms(name)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update worker: ${error.message}`);
    }

    return {
      ...worker,
      organization_name: Array.isArray(worker.organizations)
        ? worker.organizations[0]?.name
        : worker.organizations?.name,
      farm_name: Array.isArray(worker.farms)
        ? worker.farms[0]?.name
        : worker.farms?.name,
    };
  }

  /**
   * Deactivate a worker (soft delete)
   */
  async deactivate(userId: string, organizationId: string, workerId: string, endDate?: string) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    // Verify worker belongs to organization
    const { data: existingWorker } = await client
      .from('workers')
      .select('id')
      .eq('id', workerId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!existingWorker) {
      throw new NotFoundException('Worker not found');
    }

    const { data: worker, error } = await client
      .from('workers')
      .update({
        is_active: false,
        end_date: endDate || new Date().toISOString().split('T')[0],
      })
      .eq('id', workerId)
      .select(`
        *,
        organizations(name),
        farms(name)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to deactivate worker: ${error.message}`);
    }

    return {
      ...worker,
      organization_name: Array.isArray(worker.organizations)
        ? worker.organizations[0]?.name
        : worker.organizations?.name,
      farm_name: Array.isArray(worker.farms)
        ? worker.farms[0]?.name
        : worker.farms?.name,
    };
  }

  /**
   * Delete a worker (hard delete)
   */
  async remove(userId: string, organizationId: string, workerId: string) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    // Verify worker belongs to organization
    const { data: existingWorker } = await client
      .from('workers')
      .select('id')
      .eq('id', workerId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!existingWorker) {
      throw new NotFoundException('Worker not found');
    }

    const { error } = await client
      .from('workers')
      .delete()
      .eq('id', workerId);

    if (error) {
      throw new Error(`Failed to delete worker: ${error.message}`);
    }

    return { message: 'Worker deleted successfully' };
  }

  /**
   * Get worker statistics
   */
  async getStats(userId: string, organizationId: string, workerId: string) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    
    const { data: worker } = await client
      .from('workers')
      .select('*')
      .eq('id', workerId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!worker) {
      throw new NotFoundException('Worker not found');
    }

    const { data: workRecords } = await client
      .from('work_records')
      .select('amount_paid, payment_status')
      .eq('worker_id', workerId);

    const workRecordsPaid = (workRecords || [])
      .filter(r => r.payment_status === 'paid')
      .reduce((sum, r) => sum + (r.amount_paid || 0), 0);

    const workRecordsPending = (workRecords || [])
      .filter(r => r.payment_status === 'pending')
      .reduce((sum, r) => sum + (r.amount_paid || 0), 0);

    const { data: paymentRecords } = await client
      .from('payment_records')
      .select('net_amount, base_amount, status')
      .eq('worker_id', workerId);

    const paymentsPaid = (paymentRecords || [])
      .filter(r => r.status === 'paid')
      .reduce((sum, r) => sum + (r.net_amount || r.base_amount || 0), 0);

    const paymentsPending = (paymentRecords || [])
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + (r.net_amount || r.base_amount || 0), 0);

    let metayageTotal = 0;
    if (worker.worker_type === 'metayage') {
      const { data: settlements } = await client
        .from('metayage_settlements')
        .select('worker_share_amount, payment_status')
        .eq('worker_id', workerId);

      if (settlements) {
        metayageTotal = settlements
          .filter(s => s.payment_status === 'paid')
          .reduce((sum, s) => sum + s.worker_share_amount, 0);
      }
    }

    return {
      worker,
      totalWorkRecords: workRecords?.length || 0,
      totalPaid: workRecordsPaid + paymentsPaid + metayageTotal,
      pendingPayments: workRecordsPending + paymentsPending,
      totalDaysWorked: worker.total_days_worked || 0,
      totalTasksCompleted: worker.total_tasks_completed || 0,
    };
  }

  /**
   * Get work records for a worker
   */
  async getWorkRecords(
    userId: string,
    organizationId: string,
    workerId: string,
    startDate?: string,
    endDate?: string,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    // Verify worker belongs to organization
    const client = this.databaseService.getAdminClient();
    const { data: worker } = await client
      .from('workers')
      .select('id')
      .eq('id', workerId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!worker) {
      throw new NotFoundException('Worker not found');
    }

    let query = client
      .from('work_records')
      .select(`
        *,
        workers!inner(first_name, last_name),
        farms(name)
      `)
      .eq('worker_id', workerId)
      .order('work_date', { ascending: false });

    if (startDate) {
      query = query.gte('work_date', startDate);
    }
    if (endDate) {
      query = query.lte('work_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch work records: ${error.message}`);
    }

    return (data || []).map(record => ({
      ...record,
      worker: record.workers,
      farm_name: record.farms?.name,
    }));
  }

  /**
   * Create a work record
   */
  async createWorkRecord(
    userId: string,
    organizationId: string,
    workerId: string,
    data: any,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    // Verify worker belongs to organization
    const client = this.databaseService.getAdminClient();
    const { data: worker } = await client
      .from('workers')
      .select('id')
      .eq('id', workerId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!worker) {
      throw new NotFoundException('Worker not found');
    }

    const { data: record, error } = await client
      .from('work_records')
      .insert({
        ...data,
        worker_id: workerId,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create work record: ${error.message}`);
    }

    return record;
  }

  /**
   * Update a work record
   */
  async updateWorkRecord(
    userId: string,
    organizationId: string,
    workerId: string,
    recordId: string,
    data: any,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    // Verify worker belongs to organization
    const client = this.databaseService.getAdminClient();
    const { data: worker } = await client
      .from('workers')
      .select('id')
      .eq('id', workerId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!worker) {
      throw new NotFoundException('Worker not found');
    }

    const { data: record, error } = await client
      .from('work_records')
      .update(data)
      .eq('id', recordId)
      .eq('worker_id', workerId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update work record: ${error.message}`);
    }

    return record;
  }

  /**
   * Get métayage settlements for a worker
   */
  async getMetayageSettlements(
    userId: string,
    organizationId: string,
    workerId: string,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    // Verify worker belongs to organization
    const client = this.databaseService.getAdminClient();
    const { data: worker } = await client
      .from('workers')
      .select('id')
      .eq('id', workerId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!worker) {
      throw new NotFoundException('Worker not found');
    }

    const { data, error } = await client
      .from('metayage_settlements')
      .select(`
        *,
        workers!inner(first_name, last_name, metayage_type),
        farms(name),
        parcels(name)
      `)
      .eq('worker_id', workerId)
      .order('period_start', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch métayage settlements: ${error.message}`);
    }

    return (data || []).map(settlement => ({
      ...settlement,
      worker: settlement.workers,
      farm_name: settlement.farms?.name,
      parcel_name: settlement.parcels?.name,
    }));
  }

  /**
   * Create a métayage settlement
   */
  async createMetayageSettlement(
    userId: string,
    organizationId: string,
    workerId: string,
    data: any,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    // Verify worker belongs to organization
    const client = this.databaseService.getAdminClient();
    const { data: worker } = await client
      .from('workers')
      .select('id')
      .eq('id', workerId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!worker) {
      throw new NotFoundException('Worker not found');
    }

    const { data: settlement, error } = await client
      .from('metayage_settlements')
      .insert({
        ...data,
        worker_id: workerId,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create métayage settlement: ${error.message}`);
    }

    return settlement;
  }

  /**
   * Calculate métayage share
   */
  async calculateMetayageShare(
    userId: string,
    organizationId: string,
    workerId: string,
    grossRevenue: number,
    totalCharges: number = 0,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    // Verify worker belongs to organization
    const client = this.databaseService.getAdminClient();
    const { data: worker } = await client
      .from('workers')
      .select('id')
      .eq('id', workerId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!worker) {
      throw new NotFoundException('Worker not found');
    }

    const { data, error } = await client.rpc('calculate_metayage_share', {
      p_worker_id: workerId,
      p_gross_revenue: grossRevenue,
      p_total_charges: totalCharges,
    });

    if (error) {
      throw new Error(`Failed to calculate métayage share: ${error.message}`);
    }

    return { share: data };
  }
}
