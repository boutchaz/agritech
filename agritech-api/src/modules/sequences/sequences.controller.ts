import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { SequencesService, SequenceType } from './sequences.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { OrganizationId } from '../../common/decorators/organization.decorator';

class GenerateSequenceDto {
  sequenceType: SequenceType;
  prefix?: string;
}

@ApiTags('sequences')
@Controller('sequences')
@UseGuards(JwtAuthGuard, OrganizationGuard)
@ApiBearerAuth()
@ApiHeader({
  name: 'X-Organization-Id',
  description: 'Organization ID (required for multi-tenant operations)',
  required: true,
})
export class SequencesController {
  constructor(private sequencesService: SequencesService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate next sequence number' })
  @ApiResponse({ status: 200, description: 'Sequence generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not a member of organization' })
  async generateSequence(
    @OrganizationId() organizationId: string,
    @Body() dto: GenerateSequenceDto,
  ) {
    const sequence = await this.sequencesService.getNextSequence(
      organizationId,
      dto.sequenceType,
      dto.prefix,
    );
    return { sequence };
  }

  @Post('invoice')
  @ApiOperation({ summary: 'Generate invoice number' })
  @ApiResponse({ status: 200, description: 'Invoice number generated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not a member of organization' })
  async generateInvoiceNumber(@OrganizationId() organizationId: string) {
    const invoiceNumber =
      await this.sequencesService.generateInvoiceNumber(organizationId);
    return { invoiceNumber };
  }

  @Post('quote')
  @ApiOperation({ summary: 'Generate quote number' })
  @ApiResponse({ status: 200, description: 'Quote number generated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not a member of organization' })
  async generateQuoteNumber(@OrganizationId() organizationId: string) {
    const quoteNumber =
      await this.sequencesService.generateQuoteNumber(organizationId);
    return { quoteNumber };
  }

  @Post('sales-order')
  @ApiOperation({ summary: 'Generate sales order number' })
  @ApiResponse({ status: 200, description: 'Sales order number generated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not a member of organization' })
  async generateSalesOrderNumber(@OrganizationId() organizationId: string) {
    const salesOrderNumber =
      await this.sequencesService.generateSalesOrderNumber(organizationId);
    return { salesOrderNumber };
  }

  @Post('purchase-order')
  @ApiOperation({ summary: 'Generate purchase order number' })
  @ApiResponse({ status: 200, description: 'Purchase order number generated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not a member of organization' })
  async generatePurchaseOrderNumber(@OrganizationId() organizationId: string) {
    const purchaseOrderNumber =
      await this.sequencesService.generatePurchaseOrderNumber(organizationId);
    return { purchaseOrderNumber };
  }
}
