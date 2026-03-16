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
import { CreateParcelEventDto } from "./dto/create-parcel-event.dto";
import { ParcelEventsService } from "./parcel-events.service";

type AuthenticatedRequest = Request & {
  organizationId?: unknown;
  user?: {
    id?: unknown;
    sub?: unknown;
    userId?: unknown;
  };
};

@ApiTags("parcel-events")
@ApiBearerAuth()
@Controller("parcels/:parcelId/events")
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class ParcelEventsController {
  constructor(private readonly parcelEventsService: ParcelEventsService) {}

  @Post()
  @ApiOperation({ summary: "Create a parcel event" })
  @ApiResponse({
    status: 201,
    description: "Parcel event created successfully",
  })
  async createEvent(
    @Param("parcelId") parcelId: string,
    @Body() dto: CreateParcelEventDto,
    @Req() req: Request,
  ) {
    const organizationId = this.getOrganizationId(req);
    const userId = this.getUserId(req);

    return this.parcelEventsService.createEvent(
      userId,
      parcelId,
      organizationId,
      dto,
    );
  }

  @Get()
  @ApiOperation({ summary: "List parcel events" })
  @ApiResponse({
    status: 200,
    description: "Parcel events listed successfully",
  })
  async listEvents(@Param("parcelId") parcelId: string, @Req() req: Request) {
    const organizationId = this.getOrganizationId(req);
    return this.parcelEventsService.listEvents(parcelId, organizationId);
  }

  @Get(":eventId")
  @ApiOperation({ summary: "Get a parcel event" })
  @ApiResponse({
    status: 200,
    description: "Parcel event retrieved successfully",
  })
  async getEvent(@Param("eventId") eventId: string, @Req() req: Request) {
    const organizationId = this.getOrganizationId(req);
    return this.parcelEventsService.getEvent(eventId, organizationId);
  }

  private getOrganizationId(req: Request): string {
    const requestOrganizationId = (req as AuthenticatedRequest).organizationId;
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
    const user = (req as AuthenticatedRequest).user;
    const userIdCandidate = user?.id ?? user?.sub ?? user?.userId;
    const userId =
      typeof userIdCandidate === "string" ? userIdCandidate.trim() : "";

    if (!userId) {
      throw new BadRequestException("User ID is required");
    }

    return userId;
  }
}
