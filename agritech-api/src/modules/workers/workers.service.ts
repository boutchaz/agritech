import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { DatabaseService } from '../database/database.service';
import { paginate, type PaginatedResponse } from '../../common/dto/paginated-query.dto';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/notification.dto';

export interface WorkerProfile {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  position?: string;
  organization_id: string;
  farm_id?: string;
  is_active: boolean;
  worker_type?: string;
  photo_url?: string;
  hourly_rate?: number;
  daily_rate?: number;
  monthly_salary?: number;
}

@Injectable()
export class WorkersService {
  private readonly logger = new Logger(WorkersService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
  ) {}
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
  async findAll(userId: string, organizationId: string, farmId?: string, page: number = 1, pageSize: number = 50): Promise<PaginatedResponse<any>> {
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    return paginate(client, 'workers', {
      select: '*, organizations!inner(name), farms(name)',
      filters: (q) => {
        q = q.eq('organization_id', organizationId);
        if (farmId) q = q.or(`farm_id.eq.${farmId},farm_id.is.null`);
        return q;
      },
      page,
      pageSize,
      orderBy: 'last_name',
      ascending: true,
      map: (worker) => ({
        ...worker,
        organization_name: Array.isArray(worker.organizations)
          ? worker.organizations[0]?.name
          : worker.organizations?.name,
        farm_name: Array.isArray(worker.farms)
          ? worker.farms[0]?.name
          : worker.farms?.name,
      }),
    });
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
      payment_frequencies: createWorkerDto.payment_frequencies || null,
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
        const workerName = `${worker.first_name || ''} ${worker.last_name || ''}`.trim();
        const farmName = Array.isArray(worker.farms) ? worker.farms[0]?.name : worker.farms?.name;

        await this.notificationsService.createNotificationsForUsers(
          userIds,
          organizationId,
          NotificationType.WORKER_ADDED,
          `New worker added: ${workerName}`,
          `${workerName} has been added${farmName ? ` to ${farmName}` : ''}${worker.position ? ` as ${worker.position}` : ''}`,
          { workerId: worker.id, workerName, farmName, position: worker.position },
        );
      }
    } catch (notifError) {
      this.logger.warn(`Failed to send worker added notification: ${notifError}`);
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
    if ('payment_frequencies' in sanitizedData) sanitizedData.payment_frequencies = sanitizedData.payment_frequencies || null;
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
      .select('amount_paid, payment_status, work_date, task_id, hours_worked')
      .eq('worker_id', workerId);

    const workRecordsPaid = (workRecords || [])
      .filter(r => r.payment_status === 'paid')
      .reduce((sum, r) => sum + (r.amount_paid || 0), 0);

    const workRecordsPending = (workRecords || [])
      .filter(r => r.payment_status === 'pending')
      .reduce((sum, r) => sum + (r.amount_paid || 0), 0);

    // Count distinct work dates as "days worked"
    const distinctDates = new Set((workRecords || []).map(r => r.work_date).filter(Boolean));
    const totalDaysWorked = distinctDates.size;

    // Count distinct completed tasks
    const distinctTasks = new Set((workRecords || []).map(r => r.task_id).filter(Boolean));
    const totalTasksCompleted = distinctTasks.size;

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
      totalDaysWorked,
      totalTasksCompleted,
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
      .select('id, metayage_percentage, metayage_type, calculation_basis')
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
      .select('id, metayage_percentage, metayage_type, calculation_basis')
      .eq('id', workerId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!worker) {
      throw new NotFoundException('Worker not found');
    }

    const metayagePercentage = this.resolveMetayagePercentage(worker);
    const calculationBasis = worker.calculation_basis || 'gross_revenue';
    const baseAmount =
      calculationBasis === 'net_revenue'
        ? grossRevenue - totalCharges
        : grossRevenue;

    if (baseAmount < 0) {
      throw new BadRequestException('Total charges exceed gross revenue');
    }

    const share = baseAmount * (metayagePercentage / 100);
    return { share };
  }

  /**
   * Get current worker's profile (linked to user account)
   */
  async findMyProfile(userId: string): Promise<WorkerProfile> {
    const client = this.databaseService.getAdminClient();

    // First, get the worker record linked to this user
    const { data: worker, error } = await client
      .from('workers')
      .select(`
        *,
        organizations(name),
        farms(name)
      `)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch worker profile: ${error.message}`);
    }

    if (!worker) {
      throw new NotFoundException('Worker profile not found for this user');
    }

    return {
      id: worker.id,
      first_name: worker.first_name,
      last_name: worker.last_name,
      email: worker.email || undefined,
      phone: worker.phone || undefined,
      position: worker.position || undefined,
      organization_id: worker.organization_id,
      farm_id: worker.farm_id || undefined,
      is_active: worker.is_active,
      worker_type: worker.worker_type || undefined,
      photo_url: worker.photo_url || undefined,
      hourly_rate: worker.hourly_rate || undefined,
      daily_rate: worker.daily_rate || undefined,
      monthly_salary: worker.monthly_salary || undefined,
    };
  }

  private resolveMetayagePercentage(worker: {
    metayage_percentage: number | null;
    metayage_type: string | null;
  }): number {
    if (worker.metayage_percentage && worker.metayage_percentage > 0) {
      return worker.metayage_percentage;
    }

    switch (worker.metayage_type) {
      case 'khammass':
        return 20;
      case 'rebaa':
        return 25;
      case 'tholth':
        return 33.33;
      default:
        break;
    }

    throw new BadRequestException('Metayage percentage is not configured');
  }

  /**
   * Get tasks assigned to current worker
   */
  async findMyTasks(userId: string, status?: string, limit?: number) {
    const worker = await this.findMyProfile(userId);
    const client = this.databaseService.getAdminClient();

    let query = client
      .from('tasks')
      .select(`
        *,
        farms(name),
        parcels(name)
      `)
      .eq('assigned_to', worker.id)
      .order('due_date', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data: tasks, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch worker tasks: ${error.message}`);
    }

    return (tasks || []).map(task => ({
      ...task,
      farm_name: task.farms?.name,
      parcel_name: task.parcels?.name,
    }));
  }

  /**
   * Get time logs for current worker
   */
  async findMyTimeLogs(userId: string, startDate?: string, endDate?: string, limit?: number) {
    const worker = await this.findMyProfile(userId);
    const client = this.databaseService.getAdminClient();

    let query = client
      .from('task_time_logs')
      .select(`
        *,
        tasks(id, title),
        workers(first_name, last_name)
      `)
      .eq('worker_id', worker.id)
      .order('clock_in', { ascending: false });

    if (startDate) {
      query = query.gte('clock_in', startDate);
    }

    if (endDate) {
      query = query.lte('clock_in', endDate);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data: timeLogs, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch time logs: ${error.message}`);
    }

    return (timeLogs || []).map(log => ({
      ...log,
      task: log.tasks,
      worker: log.workers,
    }));
  }

  /**
   * Get performance statistics for current worker
   */
  async findMyStatistics(userId: string) {
    const worker = await this.findMyProfile(userId);
    const client = this.databaseService.getAdminClient();

    // Get task statistics
    const { data: tasks } = await client
      .from('tasks')
      .select('status, due_date')
      .eq('assigned_to', worker.id);

    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
    const inProgressTasks = tasks?.filter(t => t.status === 'in_progress').length || 0;
    const pendingTasks = tasks?.filter(t => t.status === 'pending').length || 0;

    // Check for overdue tasks
    const now = new Date().toISOString();
    const overdueTasks = tasks?.filter(t =>
      t.status !== 'completed' &&
      t.due_date &&
      new Date(t.due_date) < new Date(now)
    ).length || 0;

    // Get time log statistics
    const { data: timeLogs } = await client
      .from('task_time_logs')
      .select('duration_minutes, clock_out')
      .eq('worker_id', worker.id)
      .not('clock_out', 'is', null);

    const totalMinutes = timeLogs?.reduce((sum, log) => sum + (log.duration_minutes || 0), 0) || 0;
    const totalHours = Math.round(totalMinutes / 60 * 10) / 10;

    // Get work records stats
    const { data: workRecords } = await client
      .from('work_records')
      .select('amount_paid, payment_status')
      .eq('worker_id', worker.id);

    const totalEarnings = workRecords?.reduce((sum, r) => sum + (r.amount_paid || 0), 0) || 0;
    const pendingPayments = workRecords?.filter(r => r.payment_status === 'pending').length || 0;

    return {
      worker: {
        id: worker.id,
        first_name: worker.first_name,
        last_name: worker.last_name,
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        inProgress: inProgressTasks,
        pending: pendingTasks,
        overdue: overdueTasks,
        completionRate: totalTasks > 0 ? Math.round(completedTasks / totalTasks * 100) : 0,
      },
      time: {
        totalHours,
        totalMinutes,
        totalSessions: timeLogs?.length || 0,
      },
      payments: {
        totalEarnings,
        pendingPayments,
      },
    };
  }

  /**
   * Grant platform access to a worker
   * Creates a Supabase auth user, user profile, and links them to the organization
   */
  async grantPlatformAccess(
    userId: string,
    organizationId: string,
    workerId: string,
    email: string,
    firstName: string,
    lastName: string,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    // Verify worker belongs to organization and doesn't already have a user_id
    const { data: worker } = await client
      .from('workers')
      .select('id, user_id, email')
      .eq('id', workerId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!worker) {
      throw new NotFoundException('Worker not found');
    }

    if (worker.user_id) {
      throw new Error('Worker already has platform access');
    }

    // Generate a random password
    const tempPassword = this.generateRandomPassword();

    // Create Supabase auth user
    const { data: authUser, error: authError } = await client.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
      },
    });

    if (authError || !authUser.user) {
      throw new Error(`Failed to create auth user: ${authError?.message}`);
    }

    const authUserId = authUser.user.id;

    try {
      // Create or update user profile (may already exist via trigger)
      const { error: profileError } = await client
        .from('user_profiles')
        .upsert({
          id: authUserId,
          email,
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`,
          language: 'fr',
          timezone: 'Africa/Casablanca',
          onboarding_completed: true,
          password_set: false,
        }, {
          onConflict: 'id',
        });

      if (profileError) {
        throw new Error(`Failed to create user profile: ${profileError.message}`);
      }

      // Get farm_worker role
      const { data: role } = await client
        .from('roles')
        .select('id')
        .eq('name', 'farm_worker')
        .single();

      if (!role) {
        throw new Error('Farm worker role not found');
      }

      // Add user to organization
      const { error: orgUserError } = await client
        .from('organization_users')
        .insert({
          user_id: authUserId,
          organization_id: organizationId,
          role_id: role.id,
          is_active: true,
        });

      if (orgUserError) {
        throw new Error(`Failed to add user to organization: ${orgUserError.message}`);
      }

      // Update worker with user_id
      const { error: updateError } = await client
        .from('workers')
        .update({ user_id: authUserId })
        .eq('id', workerId);

      if (updateError) {
        throw new Error(`Failed to update worker: ${updateError.message}`);
      }

      // Store temporary password with 7-day expiration
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const { error: passwordUpdateError } = await client
        .from('workers')
        .update({
          temp_password: tempPassword,
          temp_password_expires_at: expiresAt.toISOString(),
        })
        .eq('id', workerId);

      if (passwordUpdateError) {
        this.logger.warn(`Failed to store temp password: ${passwordUpdateError.message}`);
        // Non-fatal - continue anyway
      }

      // Get organization name for email
      const { data: org } = await client
        .from('organizations')
        .select('name')
        .eq('id', organizationId)
        .single();

      const organizationName = org?.name || 'AgriTech';

      // Send welcome email with temporary password
      const emailSent = await this.emailService.sendUserCreatedEmail(
        email,
        firstName,
        lastName,
        tempPassword,
        organizationName,
      );
      if (emailSent) {
        this.logger.log(`Welcome email sent to ${email}`);
      } else {
        this.logger.debug(`Welcome email not sent (email service disabled) to ${email}`);
      }

      return {
        success: true,
        message: `Platform access granted. Temporary password: ${tempPassword}`,
        userId: authUserId,
        tempPassword,
      };
    } catch (error) {
      // Rollback: delete the auth user if anything fails
      await client.auth.admin.deleteUser(authUserId);
      throw error;
    }
  }

  /**
   * Generate a random temporary password
   */
  private generateRandomPassword(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
    * Backfill work record from an existing completed task
    * Directly creates a work record from task details
    */
  async backfillWorkRecordFromTask(
    userId: string,
    organizationId: string,
    taskId: string,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    // Fetch task details
    const { data: task } = await client
      .from('tasks')
      .select('id, status, assigned_to, organization_id, title, task_type, farm_id, parcel_id, start_date, end_date, due_date, created_at')
      .eq('id', taskId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!task) {
      throw new NotFoundException('Task not found in this organization');
    }

    if (task.status !== 'completed') {
      throw new BadRequestException('Task must be completed to create a work record');
    }

    if (!task.assigned_to) {
      throw new BadRequestException('Task must have an assigned worker to create a work record');
    }

    // Fetch worker payment information
    const { data: worker } = await client
      .from('workers')
      .select('id, payment_type, hourly_rate, daily_rate')
      .eq('id', task.assigned_to)
      .maybeSingle();

    if (!worker) {
      throw new NotFoundException('Worker not found');
    }

    // Calculate hours worked
    let hoursWorked = 0;
    if (task.start_date && task.end_date) {
      const startTime = new Date(task.start_date).getTime();
      const endTime = new Date(task.end_date).getTime();
      hoursWorked = (endTime - startTime) / (1000 * 60 * 60);
    }

    // Calculate total payment
    let totalPayment = 0;
    if (worker.payment_type === 'hourly' && worker.hourly_rate && hoursWorked > 0) {
      totalPayment = worker.hourly_rate * hoursWorked;
    }

    // Determine work date
    const workDate = task.due_date || task.end_date || task.created_at || new Date().toISOString().split('T')[0];
    const workDateStr = typeof workDate === 'string' ? workDate.split('T')[0] : new Date(workDate).toISOString().split('T')[0];

    // Create work record
    const { data: workRecord, error } = await client
      .from('work_records')
      .insert({
        farm_id: task.farm_id,
        organization_id: organizationId,
        worker_id: task.assigned_to,
        worker_type: worker.payment_type,
        work_date: workDateStr,
        hours_worked: hoursWorked || 0,
        task_description: task.title || 'Task completed',
        hourly_rate: worker.hourly_rate,
        total_payment: totalPayment || 0,
        payment_status: totalPayment > 0 ? 'pending' : 'not_applicable',
        notes: JSON.stringify({
          task_id: taskId,
          task_title: task.title,
          task_type: task.task_type,
          parcel_id: task.parcel_id,
          completed_at: new Date().toISOString(),
        }),
        created_by: userId,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create work record: ${error.message}`);
    }

    this.logger.log(`Work record backfilled for task ${taskId} via user ${userId}`);

    return {
      success: true,
      workRecordId: workRecord.id,
      message: 'Work record created successfully',
    };
  }
}
