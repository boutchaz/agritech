import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class PaymentRecordsService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Verify user has access to organization
   */
  private async verifyOrganizationAccess(userId: string, organizationId: string): Promise<void> {
    const client = this.databaseService.getAdminClient();

    const { data: membership, error } = await client
      .from('organization_users')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !membership) {
      throw new BadRequestException('User does not have access to this organization');
    }
  }

  /**
   * Get all payment records for an organization with optional filters
   */
  async getAll(organizationId: string, filters?: {
    status?: string; // comma-separated
    payment_type?: string; // comma-separated
    worker_id?: string;
    farm_id?: string;
    period_start?: string;
    period_end?: string;
  }) {
    const client = this.databaseService.getAdminClient();

    let query = client
      .from('payment_summary')
      .select('*')
      .eq('organization_id', organizationId);

    if (filters?.status) {
      const statuses = filters.status.split(',');
      query = query.in('status', statuses);
    }

    if (filters?.payment_type) {
      const types = filters.payment_type.split(',');
      query = query.in('payment_type', types);
    }

    if (filters?.worker_id) {
      query = query.eq('worker_id', filters.worker_id);
    }

    if (filters?.farm_id) {
      query = query.eq('farm_id', filters.farm_id);
    }

    if (filters?.period_start) {
      query = query.gte('period_start', filters.period_start);
    }

    if (filters?.period_end) {
      query = query.lte('period_end', filters.period_end);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch payment records: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get a single payment record by ID with deductions and bonuses
   */
  async getById(organizationId: string, paymentId: string) {
    const client = this.databaseService.getAdminClient();

    // Get payment record
    const { data: payment, error: paymentError } = await client
      .from('payment_summary')
      .select('*')
      .eq('id', paymentId)
      .eq('organization_id', organizationId)
      .single();

    if (paymentError || !payment) {
      throw new NotFoundException(`Payment record not found`);
    }

    // Get deductions and bonuses
    const [deductionsResult, bonusesResult] = await Promise.all([
      client.from('payment_deductions').select('*').eq('payment_record_id', paymentId),
      client.from('payment_bonuses').select('*').eq('payment_record_id', paymentId),
    ]);

    return {
      ...payment,
      deductions_list: deductionsResult.data || [],
      bonuses_list: bonusesResult.data || [],
    };
  }

  /**
   * Get payment records for a specific worker
   */
  async getByWorkerId(workerId: string) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('payment_records')
      .select('*')
      .eq('worker_id', workerId)
      .order('period_end', { ascending: false });

    if (error) {
      throw new BadRequestException(`Failed to fetch worker payments: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get payment history for a specific worker
   */
  async getWorkerPaymentHistory(workerId: string) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('worker_payment_history')
      .select('*')
      .eq('worker_id', workerId)
      .single();

    if (error) {
      throw new NotFoundException(`Payment history not found for worker`);
    }

    return data;
  }

  /**
   * Get payment advances for an organization
   */
  async getAdvances(organizationId: string, filters?: {
    worker_id?: string;
    status?: string;
  }) {
    const client = this.databaseService.getAdminClient();

    let query = client
      .from('payment_advances')
      .select(`
        *,
        worker:worker_id(first_name, last_name),
        approved_by_user:approved_by(email)
      `)
      .eq('organization_id', organizationId);

    if (filters?.worker_id) {
      query = query.eq('worker_id', filters.worker_id);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    query = query.order('requested_date', { ascending: false});

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch payment advances: ${error.message}`);
    }

    return (data || []).map((advance: any) => ({
      ...advance,
      worker_name: advance.worker
        ? `${advance.worker.first_name} ${advance.worker.last_name}`
        : undefined,
      approved_by_name: advance.approved_by_user?.email,
    }));
  }

  /**
   * Get payment statistics for an organization
   */
  async getStatistics(organizationId: string) {
    const client = this.databaseService.getAdminClient();

    const { data: payments, error } = await client
      .from('payment_records')
      .select('*')
      .eq('organization_id', organizationId);

    if (error) {
      throw new BadRequestException(`Failed to fetch payment statistics: ${error.message}`);
    }

    // Calculate statistics
    const total_paid = payments?.filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.net_amount, 0) || 0;
    const total_pending = payments?.filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.net_amount, 0) || 0;
    const total_approved = payments?.filter(p => p.status === 'approved')
      .reduce((sum, p) => sum + p.net_amount, 0) || 0;

    const stats = {
      total_paid,
      total_pending,
      total_approved,
      payment_count: payments?.length || 0,
      average_payment: payments && payments.length > 0
        ? payments.reduce((sum, p) => sum + p.net_amount, 0) / payments.length
        : 0,
      by_worker_type: {},
      by_payment_type: {},
      by_month: [],
      top_paid_workers: [],
    };

    return stats;
  }

  private calculateFixedSalaryPayment(
    worker: any,
    periodStart: string,
    periodEnd: string,
  ): { base_amount: number; days_worked: number; hours_worked: number; tasks_completed: number; overtime_amount: number } {
    const monthlySalary = worker.monthly_salary || 0;
    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);
    const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
    const proratedAmount = (monthlySalary / daysInMonth) * daysInPeriod;
    
    return {
      base_amount: Math.round(proratedAmount * 100) / 100,
      days_worked: daysInPeriod,
      hours_worked: daysInPeriod * 8,
      tasks_completed: 0,
      overtime_amount: 0,
    };
  }

  private async calculateDailyWorkerPayment(
    client: any,
    workerId: string,
    periodStart: string,
    periodEnd: string,
    dailyRate: number,
  ): Promise<{ base_amount: number; days_worked: number; hours_worked: number; tasks_completed: number; overtime_amount: number }> {
    const { data: pieceWorkRecords, error } = await client
      .from('piece_work_records')
      .select('work_date, total_amount, units_completed')
      .eq('worker_id', workerId)
      .gte('work_date', periodStart)
      .lte('work_date', periodEnd);

    if (error) {
      const startDate = new Date(periodStart);
      const endDate = new Date(periodEnd);
      const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      return {
        base_amount: dailyRate * daysInPeriod,
        days_worked: daysInPeriod,
        hours_worked: daysInPeriod * 8,
        tasks_completed: 0,
        overtime_amount: 0,
      };
    }

    if (pieceWorkRecords && pieceWorkRecords.length > 0) {
      const totalAmount = pieceWorkRecords.reduce((sum: number, record: any) => sum + (record.total_amount || 0), 0);
      const uniqueDays = new Set(pieceWorkRecords.map((r: any) => r.work_date)).size;
      const totalUnits = pieceWorkRecords.reduce((sum: number, record: any) => sum + (record.units_completed || 0), 0);

      return {
        base_amount: totalAmount,
        days_worked: uniqueDays,
        hours_worked: uniqueDays * 8,
        tasks_completed: totalUnits,
        overtime_amount: 0,
      };
    }

    return {
      base_amount: 0,
      days_worked: 0,
      hours_worked: 0,
      tasks_completed: 0,
      overtime_amount: 0,
    };
  }

  private async getWorkerAdvanceDeductions(
    client: any,
    workerId: string,
  ): Promise<number> {
    const { data: advances, error } = await client
      .from('payment_advances')
      .select('remaining_balance')
      .eq('worker_id', workerId)
      .eq('status', 'approved')
      .gt('remaining_balance', 0);

    if (error || !advances) {
      return 0;
    }

    return advances.reduce((sum: number, advance: any) => sum + (advance.remaining_balance || 0), 0);
  }

  /**
   * Calculate payment for a worker
   */
  async calculatePayment(
    workerId: string,
    periodStart: string,
    periodEnd: string,
    includeAdvances: boolean,
  ) {
    const client = this.databaseService.getAdminClient();

    // Get worker info
    const { data: worker, error: workerError } = await client
      .from('workers')
      .select('*')
      .eq('id', workerId)
      .single();

    if (workerError || !worker) {
      throw new NotFoundException('Worker not found');
    }

    let calculationResult: { base_amount: number; days_worked: number; hours_worked: number; tasks_completed: number; overtime_amount: number };

    // Calculate based on worker type
    if (worker.worker_type === 'daily_worker') {
      calculationResult = await this.calculateDailyWorkerPayment(
        client,
        workerId,
        periodStart,
        periodEnd,
        worker.daily_rate || 0,
      );
    } else if (worker.worker_type === 'fixed_salary') {
      calculationResult = this.calculateFixedSalaryPayment(
        worker,
        periodStart,
        periodEnd,
      );
    } else {
      calculationResult = {
        base_amount: 0,
        days_worked: 0,
        hours_worked: 0,
        tasks_completed: 0,
        overtime_amount: 0,
      };
    }

    // Get advance deductions if requested
    let advance_deductions = 0;
    if (includeAdvances) {
      advance_deductions = await this.getWorkerAdvanceDeductions(client, workerId);
    }

    const response = {
      worker_id: workerId,
      worker_name: `${worker.first_name} ${worker.last_name}`,
      worker_type: worker.worker_type,
      period_start: periodStart,
      period_end: periodEnd,
      base_amount: calculationResult.base_amount,
      days_worked: calculationResult.days_worked,
      hours_worked: calculationResult.hours_worked,
      tasks_completed: calculationResult.tasks_completed,
      overtime_amount: calculationResult.overtime_amount,
      bonuses: [],
      deductions: [],
      advance_deductions,
      gross_amount: calculationResult.base_amount + calculationResult.overtime_amount,
      total_deductions: advance_deductions,
      net_amount: calculationResult.base_amount + calculationResult.overtime_amount - advance_deductions,
    };

    return response;
  }

  /**
   * Create a new payment record
   */
  async create(
    userId: string,
    organizationId: string,
    paymentData: any,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    // Create payment record
    const { data: payment, error: paymentError } = await client
      .from('payment_records')
      .insert({
        ...paymentData,
        organization_id: organizationId,
        calculated_by: userId,
      })
      .select()
      .single();

    if (paymentError) {
      throw new BadRequestException(`Failed to create payment record: ${paymentError.message}`);
    }

    // Insert bonuses if provided
    if (paymentData.bonuses && paymentData.bonuses.length > 0) {
      const bonusInserts = paymentData.bonuses.map((bonus: any) => ({
        payment_record_id: payment.id,
        ...bonus,
      }));

      const { error: bonusError } = await client
        .from('payment_bonuses')
        .insert(bonusInserts);

      if (bonusError) {
        throw new BadRequestException(`Failed to create payment bonuses: ${bonusError.message}`);
      }
    }

    // Insert deductions if provided
    if (paymentData.deductions && paymentData.deductions.length > 0) {
      const deductionInserts = paymentData.deductions.map((deduction: any) => ({
        payment_record_id: payment.id,
        ...deduction,
      }));

      const { error: deductionError } = await client
        .from('payment_deductions')
        .insert(deductionInserts);

      if (deductionError) {
        throw new BadRequestException(`Failed to create payment deductions: ${deductionError.message}`);
      }
    }

    return payment;
  }

  /**
   * Approve a payment record
   */
  async approve(
    userId: string,
    organizationId: string,
    paymentId: string,
    approvalData: { notes?: string },
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('payment_records')
      .update({
        status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        notes: approvalData.notes || null,
      })
      .eq('id', paymentId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to approve payment: ${error.message}`);
    }

    return data;
  }

  /**
   * Process a payment (mark as paid)
   */
  async process(
    userId: string,
    organizationId: string,
    paymentId: string,
    processData: {
      payment_method: string;
      payment_reference?: string;
      notes?: string;
    },
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('payment_records')
      .update({
        status: 'paid',
        payment_method: processData.payment_method,
        payment_reference: processData.payment_reference,
        payment_date: new Date().toISOString().split('T')[0],
        paid_by: userId,
        paid_at: new Date().toISOString(),
        notes: processData.notes || null,
      })
      .eq('id', paymentId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to process payment: ${error.message}`);
    }

    return data;
  }

  /**
   * Request an advance
   */
  async requestAdvance(
    userId: string,
    organizationId: string,
    advanceData: {
      worker_id: string;
      amount: number;
      reason: string;
      installments?: number;
    },
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    const deduction_plan = advanceData.installments
      ? {
          installments: advanceData.installments,
          amount_per_installment: advanceData.amount / advanceData.installments,
        }
      : null;

    const { data, error } = await client
      .from('payment_advances')
      .insert({
        organization_id: organizationId,
        worker_id: advanceData.worker_id,
        amount: advanceData.amount,
        reason: advanceData.reason,
        deduction_plan,
        remaining_balance: advanceData.amount,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to request advance: ${error.message}`);
    }

    return data;
  }

  /**
   * Approve an advance
   */
  async approveAdvance(
    userId: string,
    organizationId: string,
    advanceId: string,
    approvalData: {
      approved: boolean;
      deduction_plan?: any;
      notes?: string;
    },
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('payment_advances')
      .update({
        status: approvalData.approved ? 'approved' : 'rejected',
        approved_by: userId,
        approved_date: new Date().toISOString().split('T')[0],
        deduction_plan: approvalData.deduction_plan || null,
        notes: approvalData.notes || null,
      })
      .eq('id', advanceId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to approve advance: ${error.message}`);
    }

    return data;
  }

  /**
   * Pay an advance (mark as paid)
   */
  async payAdvance(
    userId: string,
    organizationId: string,
    advanceId: string,
    paymentMethod: string,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('payment_advances')
      .update({
        status: 'paid',
        paid_by: userId,
        paid_date: new Date().toISOString().split('T')[0],
        payment_method: paymentMethod,
      })
      .eq('id', advanceId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to pay advance: ${error.message}`);
    }

    return data;
  }
}
