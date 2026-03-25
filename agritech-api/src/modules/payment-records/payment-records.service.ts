import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { paginate, type PaginatedResponse } from '../../common/dto/paginated-query.dto';
import { AccountingAutomationService } from '../journal-entries/accounting-automation.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/notification.dto';

@Injectable()
export class PaymentRecordsService {
  private readonly logger = new Logger(PaymentRecordsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly accountingAutomationService: AccountingAutomationService,
    private readonly notificationsService: NotificationsService,
  ) {}

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
   * Compute net_amount from component fields.
   * Formula: base_amount + bonuses - deductions + overtime_amount - advance_deduction
   */
  static computeNetAmount(fields: {
    base_amount?: number;
    bonuses?: number;
    deductions?: number;
    overtime_amount?: number;
    advance_deduction?: number;
  }): number {
    const result =
      (fields.base_amount || 0) +
      (fields.bonuses || 0) -
      (fields.deductions || 0) +
      (fields.overtime_amount || 0) -
      (fields.advance_deduction || 0);
    return Math.round(result * 100) / 100;
  }

  private ensureValidPeriod(periodStart: string, periodEnd: string) {
    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid period dates');
    }

    if (endDate < startDate) {
      throw new BadRequestException('Period end date must be after start date');
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
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<any>> {
    const client = this.databaseService.getAdminClient();

    return paginate(client, 'payment_summary', {
      filters: (q) => {
        q = q.eq('organization_id', organizationId);
        if (filters?.status) q = q.in('status', filters.status.split(','));
        if (filters?.payment_type) q = q.in('payment_type', filters.payment_type.split(','));
        if (filters?.worker_id) q = q.eq('worker_id', filters.worker_id);
        if (filters?.farm_id) q = q.eq('farm_id', filters.farm_id);
        if (filters?.period_start) q = q.gte('period_start', filters.period_start);
        if (filters?.period_end) q = q.lte('period_end', filters.period_end);
        return q;
      },
      page: filters?.page || 1,
      pageSize: filters?.pageSize || 50,
      orderBy: 'created_at',
      ascending: false,
    });
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

  private async calculateFixedSalaryPayment(
    client: any,
    worker: any,
    periodStart: string,
    periodEnd: string,
  ): Promise<{ base_amount: number; days_worked: number; hours_worked: number; tasks_completed: number; overtime_amount: number; task_bonus: number; already_paid_base: number }> {
    const monthlySalary = worker.monthly_salary || 0;
    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);
    const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
    const proratedAmount = Math.round(((monthlySalary / daysInMonth) * daysInPeriod) * 100) / 100;

    // Check if monthly salary is already paid/approved for this period
    const { data: existingPaidSalary } = await client
      .from('payment_records')
      .select('id, net_amount, base_amount')
      .eq('worker_id', worker.id)
      .eq('payment_type', 'monthly_salary')
      .in('status', ['paid', 'approved'])
      .lte('period_start', periodEnd)
      .gte('period_end', periodStart)
      .maybeSingle();

    const alreadyPaidBase = existingPaidSalary
      ? Math.round((Number(existingPaidSalary.base_amount) || proratedAmount) * 100) / 100
      : 0;
    // If salary already paid, base_amount = 0 (no double payment)
    const effectiveBaseAmount = existingPaidSalary ? 0 : proratedAmount;

    // Add any extra task payments (payment_included_in_salary = false, not yet paid)
    const { data: taskWorkRecords } = await client
      .from('work_records')
      .select('amount_paid, total_payment, task_id')
      .eq('worker_id', worker.id)
      .eq('payment_included_in_salary', false)
      .gte('work_date', periodStart)
      .lte('work_date', periodEnd)
      .neq('payment_status', 'paid')
      .not('task_id', 'is', null);

    const taskBonus = (taskWorkRecords || []).reduce((sum: number, r: any) => {
      const amount = Number(r.amount_paid) || Number(r.total_payment) || 0;
      return sum + amount;
    }, 0);
    const tasksCompleted = (taskWorkRecords || []).filter((r: any) => r.task_id).length;

    return {
      base_amount: effectiveBaseAmount,
      days_worked: daysInPeriod,
      hours_worked: daysInPeriod * 8,
      tasks_completed: tasksCompleted,
      overtime_amount: 0,
      task_bonus: Math.round(taskBonus * 100) / 100,
      already_paid_base: alreadyPaidBase,
    };
  }

  private async calculateDailyWorkerPayment(
    client: any,
    workerId: string,
    periodStart: string,
    periodEnd: string,
    dailyRate: number,
  ): Promise<{ base_amount: number; days_worked: number; hours_worked: number; tasks_completed: number; overtime_amount: number; units_completed: number; rate_per_unit: number | null }> {
    const { data: workRecords, error: workRecordsError } = await client
      .from('work_records')
      .select('work_date, hours_worked, hourly_rate, total_payment, amount_paid, units_completed, rate_per_unit, payment_status')
      .eq('worker_id', workerId)
      .gte('work_date', periodStart)
      .lte('work_date', periodEnd)
      .neq('payment_status', 'paid');

    const { data: pieceWorkRecords, error } = await client
      .from('piece_work_records')
      .select('work_date, total_amount, units_completed')
      .eq('worker_id', workerId)
      .gte('work_date', periodStart)
      .lte('work_date', periodEnd);

    if (workRecordsError && error) {
      const startDate = new Date(periodStart);
      const endDate = new Date(periodEnd);
      const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      return {
        base_amount: dailyRate * daysInPeriod,
        days_worked: daysInPeriod,
        hours_worked: daysInPeriod * 8,
        tasks_completed: 0,
        overtime_amount: 0,
        units_completed: 0,
        rate_per_unit: null,
      };
    }

    const validWorkRecords = workRecords || [];
    const validPieceWorkRecords = pieceWorkRecords || [];

    if (validWorkRecords.length > 0 || validPieceWorkRecords.length > 0) {
      const workRecordTotal = validWorkRecords.reduce((sum: number, record: any) => {
        // Use total_payment or amount_paid if explicitly set (non-null)
        const rawTotal = record.total_payment ?? record.amount_paid;
        if (rawTotal !== null && rawTotal !== undefined) {
          return sum + (Number(rawTotal) || 0);
        }
        // total_payment is null — try to recompute from units × rate
        const units = Number(record.units_completed) || 0;
        const rpu = Number(record.rate_per_unit) || 0;
        if (units > 0 && rpu > 0) {
          return sum + units * rpu;
        }
        // Fall back to hours × hourly_rate, then daily_rate
        const hoursWorked = Number(record.hours_worked) || 0;
        const hourlyRate = Number(record.hourly_rate) || 0;
        if (hoursWorked > 0 && hourlyRate > 0) {
          return sum + hoursWorked * hourlyRate;
        }
        return sum + dailyRate;
      }, 0);

      const pieceWorkTotal = validPieceWorkRecords.reduce((sum: number, record: any) => sum + (record.total_amount || 0), 0);
      const workRecordDays = new Set(validWorkRecords.map((r: any) => r.work_date));
      const pieceWorkDays = new Set(validPieceWorkRecords.map((r: any) => r.work_date));
      const uniqueDays = new Set([...workRecordDays, ...pieceWorkDays]).size;
      const totalHours = validWorkRecords.reduce((sum: number, record: any) => sum + (Number(record.hours_worked) || 0), 0);
      // Sum units from both work_records (per-unit tasks) and piece_work_records
      const workRecordUnits = validWorkRecords.reduce((sum: number, record: any) => sum + (Number(record.units_completed) || 0), 0);
      const pieceWorkUnits = validPieceWorkRecords.reduce((sum: number, record: any) => sum + (Number(record.units_completed) || 0), 0);
      const totalUnits = workRecordUnits + pieceWorkUnits;
      const totalForRate = workRecordTotal + pieceWorkTotal;
      const computedRatePerUnit = totalUnits > 0 ? Math.round((totalForRate / totalUnits) * 100) / 100 : null;

      return {
        base_amount: workRecordTotal + pieceWorkTotal,
        days_worked: uniqueDays,
        hours_worked: totalHours || uniqueDays * 8,
        tasks_completed: totalUnits,
        overtime_amount: 0,
        units_completed: totalUnits,
        rate_per_unit: computedRatePerUnit,
      };
    }

    return {
      base_amount: 0,
      days_worked: 0,
      hours_worked: 0,
      tasks_completed: 0,
      overtime_amount: 0,
      units_completed: 0,
      rate_per_unit: null,
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
    userId: string,
    organizationId: string,
    workerId: string,
    periodStart: string,
    periodEnd: string,
    includeAdvances: boolean,
  ) {
    this.ensureValidPeriod(periodStart, periodEnd);
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    // Get worker info
    const { data: worker, error: workerError } = await client
      .from('workers')
      .select('*')
      .eq('id', workerId)
      .eq('organization_id', organizationId)
      .single();

    if (workerError || !worker) {
      throw new NotFoundException('Worker not found');
    }

    let calculationResult: { base_amount: number; days_worked: number; hours_worked: number; tasks_completed: number; overtime_amount: number };
    let metayageSettlement: any = null;

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
      calculationResult = await this.calculateFixedSalaryPayment(
        client,
        worker,
        periodStart,
        periodEnd,
      );
    } else if (worker.worker_type === 'metayage') {
      const { data: settlement, error: settlementError } = await client
        .from('metayage_settlements')
        .select('*')
        .eq('worker_id', workerId)
        .eq('organization_id', organizationId)
        .eq('period_start', periodStart)
        .eq('period_end', periodEnd)
        .neq('payment_status', 'paid')
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (settlementError || !settlement) {
        throw new BadRequestException('No pending métayage settlement found for this period');
      }

      metayageSettlement = settlement;
      calculationResult = {
        base_amount: Number(settlement.worker_share_amount) || 0,
        days_worked: 0,
        hours_worked: 0,
        tasks_completed: 0,
        overtime_amount: 0,
      };
    } else {
      calculationResult = {
        base_amount: 0,
        days_worked: 0,
        hours_worked: 0,
        tasks_completed: 0,
        overtime_amount: 0,
      };
    }

    const taskBonus = (calculationResult as any).task_bonus ?? 0;
    const alreadyPaidBase = (calculationResult as any).already_paid_base ?? 0;
    const grossAmount = calculationResult.base_amount + calculationResult.overtime_amount + taskBonus;

    // Get advance deductions if requested
    let advance_deductions = 0;
    if (includeAdvances) {
      const outstandingAdvances = await this.getWorkerAdvanceDeductions(client, workerId);
      advance_deductions = Math.min(outstandingAdvances, Math.max(0, grossAmount));
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
      units_completed: (calculationResult as any).units_completed ?? 0,
      rate_per_unit: (calculationResult as any).rate_per_unit ?? null,
      overtime_amount: calculationResult.overtime_amount,
      task_bonus: taskBonus,
      already_paid_base: alreadyPaidBase,
      bonuses: [],
      deductions: [],
      advance_deductions,
      gross_amount: grossAmount,
      total_deductions: advance_deductions,
      net_amount: grossAmount - advance_deductions,
      gross_revenue: metayageSettlement?.gross_revenue,
      total_charges: metayageSettlement?.total_charges,
      metayage_percentage: metayageSettlement?.worker_percentage,
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
    this.ensureValidPeriod(paymentData.period_start, paymentData.period_end);
    await this.verifyOrganizationAccess(userId, organizationId);
    const client = this.databaseService.getAdminClient();

    const { data: worker, error: workerError } = await client
      .from('workers')
      .select('id, worker_type, farm_id, first_name, last_name')
      .eq('id', paymentData.worker_id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (workerError || !worker) {
      throw new NotFoundException('Worker not found in organization');
    }

    const allowedPaymentTypes: Record<string, string[]> = {
      fixed_salary: ['monthly_salary', 'bonus', 'overtime', 'advance'],
      daily_worker: ['daily_wage', 'bonus', 'overtime', 'advance'],
      metayage: ['metayage_share', 'bonus', 'advance'],
    };

    const allowedTypes = allowedPaymentTypes[worker.worker_type] || [];
    if (!allowedTypes.includes(paymentData.payment_type)) {
      throw new BadRequestException('Payment type not allowed for this worker');
    }

    // For daily_wage and monthly_salary: only block pending/approved (not paid).
    // A paid monthly salary doesn't block creating a supplemental task-bonus payment.
    const overlapStatuses = ['pending', 'approved'];
    if (['daily_wage', 'monthly_salary', 'metayage_share'].includes(paymentData.payment_type)) {
      // General overlap check — only block if an unpaid/unapproved payment already exists
      const { data: overlappingPayment } = await client
        .from('payment_records')
        .select('id, status')
        .eq('organization_id', organizationId)
        .eq('worker_id', paymentData.worker_id)
        .eq('payment_type', paymentData.payment_type)
        .in('status', overlapStatuses)
        .lte('period_start', paymentData.period_end)
        .gte('period_end', paymentData.period_start)
        .maybeSingle();

      if (overlappingPayment) {
        throw new BadRequestException(
          `Un paiement en attente ou approuvé existe déjà pour cette période (ID: ${overlappingPayment.id}). ` +
          `Veuillez d'abord approuver ou supprimer ce paiement.`
        );
      }
    }

    // Validate and handle farm_id - it's required (NOT NULL) in the database
    let farmId = paymentData.farm_id || worker.farm_id;
    if (!farmId || (typeof farmId === 'string' && farmId.trim() === '')) {
      // If worker has no farm, get the first farm from the organization as fallback
      const { data: farms, error: farmsError } = await client
        .from('farms')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (farmsError || !farms) {
        throw new BadRequestException(
          'Cannot create payment record: worker has no farm assigned and no active farms found in organization'
        );
      }

      farmId = farms.id;
    }

    if (farmId) {
      const { data: farm } = await client
        .from('farms')
        .select('id')
        .eq('id', farmId)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (!farm) {
        throw new BadRequestException('Invalid farm for this organization');
      }
    }

    let metayageSettlement: any = null;
    if (paymentData.payment_type === 'metayage_share') {
      const { data: settlement, error: settlementError } = await client
        .from('metayage_settlements')
        .select('*')
        .eq('worker_id', paymentData.worker_id)
        .eq('organization_id', organizationId)
        .eq('period_start', paymentData.period_start)
        .eq('period_end', paymentData.period_end)
        .neq('payment_status', 'paid')
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (settlementError || !settlement) {
        throw new BadRequestException('No pending métayage settlement found for this period');
      }

      metayageSettlement = settlement;
    }

    // Extract bonuses and deductions arrays (they go to separate tables)
    const bonusesArray = paymentData.bonuses || [];
    const deductionsArray = paymentData.deductions || [];

    // Calculate total amounts for NUMERIC fields
    const bonusesTotal = bonusesArray.reduce((sum: number, bonus: any) => sum + (Number(bonus.amount) || 0), 0);
    const deductionsTotal = deductionsArray.reduce((sum: number, deduction: any) => sum + (Number(deduction.amount) || 0), 0);
    const baseAmount = Number(metayageSettlement?.worker_share_amount ?? paymentData.base_amount) || 0;

    const grossAmount =
      baseAmount +
      bonusesTotal +
      (Number(paymentData.overtime_amount) || 0) -
      deductionsTotal;

    const outstandingAdvances = await this.getWorkerAdvanceDeductions(client, paymentData.worker_id);
    const requestedAdvanceDeduction = Number(paymentData.advance_deduction) || 0;
    const finalAdvanceDeduction = Math.max(0, Math.min(requestedAdvanceDeduction, outstandingAdvances, Math.max(0, grossAmount)));

    // Compute net_amount in application layer (was previously a GENERATED column)
    // Compute net_amount in application layer (was previously a GENERATED column)
    const finalBaseAmount = Number(metayageSettlement?.worker_share_amount ?? paymentData.base_amount) || 0;
    const finalOvertimeAmount = Number(paymentData.overtime_amount) || 0;
    const finalTaskBonus = Number(paymentData.task_bonus) || 0;
    const netAmount = finalBaseAmount + bonusesTotal - deductionsTotal + finalOvertimeAmount + finalTaskBonus - finalAdvanceDeduction;

    // Prepare insert data, excluding arrays and virtual fields not in DB
    const { bonuses: _, deductions: __, task_bonus: ___, ...restData } = paymentData;
    const insertData = {
      ...restData,
      farm_id: farmId, // Ensure farm_id is always set
      bonuses: bonusesTotal, // NUMERIC field - total amount
      deductions: deductionsTotal, // NUMERIC field - total amount
      advance_deduction: finalAdvanceDeduction,
      net_amount: Math.round(netAmount * 100) / 100,
      base_amount: metayageSettlement?.worker_share_amount ?? restData.base_amount,
      gross_revenue: metayageSettlement?.gross_revenue ?? restData.gross_revenue,
      total_charges: metayageSettlement?.total_charges ?? restData.total_charges,
      metayage_percentage: metayageSettlement?.worker_percentage ?? restData.metayage_percentage,
      organization_id: organizationId,
      calculated_by: userId,
    };

    // Create payment record
    const { data: payment, error: paymentError } = await client
      .from('payment_records')
      .insert(insertData)
      .select()
      .single();

    if (paymentError) {
      throw new BadRequestException(`Failed to create payment record: ${paymentError.message}`);
    }

    // Insert bonuses if provided
    if (bonusesArray.length > 0) {
      const bonusInserts = bonusesArray.map((bonus: any) => ({
        payment_record_id: payment.id,
        bonus_type: bonus.bonus_type,
        amount: Number(bonus.amount) || 0,
        description: bonus.description || null,
      }));

      const { error: bonusError } = await client
        .from('payment_bonuses')
        .insert(bonusInserts);

      if (bonusError) {
        throw new BadRequestException(`Failed to create payment bonuses: ${bonusError.message}`);
      }
    }

    // Insert deductions if provided
    if (deductionsArray.length > 0) {
      const deductionInserts = deductionsArray.map((deduction: any) => ({
        payment_record_id: payment.id,
        deduction_type: deduction.deduction_type,
        amount: Number(deduction.amount) || 0,
        description: deduction.description || null,
        reference: deduction.reference || null,
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

    const { data: existingPayment } = await client
      .from('payment_records')
      .select('id, status')
      .eq('id', paymentId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!existingPayment) {
      throw new NotFoundException('Payment record not found');
    }

    if (existingPayment.status !== 'approved') {
      throw new BadRequestException('Payment must be approved before processing');
    }

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

    if ((data.advance_deduction || 0) > 0) {
      const { data: advances } = await client
        .from('payment_advances')
        .select('id, remaining_balance')
        .eq('organization_id', organizationId)
        .eq('worker_id', data.worker_id)
        .eq('status', 'approved')
        .gt('remaining_balance', 0)
        .order('requested_date', { ascending: true });

      let remainingDeduction = Number(data.advance_deduction) || 0;

      for (const advance of advances || []) {
        if (remainingDeduction <= 0) break;
        const advanceBalance = Number(advance.remaining_balance) || 0;
        const deduction = Math.min(advanceBalance, remainingDeduction);
        const newBalance = Math.max(0, advanceBalance - deduction);

        await client
          .from('payment_advances')
          .update({
            remaining_balance: newBalance,
            status: newBalance === 0 ? 'paid' : 'approved',
          })
          .eq('id', advance.id)
          .eq('organization_id', organizationId);

        remainingDeduction -= deduction;
      }

      if (remainingDeduction > 0) {
        this.logger.warn(`Advance deduction exceeds remaining balance for worker ${data.worker_id}`);
      }
    }

    if (data.payment_type === 'metayage_share') {
      await client
        .from('metayage_settlements')
        .update({
          payment_status: 'paid',
          payment_date: data.payment_date,
          payment_method: data.payment_method,
        })
        .eq('organization_id', organizationId)
        .eq('worker_id', data.worker_id)
        .eq('period_start', data.period_start)
        .eq('period_end', data.period_end)
        .neq('payment_status', 'paid');
    }

    // Update work_records payment_status to 'paid' for all work records in the payment period
    if (data.worker_id && data.period_start && data.period_end) {
      try {
        await client
          .from('work_records')
          .update({ payment_status: 'paid' })
          .eq('organization_id', organizationId)
          .eq('worker_id', data.worker_id)
          .gte('work_date', data.period_start)
          .lte('work_date', data.period_end)
          .neq('payment_status', 'paid');
      } catch (workRecordError) {
        this.logger.warn(
          `Failed to update work_records payment_status for payment ${paymentId}: ${workRecordError instanceof Error ? workRecordError.message : 'Unknown error'}`,
        );
      }
    }

    // Create journal entry for the payment if it doesn't already exist
    try {
      // Check if journal entry already exists for this payment
      const { data: existingJournal } = await client
        .from('journal_entries')
        .select('id')
        .eq('reference_id', paymentId)
        .eq('reference_type', 'worker_payment')
        .maybeSingle();

      if (!existingJournal) {
        // Get worker name for journal entry description
        const { data: worker } = await client
          .from('workers')
          .select('first_name, last_name')
          .eq('id', data.worker_id)
          .maybeSingle();

        const workerName = worker
          ? `${worker.first_name} ${worker.last_name}`
          : 'Worker';

        const paymentDate = data.payment_date
          ? new Date(data.payment_date)
          : new Date();

        const journalEntry = await this.accountingAutomationService.createJournalEntryFromWorkerPayment(
          organizationId,
          data.id,
          data.net_amount || 0,
          paymentDate,
          workerName,
          data.payment_type || 'salary',
          userId,
          data.farm_id || undefined,
        );

        if (journalEntry?.id) {
          // Journal entry is already linked via reference_id and reference_type
          this.logger.log(`Journal entry ${journalEntry.id} created for payment ${data.id}`);
        }
      } else {
        this.logger.log(`Journal entry ${existingJournal.id} already exists for payment ${paymentId}`);
      }
    } catch (journalError) {
      // Log error but don't fail payment processing if journal entry fails
      this.logger.error(
        `Failed to create journal entry for payment ${paymentId}: ${journalError instanceof Error ? journalError.message : 'Unknown error'}`,
      );
      // Payment is still processed, just without journal entry
    }

    try {
      const { data: worker } = await client
        .from('workers')
        .select('user_id, first_name, last_name')
        .eq('id', data.worker_id)
        .maybeSingle();

      if (worker?.user_id) {
        const workerName = `${worker.first_name || ''} ${worker.last_name || ''}`.trim();
        const amount = data.net_amount || data.base_amount || 0;

        await this.notificationsService.createNotification({
          userId: worker.user_id,
          organizationId,
          type: NotificationType.PAYMENT_PROCESSED,
          title: `Payment processed: ${amount} ${data.currency || 'MAD'}`,
          message: `Your ${data.payment_type || 'salary'} payment of ${amount} ${data.currency || 'MAD'} has been processed`,
          data: {
            paymentId: data.id,
            amount,
            paymentType: data.payment_type,
            paymentMethod: data.payment_method,
          },
        });
      }
    } catch (notifError) {
      this.logger.warn(
        `Failed to send payment notification: ${notifError instanceof Error ? notifError.message : 'Unknown error'}`,
      );
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
