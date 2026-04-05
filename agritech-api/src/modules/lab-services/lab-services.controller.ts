import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { LabServicesService } from './lab-services.service';
import {
  LabServiceOrderFiltersDto,
  CreateLabServiceOrderDto,
  UpdateLabServiceOrderDto,
  CreateLabResultParametersDto,
  CreateLabRecommendationDto,
  UpdateLabRecommendationDto,
  LabRecommendationFiltersDto,
  SampleScheduleFiltersDto,
  CreateSampleScheduleDto,
  UpdateSampleScheduleDto,
  ServiceCategory,
} from './dto';

@ApiTags('Lab Services')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class LabServicesController {
  constructor(private readonly labServicesService: LabServicesService) {}

  @Get('lab-services/providers')
  @ApiOperation({ summary: 'Get all active lab service providers' })
  @ApiResponse({ status: 200, description: 'Providers retrieved successfully' })
  async getProviders() {
    return this.labServicesService.getProviders();
  }

  @Get('lab-services/providers/:id')
  @ApiOperation({ summary: 'Get a single lab service provider' })
  @ApiResponse({ status: 200, description: 'Provider retrieved successfully' })
  async getProviderById(@Param('id') providerId: string) {
    return this.labServicesService.getProviderById(providerId);
  }

  @Get('lab-services/types')
  @ApiOperation({ summary: 'Get lab service types' })
  @ApiQuery({ name: 'providerId', required: false })
  @ApiQuery({ name: 'category', required: false, enum: ServiceCategory })
  @ApiResponse({ status: 200, description: 'Service types retrieved successfully' })
  async getServiceTypes(
    @Query('providerId') providerId?: string,
    @Query('category') category?: ServiceCategory,
  ) {
    return this.labServicesService.getServiceTypes(providerId, category);
  }

  @Get('lab-services/types/:id')
  @ApiOperation({ summary: 'Get a single lab service type' })
  @ApiResponse({ status: 200, description: 'Service type retrieved successfully' })
  async getServiceTypeById(@Param('id') typeId: string) {
    return this.labServicesService.getServiceTypeById(typeId);
  }

  @Get('organizations/:organizationId/lab-services/orders')
  @ApiOperation({ summary: 'Get lab service orders for organization' })
  @ApiQuery({ name: 'farmId', required: false })
  @ApiQuery({ name: 'parcelId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  async getOrders(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Query() filters: LabServiceOrderFiltersDto,
  ) {
    return this.labServicesService.getOrders(req.user.userId, organizationId, filters);
  }

  @Get('organizations/:organizationId/lab-services/orders/:id')
  @ApiOperation({ summary: 'Get a single lab service order' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
  async getOrderById(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') orderId: string,
  ) {
    return this.labServicesService.getOrderById(req.user.userId, organizationId, orderId);
  }

  @Post('organizations/:organizationId/lab-services/orders')
  @ApiOperation({ summary: 'Create a new lab service order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  async createOrder(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateLabServiceOrderDto,
  ) {
    return this.labServicesService.createOrder(req.user.userId, organizationId, dto);
  }

  @Patch('organizations/:organizationId/lab-services/orders/:id')
  @ApiOperation({ summary: 'Update a lab service order' })
  @ApiResponse({ status: 200, description: 'Order updated successfully' })
  async updateOrder(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') orderId: string,
    @Body() dto: UpdateLabServiceOrderDto,
  ) {
    return this.labServicesService.updateOrder(req.user.userId, organizationId, orderId, dto);
  }

  @Get('organizations/:organizationId/lab-services/orders/:orderId/results')
  @ApiOperation({ summary: 'Get result parameters for an order' })
  @ApiResponse({ status: 200, description: 'Result parameters retrieved successfully' })
  async getResultParameters(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.labServicesService.getResultParameters(req.user.userId, organizationId, orderId);
  }

  @Post('organizations/:organizationId/lab-services/orders/:orderId/results')
  @ApiOperation({ summary: 'Add result parameters to an order' })
  @ApiResponse({ status: 201, description: 'Result parameters added successfully' })
  async addResultParameters(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('orderId') orderId: string,
    @Body() dto: CreateLabResultParametersDto,
  ) {
    return this.labServicesService.addResultParameters(req.user.userId, organizationId, orderId, dto);
  }

  @Get('organizations/:organizationId/lab-services/recommendations')
  @ApiOperation({ summary: 'Get lab service recommendations' })
  @ApiQuery({ name: 'orderId', required: false })
  @ApiQuery({ name: 'parcelId', required: false })
  @ApiResponse({ status: 200, description: 'Recommendations retrieved successfully' })
  async getRecommendations(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Query() filters: LabRecommendationFiltersDto,
  ) {
    return this.labServicesService.getRecommendations(req.user.userId, organizationId, filters);
  }

  @Post('organizations/:organizationId/lab-services/recommendations')
  @ApiOperation({ summary: 'Create a lab service recommendation' })
  @ApiResponse({ status: 201, description: 'Recommendation created successfully' })
  async createRecommendation(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateLabRecommendationDto,
  ) {
    return this.labServicesService.createRecommendation(req.user.userId, organizationId, dto);
  }

  @Patch('organizations/:organizationId/lab-services/recommendations/:id')
  @ApiOperation({ summary: 'Update a lab service recommendation' })
  @ApiResponse({ status: 200, description: 'Recommendation updated successfully' })
  async updateRecommendation(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') recommendationId: string,
    @Body() dto: UpdateLabRecommendationDto,
  ) {
    return this.labServicesService.updateRecommendation(
      req.user.userId,
      organizationId,
      recommendationId,
      dto,
    );
  }

  @Get('organizations/:organizationId/lab-services/schedules')
  @ApiOperation({ summary: 'Get sample collection schedules' })
  @ApiQuery({ name: 'farmId', required: false })
  @ApiQuery({ name: 'parcelId', required: false })
  @ApiResponse({ status: 200, description: 'Schedules retrieved successfully' })
  async getSchedules(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Query() filters: SampleScheduleFiltersDto,
  ) {
    return this.labServicesService.getSchedules(req.user.userId, organizationId, filters);
  }

  @Post('organizations/:organizationId/lab-services/schedules')
  @ApiOperation({ summary: 'Create a sample collection schedule' })
  @ApiResponse({ status: 201, description: 'Schedule created successfully' })
  async createSchedule(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateSampleScheduleDto,
  ) {
    return this.labServicesService.createSchedule(req.user.userId, organizationId, dto);
  }

  @Patch('organizations/:organizationId/lab-services/schedules/:id')
  @ApiOperation({ summary: 'Update a sample collection schedule' })
  @ApiResponse({ status: 200, description: 'Schedule updated successfully' })
  async updateSchedule(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') scheduleId: string,
    @Body() dto: UpdateSampleScheduleDto,
  ) {
    return this.labServicesService.updateSchedule(
      req.user.userId,
      organizationId,
      scheduleId,
      dto,
    );
  }

  @Delete('organizations/:organizationId/lab-services/schedules/:id')
  @ApiOperation({ summary: 'Delete a sample collection schedule' })
  @ApiResponse({ status: 200, description: 'Schedule deleted successfully' })
  async deleteSchedule(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') scheduleId: string,
  ) {
    await this.labServicesService.deleteSchedule(req.user.userId, organizationId, scheduleId);
    return { message: 'Schedule deleted successfully' };
  }
}
