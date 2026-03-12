import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { CalibrationService } from './calibration.service';
import { StartCalibrationDto } from './dto/start-calibration.dto';

@ApiTags('calibration')
@ApiBearerAuth()
@Controller('parcels/:parcelId/calibration')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class CalibrationController {
  constructor(private readonly calibrationService: CalibrationService) {}

  @Post('start')
  @ApiOperation({ summary: 'Trigger the calibration pipeline for a parcel' })
  @ApiResponse({ status: 201, description: 'Calibration completed successfully' })
  async startCalibration(
    @Param('parcelId') parcelId: string,
    @Body() dto: StartCalibrationDto,
    @Req() req: Request,
  ) {
    const organizationId = this.getOrganizationId(req);
    return this.calibrationService.startCalibration(parcelId, organizationId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get the latest calibration for a parcel' })
  @ApiResponse({ status: 200, description: 'Latest calibration retrieved successfully' })
  async getLatestCalibration(
    @Param('parcelId') parcelId: string,
    @Req() req: Request,
  ) {
    const organizationId = this.getOrganizationId(req);
    return this.calibrationService.getLatestCalibration(parcelId, organizationId);
  }

  @Get('report')
  @ApiOperation({ summary: 'Get the full calibration report for a parcel' })
  @ApiResponse({ status: 200, description: 'Calibration report retrieved successfully' })
  async getCalibrationReport(
    @Param('parcelId') parcelId: string,
    @Req() req: Request,
  ) {
    const organizationId = this.getOrganizationId(req);
    return this.calibrationService.getCalibrationReport(parcelId, organizationId);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Mark the latest parcel calibration as validated' })
  @ApiResponse({ status: 200, description: 'Calibration validated successfully' })
  async validateCalibration(
    @Param('parcelId') parcelId: string,
    @Req() req: Request,
  ) {
    const organizationId = this.getOrganizationId(req);
    const latestCalibration = await this.calibrationService.getLatestCalibration(
      parcelId,
      organizationId,
    );

    if (!latestCalibration) {
      throw new NotFoundException('Calibration not found');
    }

    return this.calibrationService.validateCalibration(
      latestCalibration.id,
      organizationId,
    );
  }

  @Get('percentiles')
  @ApiOperation({ summary: 'Get NDVI percentiles for a parcel' })
  @ApiResponse({ status: 200, description: 'NDVI percentiles retrieved successfully' })
  async getPercentiles(
    @Param('parcelId') parcelId: string,
    @Req() req: Request,
  ) {
    const organizationId = this.getOrganizationId(req);
    return this.calibrationService.getPercentiles(parcelId, organizationId);
  }

  @Get('zones')
  @ApiOperation({ summary: 'Get NDVI zone classification for a parcel' })
  @ApiResponse({ status: 200, description: 'Zone classification retrieved successfully' })
  async getZones(
    @Param('parcelId') parcelId: string,
    @Req() req: Request,
  ) {
    const organizationId = this.getOrganizationId(req);
    return this.calibrationService.getZones(parcelId, organizationId);
  }

  private getOrganizationId(req: Request): string {
    const requestOrganizationId = (req as Request & { organizationId?: unknown }).organizationId;
    const headerValue = req.headers['x-organization-id'];
    const headerOrganizationId = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    const organizationId =
      typeof requestOrganizationId === 'string' && requestOrganizationId.trim().length > 0
        ? requestOrganizationId
        : typeof headerOrganizationId === 'string'
          ? headerOrganizationId
          : undefined;

    const normalizedOrganizationId = organizationId?.trim();

    if (
      !normalizedOrganizationId ||
      normalizedOrganizationId === 'undefined' ||
      normalizedOrganizationId === 'null'
    ) {
      throw new BadRequestException('Organization ID is required');
    }

    return normalizedOrganizationId;
  }
}
