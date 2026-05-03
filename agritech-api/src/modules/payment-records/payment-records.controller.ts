import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { ModuleEntitlementGuard } from '../../common/guards/module-entitlement.guard';
import { PaymentRecordsService } from './payment-records.service';

@Controller('organizations/:organizationId/payment-records')
@RequireModule('personnel')
@UseGuards(JwtAuthGuard, OrganizationGuard, ModuleEntitlementGuard)
export class PaymentRecordsController {
  constructor(private readonly paymentRecordsService: PaymentRecordsService) {}

  /**
   * GET /organizations/:organizationId/payment-records
   * Get all payment records for an organization
   */
  @Get()
  async getPaymentRecords(
    @Param('organizationId') organizationId: string,
    @Query('status') status?: string,
    @Query('payment_type') paymentType?: string,
    @Query('worker_id') workerId?: string,
    @Query('farm_id') farmId?: string,
    @Query('period_start') periodStart?: string,
    @Query('period_end') periodEnd?: string,
  ) {
    return this.paymentRecordsService.getAll(organizationId, {
      status,
      payment_type: paymentType,
      worker_id: workerId,
      farm_id: farmId,
      period_start: periodStart,
      period_end: periodEnd,
    });
  }

  /**
   * GET /organizations/:organizationId/payment-records/:paymentId
   * Get a single payment record by ID
   */
  @Get(':paymentId')
  async getPaymentRecord(
    @Param('organizationId') organizationId: string,
    @Param('paymentId') paymentId: string,
  ) {
    return this.paymentRecordsService.getById(organizationId, paymentId);
  }

  /**
   * GET /organizations/:organizationId/payment-records/worker/:workerId
   * Get payment records for a specific worker
   */
  @Get('worker/:workerId')
  async getWorkerPayments(
    @Param('organizationId') organizationId: string,
    @Param('workerId') workerId: string,
  ) {
    return this.paymentRecordsService.getByWorkerId(organizationId, workerId);
  }

  /**
   * GET /organizations/:organizationId/payment-records/worker/:workerId/history
   * Get payment history for a specific worker
   */
  @Get('worker/:workerId/history')
  async getWorkerPaymentHistory(
    @Param('organizationId') organizationId: string,
    @Param('workerId') workerId: string,
  ) {
    return this.paymentRecordsService.getWorkerPaymentHistory(organizationId, workerId);
  }

  /**
   * GET /organizations/:organizationId/payment-records/advances/list
   * Get payment advances
   */
  @Get('advances/list')
  async getPaymentAdvances(
    @Param('organizationId') organizationId: string,
    @Query('worker_id') workerId?: string,
    @Query('status') status?: string,
  ) {
    return this.paymentRecordsService.getAdvances(organizationId, {
      worker_id: workerId,
      status,
    });
  }

  /**
   * GET /organizations/:organizationId/payment-records/statistics/summary
   * Get payment statistics
   */
  @Get('statistics/summary')
  async getPaymentStatistics(@Param('organizationId') organizationId: string) {
    return this.paymentRecordsService.getStatistics(organizationId);
  }

  /**
   * POST /organizations/:organizationId/payment-records/calculate
   * Calculate payment for a worker
   */
  @Post('calculate')
  async calculatePayment(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body()
    calculateDto: {
      worker_id: string;
      period_start: string;
      period_end: string;
      include_advances?: boolean;
    },
  ) {
    const userId = req.user?.id || req.user?.sub;
    return this.paymentRecordsService.calculatePayment(
      userId,
      organizationId,
      calculateDto.worker_id,
      calculateDto.period_start,
      calculateDto.period_end,
      calculateDto.include_advances || false,
    );
  }

  /**
   * POST /organizations/:organizationId/payment-records
   * Create a new payment record
   */
  @Post()
  async createPaymentRecord(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body() createDto: any,
  ) {
    const userId = req.user?.id || req.user?.sub;
    return this.paymentRecordsService.create(
      userId,
      organizationId,
      createDto,
    );
  }

  /**
   * PATCH /organizations/:organizationId/payment-records/:paymentId/approve
   * Approve a payment record
   */
  @Patch(':paymentId/approve')
  async approvePayment(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('paymentId') paymentId: string,
    @Body() approveDto: { notes?: string },
  ) {
    const userId = req.user?.id || req.user?.sub;
    return this.paymentRecordsService.approve(
      userId,
      organizationId,
      paymentId,
      approveDto,
    );
  }

  /**
   * PATCH /organizations/:organizationId/payment-records/:paymentId/process
   * Process a payment (mark as paid)
   */
  @Patch(':paymentId/process')
  async processPayment(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('paymentId') paymentId: string,
    @Body()
    processDto: {
      payment_method: string;
      payment_reference?: string;
      notes?: string;
    },
  ) {
    const userId = req.user?.id || req.user?.sub;
    return this.paymentRecordsService.process(
      userId,
      organizationId,
      paymentId,
      processDto,
    );
  }

  /**
   * POST /organizations/:organizationId/payment-records/advances
   * Request an advance
   */
  @Post('advances')
  async requestAdvance(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body()
    advanceDto: {
      worker_id: string;
      amount: number;
      reason: string;
      installments?: number;
    },
  ) {
    const userId = req.user?.id || req.user?.sub;
    return this.paymentRecordsService.requestAdvance(
      userId,
      organizationId,
      advanceDto,
    );
  }

  /**
   * PATCH /organizations/:organizationId/payment-records/advances/:advanceId/approve
   * Approve an advance
   */
  @Patch('advances/:advanceId/approve')
  async approveAdvance(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('advanceId') advanceId: string,
    @Body()
    approvalDto: {
      approved: boolean;
      deduction_plan?: any;
      notes?: string;
    },
  ) {
    const userId = req.user?.id || req.user?.sub;
    return this.paymentRecordsService.approveAdvance(
      userId,
      organizationId,
      advanceId,
      approvalDto,
    );
  }

  /**
   * PATCH /organizations/:organizationId/payment-records/advances/:advanceId/pay
   * Pay an advance
   */
  @Patch('advances/:advanceId/pay')
  async payAdvance(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('advanceId') advanceId: string,
    @Body() payDto: { payment_method: string },
  ) {
    const userId = req.user?.id || req.user?.sub;
    return this.paymentRecordsService.payAdvance(
      userId,
      organizationId,
      advanceId,
      payDto.payment_method,
    );
  }
}
