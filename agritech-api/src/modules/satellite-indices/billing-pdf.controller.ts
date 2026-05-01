import { Controller, Get, Query, Req, Res, Param, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SatelliteProxyService } from './satellite-proxy.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';

@ApiTags('billing-pdf')
@ApiBearerAuth()
@Controller('satellite-proxy')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class BillingPdfController {
  constructor(private readonly proxy: SatelliteProxyService) {}

  private buildPdfQueryParams(templateId?: string, paperSize?: string, compactTables?: string, repeatHeaderFooter?: string): string {
    const params = new URLSearchParams();
    if (templateId) params.set('template_id', templateId);
    if (paperSize) params.set('paper_size', paperSize);
    if (compactTables) params.set('compact_tables', compactTables);
    if (repeatHeaderFooter) params.set('repeat_header_footer', repeatHeaderFooter);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }

  @Get('billing/quotes/:quoteId/pdf')
  @ApiOperation({ summary: 'Generate quote PDF' })
  async getQuotePdf(
    @Req() req,
    @Res() res: Response,
    @Param('quoteId') quoteId: string,
    @Query('template_id') templateId?: string,
    @Query('paper_size') paperSize?: string,
    @Query('compact_tables') compactTables?: string,
    @Query('repeat_header_footer') repeatHeaderFooter?: string,
  ) {
    const qs = this.buildPdfQueryParams(templateId, paperSize, compactTables, repeatHeaderFooter);
    const { buffer, contentType } = await this.proxy.proxyRaw('GET', `/billing/quotes/${quoteId}/pdf${qs}`, {
      organizationId: req.headers['x-organization-id'],
      authToken: req.rawToken,
    });
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="quote-${quoteId}.pdf"`);
    res.send(buffer);
  }

  @Get('billing/invoices/:invoiceId/pdf')
  @ApiOperation({ summary: 'Generate invoice PDF' })
  async getInvoicePdf(
    @Req() req,
    @Res() res: Response,
    @Param('invoiceId') invoiceId: string,
    @Query('template_id') templateId?: string,
    @Query('paper_size') paperSize?: string,
    @Query('compact_tables') compactTables?: string,
    @Query('repeat_header_footer') repeatHeaderFooter?: string,
  ) {
    const qs = this.buildPdfQueryParams(templateId, paperSize, compactTables, repeatHeaderFooter);
    const { buffer, contentType } = await this.proxy.proxyRaw('GET', `/billing/invoices/${invoiceId}/pdf${qs}`, {
      organizationId: req.headers['x-organization-id'],
      authToken: req.rawToken,
    });
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="invoice-${invoiceId}.pdf"`);
    res.send(buffer);
  }

  @Get('billing/purchase-orders/:poId/pdf')
  @ApiOperation({ summary: 'Generate purchase order PDF' })
  async getPurchaseOrderPdf(
    @Req() req,
    @Res() res: Response,
    @Param('poId') poId: string,
    @Query('template_id') templateId?: string,
    @Query('paper_size') paperSize?: string,
    @Query('compact_tables') compactTables?: string,
    @Query('repeat_header_footer') repeatHeaderFooter?: string,
  ) {
    const qs = this.buildPdfQueryParams(templateId, paperSize, compactTables, repeatHeaderFooter);
    const { buffer, contentType } = await this.proxy.proxyRaw('GET', `/billing/purchase-orders/${poId}/pdf${qs}`, {
      organizationId: req.headers['x-organization-id'],
      authToken: req.rawToken,
    });
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="po-${poId}.pdf"`);
    res.send(buffer);
  }
}
