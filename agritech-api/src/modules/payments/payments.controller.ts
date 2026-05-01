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
    Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import {
    CreatePaymentDto,
    AllocatePaymentDto,
    UpdatePaymentStatusDto,
    PaginatedPaymentQueryDto,
    CreateAdvanceDto,
    ApplyAdvanceDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { ModuleEntitlementGuard } from '../../common/guards/module-entitlement.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import {
    CanCreatePayment,
    CanUpdatePayment,
    CanDeletePayment,
    CanReadPayments,
} from '../casl/permissions.decorator';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
@RequireModule('accounting')
@UseGuards(JwtAuthGuard, OrganizationGuard, ModuleEntitlementGuard, PoliciesGuard)
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Post()
    @CanCreatePayment()
    @ApiOperation({ summary: 'Create a new payment' })
    @ApiResponse({
        status: 201,
        description: 'Payment created successfully',
    })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions to create payments' })
    async create(
        @Req() req,
        @Body() createPaymentDto: CreatePaymentDto,
        @Headers('x-organization-id') organizationId: string,
    ) {
        if (!organizationId) {
            throw new BadRequestException('Organization ID is required');
        }

        // Get user ID from JWT token (attached by JwtAuthGuard)
        const userId = req.user?.id || req.user?.sub;
        if (!userId) {
            throw new BadRequestException('User ID not found in token');
        }

        return this.paymentsService.create(
            createPaymentDto,
            organizationId,
            userId,
        );
    }

    @Post(':id/allocate')
    @CanUpdatePayment()
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
    @ApiResponse({ status: 403, description: 'Insufficient permissions to allocate payments' })
    async allocatePayment(
        @Req() req,
        @Param('id') id: string,
        @Body() allocatePaymentDto: AllocatePaymentDto,
        @Headers('x-organization-id') organizationId: string,
    ) {
        if (!organizationId) {
            throw new BadRequestException('Organization ID is required');
        }

        // Get user ID from JWT token (attached by JwtAuthGuard)
        const userId = req.user?.id || req.user?.sub;
        if (!userId) {
            throw new BadRequestException('User ID not found in token');
        }

        return this.paymentsService.allocatePayment(
            id,
            allocatePaymentDto,
            organizationId,
            userId,
        );
    }

    @Get()
    @CanReadPayments()
    @ApiOperation({ summary: 'Get paginated payments with sorting, search, and filters' })
    @ApiResponse({
        status: 200,
        description: 'Paginated list of payments retrieved successfully',
    })
    @ApiResponse({ status: 403, description: 'Insufficient permissions to view payments' })
    async findAll(
        @Query() query: PaginatedPaymentQueryDto,
        @Headers('x-organization-id') organizationId: string,
    ) {
        if (!organizationId) {
            throw new BadRequestException('Organization ID is required');
        }

        return this.paymentsService.findAll(organizationId, query);
    }

    @Get(':id')
    @CanReadPayments()
    @ApiOperation({ summary: 'Get a single payment by ID' })
    @ApiParam({ name: 'id', description: 'Payment UUID' })
    @ApiResponse({
        status: 200,
        description: 'Payment retrieved successfully',
    })
    @ApiResponse({ status: 404, description: 'Payment not found' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions to view payments' })
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
    @CanUpdatePayment()
    @ApiOperation({ summary: 'Update payment status' })
    @ApiParam({ name: 'id', description: 'Payment UUID' })
    @ApiResponse({
        status: 200,
        description: 'Payment status updated successfully',
    })
    @ApiResponse({ status: 404, description: 'Payment not found' })
    @ApiResponse({ status: 400, description: 'Invalid status transition' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions to update payment status' })
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
    @CanDeletePayment()
    @ApiOperation({ summary: 'Delete a payment (only drafts without allocations)' })
    @ApiParam({ name: 'id', description: 'Payment UUID' })
    @ApiResponse({
        status: 200,
        description: 'Payment deleted successfully',
    })
    @ApiResponse({ status: 404, description: 'Payment not found' })
    @ApiResponse({ status: 400, description: 'Cannot delete payment' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions to delete payments' })
    async delete(
        @Param('id') id: string,
        @Headers('x-organization-id') organizationId: string,
    ) {
        if (!organizationId) {
            throw new BadRequestException('Organization ID is required');
        }

        return this.paymentsService.delete(id, organizationId);
    }

    // ----- Advance payments -----

    @Post('advances')
    @CanCreatePayment()
    @ApiOperation({ summary: 'Record an advance (customer prepayment or supplier advance)' })
    @ApiResponse({ status: 201, description: 'Advance recorded with GL posting' })
    async createAdvance(
        @Req() req,
        @Body() dto: CreateAdvanceDto,
        @Headers('x-organization-id') organizationId: string,
    ) {
        if (!organizationId) throw new BadRequestException('Organization ID is required');
        const userId = req.user?.id || req.user?.sub;
        if (!userId) throw new BadRequestException('User ID not found in token');
        return this.paymentsService.recordAdvance(dto, organizationId, userId);
    }

    @Post('advances/:id/apply')
    @CanUpdatePayment()
    @ApiOperation({ summary: 'Apply an open advance to one or more invoices' })
    @ApiParam({ name: 'id', description: 'Advance payment UUID' })
    @ApiResponse({ status: 200, description: 'Advance applied; allocations + JE created' })
    async applyAdvance(
        @Req() req,
        @Param('id') id: string,
        @Body() dto: ApplyAdvanceDto,
        @Headers('x-organization-id') organizationId: string,
    ) {
        if (!organizationId) throw new BadRequestException('Organization ID is required');
        const userId = req.user?.id || req.user?.sub;
        if (!userId) throw new BadRequestException('User ID not found in token');
        return this.paymentsService.applyAdvance(id, dto, organizationId, userId);
    }

    @Get('advances')
    @CanReadPayments()
    @ApiOperation({ summary: 'List open advances (with remaining balance)' })
    @ApiQuery({ name: 'party_id', required: false })
    @ApiQuery({ name: 'party_type', required: false, description: 'customer or supplier' })
    async listAdvances(
        @Headers('x-organization-id') organizationId: string,
        @Query('party_id') partyId?: string,
        @Query('party_type') partyType?: string,
    ) {
        if (!organizationId) throw new BadRequestException('Organization ID is required');
        return this.paymentsService.listOpenAdvances(organizationId, partyId, partyType);
    }
}
