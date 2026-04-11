import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ChangelogsService } from './changelogs.service';
import { CreateChangelogDto, UpdateChangelogDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';

@ApiTags('changelogs')
@ApiBearerAuth()
@Controller('changelogs')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class ChangelogsController {
  constructor(private readonly changelogsService: ChangelogsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all changelogs (global + org-specific)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Changelogs retrieved successfully' })
  async findAll(@Req() req, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.changelogsService.findAll(organizationId, page ? Number(page) : 1, pageSize ? Number(pageSize) : 20);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single changelog by ID' })
  @ApiParam({ name: 'id', description: 'Changelog ID' })
  @ApiResponse({ status: 200, description: 'Changelog retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Changelog not found' })
  async findOne(@Param('id') id: string) {
    return this.changelogsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new changelog entry' })
  @ApiResponse({ status: 201, description: 'Changelog created successfully' })
  async create(@Req() req, @Body() dto: CreateChangelogDto) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.sub;
    return this.changelogsService.create(dto, organizationId, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a changelog entry' })
  @ApiParam({ name: 'id', description: 'Changelog ID' })
  @ApiResponse({ status: 200, description: 'Changelog updated successfully' })
  @ApiResponse({ status: 404, description: 'Changelog not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateChangelogDto) {
    return this.changelogsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a changelog entry' })
  @ApiParam({ name: 'id', description: 'Changelog ID' })
  @ApiResponse({ status: 200, description: 'Changelog deleted successfully' })
  @ApiResponse({ status: 404, description: 'Changelog not found' })
  async delete(@Param('id') id: string) {
    return this.changelogsService.delete(id);
  }
}
