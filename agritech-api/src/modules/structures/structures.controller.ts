import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { StructuresService } from './structures.service';
import { CreateStructureDto } from './dto/create-structure.dto';
import { UpdateStructureDto } from './dto/update-structure.dto';

@ApiTags('Structures')
@ApiBearerAuth()
@Controller('organizations/:organizationId/structures')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class StructuresController {
  private readonly logger = new Logger(StructuresController.name);

  constructor(private readonly structuresService: StructuresService) {}

  @Get()
  @ApiOperation({ summary: 'Get all structures for an organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Returns all structures' })
  @ApiResponse({ status: 403, description: 'Access denied to this organization' })
  async findAll(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    this.logger.log(`User ${req.user.id} fetching structures for organization ${organizationId}`);
    return this.structuresService.findAll(req.user.id, organizationId, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a structure by ID' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Structure ID' })
  @ApiResponse({ status: 200, description: 'Returns the structure' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Structure not found' })
  async findOne(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    this.logger.log(`User ${req.user.id} fetching structure ${id}`);
    return this.structuresService.findOne(req.user.id, organizationId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new structure' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 201, description: 'Structure created successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async create(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body() createDto: CreateStructureDto,
  ) {
    this.logger.log(`User ${req.user.id} creating structure for organization ${organizationId}`);
    return this.structuresService.create(req.user.id, organizationId, createDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a structure' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Structure ID' })
  @ApiResponse({ status: 200, description: 'Structure updated successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Structure not found' })
  async update(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateStructureDto,
  ) {
    this.logger.log(`User ${req.user.id} updating structure ${id}`);
    return this.structuresService.update(req.user.id, organizationId, id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a structure (soft delete)' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Structure ID' })
  @ApiResponse({ status: 200, description: 'Structure deleted successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Structure not found' })
  async remove(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    this.logger.log(`User ${req.user.id} deleting structure ${id}`);
    return this.structuresService.remove(req.user.id, organizationId, id);
  }
}
