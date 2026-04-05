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
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { DeliveriesService } from './deliveries.service';

@Controller('organizations/:organizationId/deliveries')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  /**
   * GET /api/v1/organizations/:organizationId/deliveries
   * Get all deliveries for an organization
   */
  @Get()
  async getDeliveries(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Query('status') status?: string,
    @Query('payment_status') paymentStatus?: string,
    @Query('delivery_type') deliveryType?: string,
    @Query('farm_id') farmId?: string,
    @Query('driver_id') driverId?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('customer_name') customerName?: string,
  ) {
    return this.deliveriesService.getAll(req.user.userId, organizationId, {
      status,
      payment_status: paymentStatus,
      delivery_type: deliveryType,
      farm_id: farmId,
      driver_id: driverId,
      date_from: dateFrom,
      date_to: dateTo,
      customer_name: customerName,
    });
  }

  /**
   * GET /api/v1/organizations/:organizationId/deliveries/:deliveryId
   * Get a single delivery by ID
   */
  @Get(':deliveryId')
  async getDelivery(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('deliveryId') deliveryId: string,
  ) {
    return this.deliveriesService.getById(req.user.userId, organizationId, deliveryId);
  }

  /**
   * GET /api/v1/organizations/:organizationId/deliveries/:deliveryId/items
   * Get delivery items
   */
  @Get(':deliveryId/items')
  async getDeliveryItems(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('deliveryId') deliveryId: string,
  ) {
    return this.deliveriesService.getItems(req.user.userId, organizationId, deliveryId);
  }

  /**
   * GET /api/v1/organizations/:organizationId/deliveries/:deliveryId/tracking
   * Get delivery tracking records
   */
  @Get(':deliveryId/tracking')
  async getDeliveryTracking(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('deliveryId') deliveryId: string,
  ) {
    return this.deliveriesService.getTracking(req.user.userId, organizationId, deliveryId);
  }

  /**
   * POST /api/v1/organizations/:organizationId/deliveries
   * Create a new delivery
   */
  @Post()
  async createDelivery(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body() createDeliveryDto: any,
  ) {
    return this.deliveriesService.create(
      req.user.userId,
      organizationId,
      createDeliveryDto,
    );
  }

  /**
   * PATCH /api/v1/organizations/:organizationId/deliveries/:deliveryId/status
   * Update delivery status
   */
  @Patch(':deliveryId/status')
  async updateDeliveryStatus(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('deliveryId') deliveryId: string,
    @Body() updateStatusDto: any,
  ) {
    return this.deliveriesService.updateStatus(
      req.user.userId,
      organizationId,
      deliveryId,
      updateStatusDto,
    );
  }

  /**
   * PATCH /api/v1/organizations/:organizationId/deliveries/:deliveryId/complete
   * Complete a delivery
   */
  @Patch(':deliveryId/complete')
  async completeDelivery(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('deliveryId') deliveryId: string,
    @Body() completeDto: any,
  ) {
    return this.deliveriesService.complete(
      req.user.userId,
      organizationId,
      deliveryId,
      completeDto,
    );
  }

  /**
   * PATCH /api/v1/organizations/:organizationId/deliveries/:deliveryId/payment
   * Update delivery payment
   */
  @Patch(':deliveryId/payment')
  async updateDeliveryPayment(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('deliveryId') deliveryId: string,
    @Body() paymentDto: any,
  ) {
    return this.deliveriesService.updatePayment(
      req.user.userId,
      organizationId,
      deliveryId,
      paymentDto,
    );
  }

  /**
   * PATCH /api/v1/organizations/:organizationId/deliveries/:deliveryId/cancel
   * Cancel a delivery
   */
  @Patch(':deliveryId/cancel')
  async cancelDelivery(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('deliveryId') deliveryId: string,
    @Body() cancelDto: { reason?: string },
  ) {
    return this.deliveriesService.cancel(
      req.user.userId,
      organizationId,
      deliveryId,
      cancelDto.reason,
    );
  }
}
