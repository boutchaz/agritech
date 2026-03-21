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
import { WeatherService } from './weather.service';

@ApiTags('weather')
@ApiBearerAuth()
@Controller('weather')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

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
