import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Patch,
    Delete,
    Query,
    UseGuards,
    Headers,
    BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import {
    CreatePaymentDto,
    AllocatePaymentDto,
    UpdatePaymentStatusDto,
} from './dto';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new payment' })
    @ApiResponse({
        status: 201,
        description: 'Payment created successfully',
    })
    @ApiResponse({ status: 400, description: 'Bad request' })
    async create(
        @Body() createPaymentDto: CreatePaymentDto,
        @Headers('x-organization-id') organizationId: string,
        @Headers('x-user-id') userId: string,
    ) {
        if (!organizationId || !userId) {
            throw new BadRequestException('Organization ID and User ID are required');
        }

        return this.paymentsService.create(
            createPaymentDto,
            organizationId,
            userId,
        );
    }

    @Post(':id/allocate')
    @ApiOperation({
        summary: 'Allocate payment to invoices (creates journal entry)',
        description: 'Allocates a payment to one or more invoices and creates corresponding double-entry journal entry. Replaces the allocate-payment Edge Function.',
    })
    @ApiParam({ name: 'id', description: 'Payment UUID' })
    @ApiResponse({
        status: 200,
        description: 'Payment allocated successfully with journal entry created',
    })
    @ApiResponse({ status: 404, description: 'Payment not found' })
    @ApiResponse({ status: 400, description: 'Invalid allocation or missing GL accounts' })
    async allocatePayment(
        @Param('id') id: string,
        @Body() allocatePaymentDto: AllocatePaymentDto,
        @Headers('x-organization-id') organizationId: string,
        @Headers('x-user-id') userId: string,
    ) {
        if (!organizationId || !userId) {
            throw new BadRequestException('Organization ID and User ID are required');
        }

        return this.paymentsService.allocatePayment(
            id,
            allocatePaymentDto,
            organizationId,
            userId,
        );
    }

    @Get()
    @ApiOperation({ summary: 'Get all payments with optional filters' })
    @ApiQuery({ name: 'payment_type', required: false, enum: ['receive', 'pay'] })
    @ApiQuery({ name: 'status', required: false, enum: ['draft', 'submitted', 'reconciled', 'cancelled'] })
    @ApiQuery({ name: 'date_from', required: false, type: String })
    @ApiQuery({ name: 'date_to', required: false, type: String })
    @ApiResponse({
        status: 200,
        description: 'List of payments retrieved successfully',
    })
    async findAll(
        @Query() filters: any,
        @Headers('x-organization-id') organizationId: string,
    ) {
        if (!organizationId) {
            throw new BadRequestException('Organization ID is required');
        }

        return this.paymentsService.findAll(organizationId, filters);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a single payment by ID' })
    @ApiParam({ name: 'id', description: 'Payment UUID' })
    @ApiResponse({
        status: 200,
        description: 'Payment retrieved successfully',
    })
    @ApiResponse({ status: 404, description: 'Payment not found' })
    async findOne(
        @Param('id') id: string,
        @Headers('x-organization-id') organizationId: string,
    ) {
        if (!organizationId) {
            throw new BadRequestException('Organization ID is required');
        }

        return this.paymentsService.findOne(id, organizationId);
    }

    @Patch(':id/status')
    @ApiOperation({ summary: 'Update payment status' })
    @ApiParam({ name: 'id', description: 'Payment UUID' })
    @ApiResponse({
        status: 200,
        description: 'Payment status updated successfully',
    })
    @ApiResponse({ status: 404, description: 'Payment not found' })
    @ApiResponse({ status: 400, description: 'Invalid status transition' })
    async updateStatus(
        @Param('id') id: string,
        @Body() updateStatusDto: UpdatePaymentStatusDto,
        @Headers('x-organization-id') organizationId: string,
    ) {
        if (!organizationId) {
            throw new BadRequestException('Organization ID is required');
        }

        return this.paymentsService.updateStatus(id, updateStatusDto, organizationId);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a payment (only drafts without allocations)' })
    @ApiParam({ name: 'id', description: 'Payment UUID' })
    @ApiResponse({
        status: 200,
        description: 'Payment deleted successfully',
    })
    @ApiResponse({ status: 404, description: 'Payment not found' })
    @ApiResponse({ status: 400, description: 'Cannot delete payment' })
    async delete(
        @Param('id') id: string,
        @Headers('x-organization-id') organizationId: string,
    ) {
        if (!organizationId) {
            throw new BadRequestException('Organization ID is required');
        }

        return this.paymentsService.delete(id, organizationId);
    }
}
