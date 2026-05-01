import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { SatelliteProxyService } from '../satellite-indices/satellite-proxy.service';
import { WeatherService } from './weather.service';

@ApiTags('weather')
@ApiBearerAuth()
@Controller('weather')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class WeatherController {
  constructor(
    private readonly weatherService: WeatherService,
    private readonly satelliteProxy: SatelliteProxyService,
  ) {}

  @Get('parcel/:parcelId/phenological-counters')
  @ApiOperation({
    summary: 'Phenological hour-counters for a parcel',
    description:
      'Real-hourly counts of temperature thresholds per growth stage (chill hours, frost risk, heat stress, etc), driven by the crop referentiel. Single source of truth — also used by calibration step 2.',
  })
  @ApiParam({ name: 'parcelId', description: 'Parcel ID' })
  @ApiQuery({ name: 'year', required: false, description: 'Calendar year (defaults to current)' })
  async getPhenologicalCounters(
    @Req() req: any,
    @Param('parcelId') parcelId: string,
    @Query('year') yearParam?: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
    const parcelMeta = await this.weatherService.getParcelMeta(parcelId, organizationId);
    if (!parcelMeta) {
      throw new Error(`Parcel ${parcelId} not found or no boundary`);
    }
    const { lat, lon, cropType } = parcelMeta;
    return this.satelliteProxy.get(
      '/weather/phenological-counters',
      { latitude: String(lat), longitude: String(lon), year: String(year), crop_type: cropType },
      organizationId,
      req.headers?.authorization?.replace(/^Bearer\s+/i, ''),
    );
  }

  @Get('parcel/:parcelId')
  @ApiOperation({
    summary: 'Get full weather analytics for a parcel',
    description:
      'Returns current conditions, 7-day forecast, daily historical data, monthly aggregates with LTN comparison, and temperature time series. Data sourced from Open-Meteo API using parcel centroid coordinates.',
  })
  @ApiParam({ name: 'parcelId', description: 'Parcel ID' })
  @ApiQuery({ name: 'start_date', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'end_date', required: true, description: 'End date (YYYY-MM-DD)' })
  async getParcelWeather(
    @Req() req: any,
    @Param('parcelId') parcelId: string,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.weatherService.getParcelWeather(
      parcelId,
      organizationId,
      startDate,
      endDate,
    );
  }
}
