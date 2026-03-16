import {
  BadRequestException,
  Body,
  Controller,
  Get,
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
import { OrganizationGuard } from "../../common/guards/organization.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CloseSeasonDto } from "./dto/close-season.dto";
import { CreateSeasonDto } from "./dto/create-season.dto";
import { SeasonRecord, SeasonTrackingService } from "./season-tracking.service";

@ApiTags("season-tracking")
@ApiBearerAuth()
@Controller("parcels/:parcelId/seasons")
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class SeasonTrackingController {
  constructor(private readonly seasonTrackingService: SeasonTrackingService) {}

  @Post()
  @ApiOperation({ summary: "Create a season record for a parcel" })
  @ApiResponse({ status: 201, description: "Season created successfully" })
  async createSeason(
    @Param("parcelId") parcelId: string,
    @Body() dto: CreateSeasonDto,
    @Req() req: Request,
  ): Promise<SeasonRecord> {
    const organizationId = this.getOrganizationId(req);
    const userId = this.getUserId(req);
    return this.seasonTrackingService.createSeason(
      userId,
      parcelId,
      organizationId,
      dto,
    );
  }

  @Get()
  @ApiOperation({ summary: "List seasons for a parcel" })
  @ApiResponse({ status: 200, description: "Seasons retrieved successfully" })
  async listSeasons(
    @Param("parcelId") parcelId: string,
    @Req() req: Request,
  ): Promise<SeasonRecord[]> {
    const organizationId = this.getOrganizationId(req);
    return this.seasonTrackingService.listSeasons(parcelId, organizationId);
  }

  @Get(":seasonId")
  @ApiOperation({ summary: "Get a single season record" })
  @ApiResponse({ status: 200, description: "Season retrieved successfully" })
  async getSeason(
    @Param("seasonId") seasonId: string,
    @Req() req: Request,
  ): Promise<SeasonRecord> {
    const organizationId = this.getOrganizationId(req);
    return this.seasonTrackingService.getSeason(seasonId, organizationId);
  }

  @Post(":seasonId/close")
  @ApiOperation({ summary: "Close a season and trigger F3 recalibration" })
  @ApiResponse({ status: 200, description: "Season closed successfully" })
  async closeSeason(
    @Param("parcelId") parcelId: string,
    @Param("seasonId") seasonId: string,
    @Body() dto: CloseSeasonDto,
    @Req() req: Request,
  ): Promise<SeasonRecord> {
    const organizationId = this.getOrganizationId(req);
    const userId = this.getUserId(req);
    return this.seasonTrackingService.closeSeason(
      userId,
      seasonId,
      parcelId,
      organizationId,
      dto,
    );
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

  private getUserId(req: Request): string {
    const requestUser = (req as Request & { user?: unknown }).user;
    const candidateUser =
      requestUser && typeof requestUser === "object"
        ? (requestUser as {
            id?: unknown;
            sub?: unknown;
            userId?: unknown;
          })
        : undefined;

    const userId =
      typeof candidateUser?.id === "string"
        ? candidateUser.id
        : typeof candidateUser?.sub === "string"
          ? candidateUser.sub
          : typeof candidateUser?.userId === "string"
            ? candidateUser.userId
            : undefined;

    const normalizedUserId = userId?.trim();

    if (!normalizedUserId) {
      throw new BadRequestException("User ID is required");
    }

    return normalizedUserId;
  }
}
