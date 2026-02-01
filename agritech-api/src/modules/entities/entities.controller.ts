import { Controller, Post, Get, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EntitiesService, RegisterAbstractEntityDto, LogEntityEventDto, EntitySearchParams } from './entities.service';

@ApiTags('entities')
@ApiBearerAuth('JWT-auth')
@Controller('organizations/:organizationId/entities')
@UseGuards(JwtAuthGuard)
export class EntitiesController {
  constructor(private readonly entitiesService: EntitiesService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register or update an abstract entity' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Entity registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async registerEntity(
    @Param('organizationId') organizationId: string,
    @Body() dto: RegisterAbstractEntityDto,
  ) {
    dto.organizationId = organizationId;
    return this.entitiesService.registerEntity(dto);
  }

  @Post('register-bulk')
  @ApiOperation({ summary: 'Bulk register entities' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Entities registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async bulkRegisterEntities(
    @Param('organizationId') organizationId: string,
    @Body() body: { entities: RegisterAbstractEntityDto[] },
  ) {
    return this.entitiesService.bulkRegisterEntities('', body.entities);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search for entities across all types' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Search results' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async searchEntities(
    @Param('organizationId') organizationId: string,
    @Query('searchTerm') searchTerm?: string,
    @Query('entityTypes') entityTypes?: string,
    @Query('tags') tags?: string,
    @Query('limit') limit?: string,
  ) {
    return this.entitiesService.searchEntities('', organizationId, {
      searchTerm,
      entityTypes: entityTypes ? entityTypes.split(',') : undefined,
      tags: tags ? tags.split(',') : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':entityType/:entityId')
  @ApiOperation({ summary: 'Get an abstract entity by type and ID' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Entity details' })
  @ApiResponse({ status: 404, description: 'Entity not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getEntity(
    @Param('organizationId') organizationId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.entitiesService.getEntity('', organizationId, entityType, entityId);
  }

  @Delete(':entityType/:entityId')
  @ApiOperation({ summary: 'Unregister an entity (remove from abstract registry)' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Entity unregistered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async unregisterEntity(
    @Param('organizationId') organizationId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.entitiesService.unregisterEntity('', organizationId, entityType, entityId);
  }

  @Get(':entityType/:entityId/events')
  @ApiOperation({ summary: 'Get events for an entity' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Entity events' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getEntityEvents(
    @Param('organizationId') organizationId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.entitiesService.getEntityEvents('', organizationId, entityType, entityId);
  }

  @Post(':entityType/:entityId/events')
  @ApiOperation({ summary: 'Log an event for an entity' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Event logged successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Entity not found' })
  async logEvent(
    @Param('organizationId') organizationId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Body() dto: LogEntityEventDto,
  ) {
    dto.entityType = entityType;
    dto.entityId = entityId;
    return this.entitiesService.logEvent('', dto);
  }

  @Get('activity-feed')
  @ApiOperation({ summary: 'Get entity activity feed for organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Activity feed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getActivityFeed(
    @Param('organizationId') organizationId: string,
    @Query('limit') limit?: string,
  ) {
    return this.entitiesService.getActivityFeed('', organizationId, limit ? parseInt(limit, 10) : undefined);
  }
}
