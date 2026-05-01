import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { InvoiceFiltersDto, UpdateInvoiceStatusDto, CreateInvoiceDto, UpdateInvoiceDto, CreateCreditNoteDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { ModuleEntitlementGuard } from '../../common/guards/module-entitlement.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import {
  CanReadInvoices,
  CanCreateInvoice,
  CanUpdateInvoice,
  CanDeleteInvoice,
} from '../casl/permissions.decorator';

@ApiTags('invoices')
@ApiBearerAuth()
@Controller('invoices')
@RequireModule('accounting')
@UseGuards(JwtAuthGuard, OrganizationGuard, ModuleEntitlementGuard, PoliciesGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @CanReadInvoices()
  @ApiOperation({ summary: 'Get all invoices with filters' })
  @ApiQuery({ name: 'invoice_type', enum: ['sales', 'purchase'], required: false })
  @ApiQuery({ name: 'status', enum: ['draft', 'submitted', 'paid', 'partially_paid', 'overdue', 'cancelled'], required: false })
  @ApiQuery({ name: 'party_id', required: false })
  @ApiQuery({ name: 'party_name', required: false })
  @ApiQuery({ name: 'invoice_number', required: false })
  @ApiQuery({ name: 'date_from', required: false })
  @ApiQuery({ name: 'date_to', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({
    status: 200,
    description: 'Invoices retrieved successfully',
  })
  async findAll(@Req() req, @Query() filters: InvoiceFiltersDto) {
    const organizationId = req.headers['x-organization-id'];
    return this.invoicesService.findAll(organizationId, filters);
  }

  @Get(':id')
  @CanReadInvoices()
  @ApiOperation({ summary: 'Get a single invoice by ID with items' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({
    status: 200,
    description: 'Invoice retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async findOne(@Req() req, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.invoicesService.findOne(id, organizationId);
  }

  @Post()
  @CanCreateInvoice()
  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiResponse({
    status: 201,
    description: 'Invoice created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to create invoices' })
  async create(@Req() req, @Body() dto: CreateInvoiceDto) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.id || req.user.sub;
    return this.invoicesService.create(dto, organizationId, userId);
  }

  @Post(':id/post')
  @CanUpdateInvoice()
  @ApiOperation({
    summary: 'Post an invoice (creates journal entry)',
    description: 'Submits a draft invoice and creates corresponding double-entry journal entry. Replaces the post-invoice Edge Function.',
  })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({
    status: 200,
    description: 'Invoice posted successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid invoice or missing accounts' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to post invoices' })
  async postInvoice(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: { posting_date: string },
  ) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.id || req.user.sub;
    return this.invoicesService.postInvoice(id, organizationId, userId, dto.posting_date);
  }

  @Post(':id/credit-notes')
  @CanCreateInvoice()
  @ApiOperation({
    summary: 'Create a credit note (avoir) against a posted invoice',
    description:
      'Posts an inverse journal entry and optionally restores stock (Material Receipt for sales credits, Material Issue for purchase credits). Cumulative credits cannot exceed the original grand_total.',
  })
  @ApiParam({ name: 'id', description: 'Original invoice ID' })
  @ApiResponse({ status: 201, description: 'Credit note created and posted' })
  @ApiResponse({ status: 400, description: 'Original not posted, exceeds uncredited balance, or missing account mapping' })
  async createCreditNote(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: CreateCreditNoteDto,
  ) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.id || req.user.sub;
    return this.invoicesService.createCreditNote(id, dto, organizationId, userId);
  }

  @Patch(':id')
  @CanUpdateInvoice()
  @ApiOperation({ summary: 'Update a draft invoice' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({
    status: 200,
    description: 'Invoice updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Only draft invoices can be edited' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to update invoices' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.invoicesService.update(id, organizationId, dto);
  }

  @Patch(':id/status')
  @CanUpdateInvoice()
  @ApiOperation({ summary: 'Update invoice status' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({
    status: 200,
    description: 'Invoice status updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to update invoice status' })
  async updateStatus(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceStatusDto,
  ) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.id || req.user.sub;
    return this.invoicesService.updateStatus(id, organizationId, userId, dto);
  }

  @Delete(':id')
  @CanDeleteInvoice()
  @ApiOperation({ summary: 'Delete an invoice (only drafts)' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({
    status: 200,
    description: 'Invoice deleted successfully',
  })
  @ApiResponse({ status: 400, description: 'Cannot delete non-draft invoices' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to delete invoices' })
  async delete(@Req() req, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.invoicesService.delete(id, organizationId);
  }

  @Post(':id/send-email')
  @CanUpdateInvoice()
  @ApiOperation({
    summary: 'Send invoice email to customer/supplier',
    description: 'Sends the invoice details via email to the party. Can optionally specify a different recipient email.',
  })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({
    status: 200,
    description: 'Invoice email sent successfully',
  })
  @ApiResponse({ status: 400, description: 'No email address found for party' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions to send invoices' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async sendEmail(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: { email?: string },
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.invoicesService.sendInvoiceEmail(id, organizationId, dto.email);
  }
}
