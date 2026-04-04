import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SatelliteProxyService } from './satellite-proxy.service';
import { SatelliteCacheService } from './satellite-cache.service';
import { SatelliteSyncService } from './satellite-sync.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';

@ApiTags('satellite-proxy')
@ApiBearerAuth()
@Controller('satellite-proxy')
@UseGuards(JwtAuthGuard, OrganizationGuard)
@UsePipes(new ValidationPipe({ transform: false, whitelist: false, forbidNonWhitelisted: false }))
export class SatelliteProxyController {
  constructor(
    private readonly proxy: SatelliteProxyService,
    private readonly cache: SatelliteCacheService,
    private readonly sync: SatelliteSyncService,
  ) {}

  // ── Indices ────────────────────────────────────────────

  @Post('indices/calculate')
  @ApiOperation({ summary: 'Calculate vegetation indices for an AOI' })
  async calculateIndices(@Req() req, @Body() body: Record<string, unknown>) {
    return this.proxy.post('/indices/calculate', body, req.headers['x-organization-id'], undefined, undefined, req.rawToken);
  }

  @Post('indices/timeseries')
  @ApiOperation({ summary: 'Get time series data (cache-first, falls back to satellite provider)' })
  async getTimeSeries(@Req() req, @Body() body: Record<string, unknown>) {
    return this.cache.getTimeSeries(
      body,
      req.headers['x-organization-id'],
      req.rawToken,
    );
  }

  @Post('indices/heatmap')
  @ApiOperation({ summary: 'Get heatmap pixel data (cached 24h per parcel/index/date)' })
  async getHeatmap(@Req() req, @Body() body: Record<string, unknown>) {
    return this.cache.getHeatmap(
      body,
      req.headers['x-organization-id'],
      req.rawToken,
    );
  }

  @Post('indices/interactive')
  @ApiOperation({ summary: 'Get interactive visualization data' })
  async getInteractiveData(@Req() req, @Body() body: Record<string, unknown>) {
    return this.proxy.post('/indices/interactive', body, req.headers['x-organization-id'], undefined, undefined, req.rawToken);
  }

  @Post('indices/export')
  @ApiOperation({ summary: 'Export satellite data as GeoTIFF' })
  async exportData(@Req() req, @Body() body: Record<string, unknown>) {
    return this.proxy.post('/indices/export', body, req.headers['x-organization-id'], undefined, undefined, req.rawToken);
  }

  @Post('indices/bulk-export')
  @ApiOperation({ summary: 'Bulk export TIFFs for multiple indices' })
  async bulkExport(@Req() req, @Body() body: Record<string, unknown>) {
    return this.proxy.post('/indices/bulk-export', body, req.headers['x-organization-id'], undefined, undefined, req.rawToken);
  }

  @Post('indices/available-dates')
  @ApiOperation({ summary: 'Get available satellite imagery dates (cached: permanent for past months, 24h for current)' })
  async getAvailableDates(@Req() req, @Body() body: Record<string, unknown>) {
    return this.cache.getAvailableDates(
      body,
      req.headers['x-organization-id'],
      req.rawToken,
    );
  }

  @Get('indices/available')
  @ApiOperation({ summary: 'List available vegetation index types' })
  async getAvailableIndices(@Req() req) {
    return this.proxy.get('/indices/available', undefined, req.headers['x-organization-id'], req.rawToken);
  }

  @Get('indices/provider-info')
  @ApiOperation({ summary: 'Get satellite data provider information' })
  async getProviderInfo(@Req() req) {
    return this.proxy.get('/indices/provider-info', undefined, req.headers['x-organization-id'], req.rawToken);
  }

  // ── Analysis ───────────────────────────────────────────

  @Post('analysis/cloud-coverage')
  @ApiOperation({ summary: 'Check cloud coverage for date range' })
  async checkCloudCoverage(@Req() req, @Body() body: Record<string, unknown>) {
    return this.proxy.post('/analysis/cloud-coverage', body, req.headers['x-organization-id'], undefined, undefined, req.rawToken);
  }

