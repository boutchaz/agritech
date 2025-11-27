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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReceptionBatchesService } from './reception-batches.service';
import { CreateReceptionBatchDto } from './dto/create-reception-batch.dto';
import { UpdateQualityControlDto } from './dto/update-quality-control.dto';
import { MakeReceptionDecisionDto } from './dto/make-reception-decision.dto';
import { ProcessReceptionPaymentDto } from './dto/process-reception-payment.dto';
import { ReceptionBatchFiltersDto } from './dto/reception-batch-filters.dto';

@ApiTags('Reception Batches')
@ApiBearerAuth()
@Controller('api/v1/organizations/:organizationId/reception-batches')
@UseGuards(JwtAuthGuard)
export class ReceptionBatchesController {
  constructor(
    private readonly receptionBatchesService: ReceptionBatchesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create new reception batch (Step 1: Basic Reception)' })
  @ApiResponse({ status: 201, description: 'Reception batch created successfully' })
  async create(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body() createDto: CreateReceptionBatchDto,
  ) {
    return this.receptionBatchesService.create(
      req.user.userId,
      organizationId,
      createDto,
    );
  }

  @Patch(':id/quality-control')
  @ApiOperation({ summary: 'Update quality control (Step 2: Quality Check)' })
  @ApiResponse({ status: 200, description: 'Quality control updated successfully' })
  async updateQualityControl(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') batchId: string,
    @Body() updateDto: UpdateQualityControlDto,
  ) {
    return this.receptionBatchesService.updateQualityControl(
      req.user.userId,
      organizationId,
      batchId,
      updateDto,
    );
  }

  @Patch(':id/decision')
  @ApiOperation({ summary: 'Make reception decision (Step 3: Decision Making)' })
  @ApiResponse({ status: 200, description: 'Decision made successfully' })
  async makeDecision(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') batchId: string,
    @Body() decisionDto: MakeReceptionDecisionDto,
  ) {
    return this.receptionBatchesService.makeDecision(
      req.user.userId,
      organizationId,
      batchId,
      decisionDto,
    );
  }

  @Post(':id/process-payment')
  @ApiOperation({ summary: 'Process payment and journal entry (Step 4: Financial Processing)' })
  @ApiResponse({ status: 200, description: 'Payment processed successfully' })
  async processPayment(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') batchId: string,
    @Body() paymentDto: ProcessReceptionPaymentDto,
  ) {
    return this.receptionBatchesService.processPayment(
      req.user.userId,
      organizationId,
      batchId,
      paymentDto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all reception batches with optional filters' })
  @ApiResponse({ status: 200, description: 'Reception batches retrieved successfully' })
  async findAll(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Query() filters: ReceptionBatchFiltersDto,
  ) {
    return this.receptionBatchesService.findAll(
      req.user.userId,
      organizationId,
      filters,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single reception batch by ID' })
  @ApiResponse({ status: 200, description: 'Reception batch retrieved successfully' })
  async findOne(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') batchId: string,
  ) {
    return this.receptionBatchesService.findOne(
      req.user.userId,
      organizationId,
      batchId,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel reception batch' })
  @ApiResponse({ status: 200, description: 'Reception batch cancelled successfully' })
  async cancel(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') batchId: string,
  ) {
    return this.receptionBatchesService.cancel(
      req.user.userId,
      organizationId,
      batchId,
    );
  }
}
