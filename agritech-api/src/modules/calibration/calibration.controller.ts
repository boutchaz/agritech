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
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OrganizationGuard } from "../../common/guards/organization.guard";
import { CalibrationService } from "./calibration.service";
import { StartCalibrationDto } from "./dto/start-calibration.dto";
import { ConfirmNutritionOptionDto } from "./dto/confirm-nutrition-option.dto";

@ApiTags("calibration")
@ApiBearerAuth()
@Controller("parcels/:parcelId/calibration")
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class CalibrationController {
  constructor(private readonly calibrationService: CalibrationService) {}

  @Post("start")
  @ApiOperation({ summary: "Trigger the calibration pipeline for a parcel" })
  @ApiResponse({
    status: 201,
    description: "Calibration started successfully",
  })
  async startCalibration(
    @Param("parcelId") parcelId: string,
    @Body() dto: StartCalibrationDto,
    @Req() req: Request,
  ) {
    const organizationId = this.getOrganizationId(req);
    return this.calibrationService.startCalibration(
      parcelId,
      organizationId,
      dto,
    );
  }

  @Get("readiness")
  @ApiOperation({
    summary:
      "Check if parcel has enough data for calibration (F1 pre-launch check)",
  })
  @ApiResponse({ status: 200, description: "Readiness check completed" })
  async checkCalibrationReadiness(
    @Param("parcelId") parcelId: string,
    @Req() req: Request,
  ) {
    const organizationId = this.getOrganizationId(req);
    return this.calibrationService.checkCalibrationReadiness(
      parcelId,
      organizationId,
    );
  }

  @Get()
  @ApiOperation({ summary: "Get the latest calibration for a parcel" })
  @ApiResponse({
    status: 200,
    description: "Latest calibration retrieved successfully",
  })
  async getLatestCalibration(
    @Param("parcelId") parcelId: string,
    @Req() req: Request,
  ) {
    const organizationId = this.getOrganizationId(req);
    return this.calibrationService.getLatestCalibration(
      parcelId,
      organizationId,
    );
  }

  @Get("history")
  @ApiOperation({
    summary: "Get calibration history (last 5 runs) for a parcel",
  })
  @ApiResponse({
    status: 200,
    description: "Calibration history retrieved successfully",
  })
  async getCalibrationHistory(
    @Param("parcelId") parcelId: string,
    @Req() req: Request,
  ) {
    const organizationId = this.getOrganizationId(req);
    return this.calibrationService.getCalibrationHistory(
      parcelId,
      organizationId,
    );
  }

  @Get("report")
  @ApiOperation({ summary: "Get the full calibration report for a parcel" })
  @ApiResponse({
    status: 200,
    description: "Calibration report retrieved successfully",
  })
  async getCalibrationReport(
    @Param("parcelId") parcelId: string,
    @Req() req: Request,
  ) {
    const organizationId = this.getOrganizationId(req);
    return this.calibrationService.getCalibrationReport(
      parcelId,
      organizationId,
    );
  }

  @Post("validate")
  @ApiOperation({ summary: "Mark the latest parcel calibration as validated" })
  @ApiResponse({
    status: 200,
    description: "Calibration validated successfully",
  })
  async validateCalibration(
    @Param("parcelId") parcelId: string,
    @Req() req: Request,
  ) {
    const organizationId = this.getOrganizationId(req);
    const latestCalibration =
      await this.calibrationService.getLatestCalibration(
        parcelId,
        organizationId,
      );

    if (!latestCalibration) {
      throw new NotFoundException("Calibration not found");
    }

    return this.calibrationService.validateCalibration(
      latestCalibration.id,
      organizationId,
    );
  }

  @Post(":calibrationId/validate")
  @ApiOperation({ summary: "Validate a specific calibration by id" })
  @ApiResponse({
    status: 200,
    description: "Calibration validated successfully",
  })
  async validateCalibrationById(
    @Param("calibrationId") calibrationId: string,
    @Req() req: Request,
  ) {
    const organizationId = this.getOrganizationId(req);
    return this.calibrationService.validateCalibration(
      calibrationId,
      organizationId,
    );
  }

  @Get("nutrition-suggestion")
  @ApiOperation({ summary: "Get nutrition option suggestion for a parcel" })
  @ApiResponse({
    status: 200,
    description: "Nutrition option suggestion retrieved successfully",
  })
  async getNutritionSuggestion(
    @Param("parcelId") parcelId: string,
    @Req() req: Request,
  ) {
    const organizationId = this.getOrganizationId(req);
    return this.calibrationService.getNutritionSuggestion(
      parcelId,
      organizationId,
    );
  }

  @Post(":calibrationId/nutrition-option")
  @ApiOperation({ summary: "Confirm nutrition option for a calibration" })
  @ApiResponse({
    status: 200,
    description: "Nutrition option confirmed successfully",
  })
  async confirmNutritionOption(
    @Param("calibrationId") calibrationId: string,
    @Body() dto: ConfirmNutritionOptionDto,
    @Req() req: Request,
  ) {
    const organizationId = this.getOrganizationId(req);
    return this.calibrationService.confirmNutritionOption(
      calibrationId,
      organizationId,
      dto.option,
    );
  }

  @Get("percentiles")
  @ApiOperation({ summary: "Get NDVI percentiles for a parcel" })
  @ApiResponse({
    status: 200,
    description: "NDVI percentiles retrieved successfully",
  })
  async getPercentiles(
    @Param("parcelId") parcelId: string,
    @Req() req: Request,
  ) {
    const organizationId = this.getOrganizationId(req);
    return this.calibrationService.getPercentiles(parcelId, organizationId);
  }

  @Get("zones")
  @ApiOperation({ summary: "Get NDVI zone classification for a parcel" })
  @ApiResponse({
    status: 200,
    description: "Zone classification retrieved successfully",
  })
  async getZones(@Param("parcelId") parcelId: string, @Req() req: Request) {
    const organizationId = this.getOrganizationId(req);
    return this.calibrationService.getZones(parcelId, organizationId);
  }

  private getOrganizationId(req: Request): string {
    const requestOrganizationId = (
      req as Request & { organizationId?: unknown }
    ).organizationId;
    const headerValue = req.headers["x-organization-id"];
    const headerOrganizationId = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue;

    const organizationId =
      typeof requestOrganizationId === "string" &&
      requestOrganizationId.trim().length > 0
        ? requestOrganizationId
        : typeof headerOrganizationId === "string"
          ? headerOrganizationId
          : undefined;

    const normalizedOrganizationId = organizationId?.trim();

    if (
      !normalizedOrganizationId ||
      normalizedOrganizationId === "undefined" ||
      normalizedOrganizationId === "null"
    ) {
      throw new BadRequestException("Organization ID is required");
    }

    return normalizedOrganizationId;
  }
}
