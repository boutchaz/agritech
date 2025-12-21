import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InternalAdminGuard } from '../admin/guards/internal-admin.guard';
import { EventsService, EventFiltersDto } from './events.service';

@Controller('admin/events')
@UseGuards(JwtAuthGuard, InternalAdminGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  /**
   * Get all events (admin only)
   */
  @Get()
  async getEvents(
    @Query('event_type') eventType?: string,
    @Query('organization_id') organizationId?: string,
    @Query('user_id') userId?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const filters: EventFiltersDto = {
      event_type: eventType,
      organization_id: organizationId,
      user_id: userId,
      start_date: startDate,
      end_date: endDate,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };

    return this.eventsService.getAll(filters);
  }

  /**
   * Get events for a specific organization
   */
  @Get('org/:orgId')
  async getOrgEvents(
    @Param('orgId') orgId: string,
    @Query('event_type') eventType?: string,
    @Query('user_id') userId?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const filters: EventFiltersDto = {
      event_type: eventType,
      user_id: userId,
      start_date: startDate,
      end_date: endDate,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };

    return this.eventsService.getByOrg(orgId, filters);
  }

  /**
   * Get event type distribution
   */
  @Get('distribution')
  async getEventDistribution(
    @Query('organization_id') orgId?: string,
    @Query('days') days?: string,
  ) {
    return this.eventsService.getEventTypeDistribution(
      orgId,
      days ? parseInt(days, 10) : undefined,
    );
  }

  /**
   * Get daily event counts
   */
  @Get('daily-counts')
  async getDailyCounts(
    @Query('organization_id') orgId?: string,
    @Query('days') days?: string,
  ) {
    return this.eventsService.getDailyEventCounts(
      orgId,
      days ? parseInt(days, 10) : undefined,
    );
  }
}
