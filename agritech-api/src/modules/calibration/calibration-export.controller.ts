import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Request, Response } from "express";
import { OrganizationGuard } from "../../common/guards/organization.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PoliciesGuard } from "../casl/policies.guard";
import { CanReadParcels } from "../casl/permissions.decorator";
import { CalibrationExportService } from "./calibration-export.service";

@ApiTags("calibration-export")
@ApiBearerAuth()
@Controller("calibrations/:calibrationId/export")
@UseGuards(JwtAuthGuard, OrganizationGuard, PoliciesGuard)
@CanReadParcels()
export class CalibrationExportController {
  constructor(
    private readonly calibrationExportService: CalibrationExportService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Export calibration data in json, csv, or zip format" })
  @ApiQuery({ name: "format", required: false, enum: ["json", "csv", "zip"] })
  @ApiResponse({ status: 200, description: "Calibration exported" })
  async exportCalibration(
    @Param("calibrationId") calibrationId: string,
    @Query("format") format: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const organizationId = this.getOrganizationId(req);
    const normalizedFormat = (format ?? "json").toLowerCase();
    const exportData = await this.calibrationExportService.getExportData(
      calibrationId,
      organizationId,
    );

    switch (normalizedFormat) {
      case "json": {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return this.calibrationExportService.generateJsonExport(exportData);
      }

      case "csv": {
        const csv = this.calibrationExportService.generateCsvExport(exportData);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="calibration-${calibrationId}.csv"`,
        );
        res.send(csv);
        return;
      }

      case "zip": {
        const zipStream = this.calibrationExportService.generateZipExport(exportData);
        res.setHeader("Content-Type", "application/zip");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="calibration-${calibrationId}.zip"`,
        );
        zipStream.pipe(res);
        return;
      }

      default:
        throw new BadRequestException(
          "Unsupported export format. Allowed formats: json, csv, zip",
        );
    }
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