  @Post('analysis/parcel-statistics')
  @ApiOperation({ summary: 'Calculate comprehensive statistics for a parcel' })
  async parcelStatistics(@Req() req, @Body() body: Record<string, unknown>) {
    return this.proxy.post('/analysis/parcel-statistics', body, req.headers['x-organization-id'], undefined, undefined, req.rawToken);
  }

  @Post('analysis/generate-index-image')
  @ApiOperation({ summary: 'Generate a vegetation index image' })
  async generateIndexImage(@Req() req, @Body() body: Record<string, unknown>) {
    return this.proxy.post('/analysis/generate-index-image', body, req.headers['x-organization-id'], undefined, undefined, req.rawToken);
  }

  @Post('analysis/batch')
  @ApiOperation({ summary: 'Start a batch satellite processing job' })
  async startBatchProcessing(@Req() req, @Body() body: Record<string, unknown>) {
    return this.proxy.post('/analysis/batch', body, req.headers['x-organization-id'], undefined, undefined, req.rawToken);
  }

  @Get('analysis/batch/:jobId/status')
  @ApiOperation({ summary: 'Get batch processing job status' })
  async getBatchStatus(@Req() req, @Param('jobId') jobId: string) {
    return this.proxy.get(`/analysis/batch/${jobId}/status`, undefined, req.headers['x-organization-id'], req.rawToken);
  }

  // ── Supabase / Cached Data ─────────────────────────────

  @Get('supabase/parcels/:parcelId/satellite-data')
  @ApiOperation({ summary: 'Get cached satellite data for a parcel' })
  async getParcelSatelliteData(
    @Req() req,
    @Param('parcelId') parcelId: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('indices') indices?: string[],
  ) {
    const query: Record<string, string | string[] | undefined> = {};
    if (startDate) query.start_date = startDate;
    if (endDate) query.end_date = endDate;
    if (indices) query.indices = Array.isArray(indices) ? indices : [indices];
    return this.proxy.get(`/supabase/parcels/${parcelId}/satellite-data`, query, req.headers['x-organization-id'], req.rawToken);
  }

  @Get('supabase/parcels/:parcelId/latest-data')
  @ApiOperation({ summary: 'Get latest satellite data for a parcel' })
  async getLatestData(
    @Req() req,
    @Param('parcelId') parcelId: string,
    @Query('index_name') indexName?: string,
  ) {
    const query: Record<string, string | undefined> = {};
    if (indexName) query.index_name = indexName;
    return this.proxy.get(`/supabase/parcels/${parcelId}/latest-data`, query, req.headers['x-organization-id'], req.rawToken);
  }

  @Post('supabase/parcels/:parcelId/statistics')
  @ApiOperation({ summary: 'Get satellite data statistics for a parcel' })
  async getParcelStatistics(
    @Req() req,
    @Param('parcelId') parcelId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.proxy.post(`/supabase/parcels/${parcelId}/statistics`, body, req.headers['x-organization-id'], undefined, undefined, req.rawToken);
  }

  // ── Sync ───────────────────────────────────────────────

  @Get('sync/parcel/:parcelId/status')
  @ApiOperation({ summary: 'Get parcel satellite sync status' })
  async getSyncStatus(@Req() req, @Param('parcelId') parcelId: string) {
    return this.proxy.get(`/sync/parcel/${parcelId}/status`, undefined, req.headers['x-organization-id'], req.rawToken);
  }

  @Post('sync/parcel')
  @ApiOperation({ summary: 'Trigger parcel satellite data sync' })
  async triggerSync(@Req() req, @Body() body: Record<string, unknown>) {
    return this.proxy.post('/sync/parcel', body, req.headers['x-organization-id'], undefined, undefined, req.rawToken);
  }

  // ── Weather ────────────────────────────────────────────

  @Get('weather/historical')
  @ApiOperation({ summary: 'Get historical weather data' })
  async getHistoricalWeather(
    @Req() req,
    @Query() query: Record<string, string>,
  ) {
    return this.proxy.get('/weather/historical', query, req.headers['x-organization-id'], req.rawToken);
  }

  @Get('weather/forecast')
  @ApiOperation({ summary: 'Get weather forecast' })
  async getWeatherForecast(
    @Req() req,
    @Query() query: Record<string, string>,
  ) {
    return this.proxy.get('/weather/forecast', query, req.headers['x-organization-id'], req.rawToken);
  }

