import {
  Controller,
  Get,
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
import { InvoiceFiltersDto, UpdateInvoiceStatusDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';

@ApiTags('invoices')
@ApiBearerAuth()
@Controller('invoices')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
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

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update invoice status' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({
    status: 200,
    description: 'Invoice status updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async updateStatus(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceStatusDto,
  ) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.sub;
    return this.invoicesService.updateStatus(id, organizationId, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an invoice (only drafts)' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiResponse({
    status: 200,
    description: 'Invoice deleted successfully',
  })
  @ApiResponse({ status: 400, description: 'Cannot delete non-draft invoices' })
  async delete(@Req() req, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.invoicesService.delete(id, organizationId);
  }
}