  @Post('weather/derived')
  @ApiOperation({ summary: 'Get derived weather calculations (GDD, chill hours)' })
  async getDerivedWeather(@Req() req, @Body() body: Record<string, unknown>) {
    return this.proxy.post('/weather/derived', body, req.headers['x-organization-id'], undefined, undefined, req.rawToken);
  }

  @Get('weather/parcel/:parcelId')
  @ApiOperation({ summary: 'Get weather data for a parcel centroid' })
  async getParcelWeather(
    @Req() req,
    @Param('parcelId') parcelId: string,
    @Query() query: Record<string, string>,
  ) {
    return this.proxy.get(`/weather/parcel/${parcelId}`, query, req.headers['x-organization-id'], req.rawToken);
  }

  // ── Per-Parcel Async Sync ────────────────────────────────

  @Post('indices/timeseries-sync')
  @ApiOperation({ summary: 'Start async timeseries sync for a parcel (returns immediately)' })
  async startTimeSeriesSync(@Req() req, @Body() body: Record<string, unknown>) {
    const progress = this.cache.startParcelSync(
      body,
      req.headers['x-organization-id'],
      req.rawToken,
    );
    return progress;
  }

  @Get('indices/timeseries-sync/:parcelId/status')
  @ApiOperation({ summary: 'Poll timeseries sync progress for a parcel' })
  async getTimeSeriesSyncStatus(@Param('parcelId') parcelId: string) {
    return this.cache.getParcelSyncProgress(parcelId);
  }

  // ── Cache Warmup ────────────────────────────────────────

  @Post('cache/warmup')
  @ApiOperation({ summary: 'Trigger full cache warmup for all parcels (runs in background)' })
  async triggerCacheWarmup() {
    const progress = this.sync.getProgress();
    if (progress.status === 'running') {
      return { message: 'Sync already in progress', ...progress };
    }
    this.sync.runFullSync();
    return { message: 'Cache warmup started', status: 'running' };
  }

  @Get('cache/warmup/status')
  @ApiOperation({ summary: 'Get cache warmup progress' })
  async getCacheWarmupStatus() {
    return this.sync.getProgress();
  }

  // ── Billing / PDF Generation ───────────────────────────

  @Get('billing/quotes/:quoteId/pdf')
  @ApiOperation({ summary: 'Generate quote PDF' })
  async getQuotePdf(@Req() req, @Res() res: Response, @Param('quoteId') quoteId: string) {
    const { buffer, contentType } = await this.proxy.proxyRaw('GET', `/billing/quotes/${quoteId}/pdf`, {
      organizationId: req.headers['x-organization-id'],
      authToken: req.rawToken,
    });
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="quote-${quoteId}.pdf"`);
    res.send(buffer);
  }

  @Get('billing/invoices/:invoiceId/pdf')
  @ApiOperation({ summary: 'Generate invoice PDF' })
  async getInvoicePdf(@Req() req, @Res() res: Response, @Param('invoiceId') invoiceId: string) {
    const { buffer, contentType } = await this.proxy.proxyRaw('GET', `/billing/invoices/${invoiceId}/pdf`, {
      organizationId: req.headers['x-organization-id'],
      authToken: req.rawToken,
    });
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="invoice-${invoiceId}.pdf"`);
    res.send(buffer);
  }

  @Get('billing/purchase-orders/:poId/pdf')
  @ApiOperation({ summary: 'Generate purchase order PDF' })
  async getPurchaseOrderPdf(@Req() req, @Res() res: Response, @Param('poId') poId: string) {
    const { buffer, contentType } = await this.proxy.proxyRaw('GET', `/billing/purchase-orders/${poId}/pdf`, {
      organizationId: req.headers['x-organization-id'],
      authToken: req.rawToken,
    });
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="po-${poId}.pdf"`);
    res.send(buffer);
  }

  // ── Health ─────────────────────────────────────────────

  @Get('health')
  @ApiOperation({ summary: 'Satellite service health check' })
  async getHealth(@Req() req) {
    return this.proxy.get('/health/', undefined, req.headers['x-organization-id'], req.rawToken);
  }
}
