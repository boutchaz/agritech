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
import { BannersService } from './banners.service';
import { CreateBannerDto, UpdateBannerDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';

@ApiTags('banners')
@ApiBearerAuth()
@Controller('banners')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all banners for organization (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Banners retrieved successfully' })
  async findAll(@Req() req, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.bannersService.findAll(organizationId, page ? Number(page) : 1, pageSize ? Number(pageSize) : 50);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active banners for display' })
  @ApiResponse({ status: 200, description: 'Active banners' })
  async findActive(@Req() req) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user?.sub;
    const userRole = req.user?.role;
    return this.bannersService.findActive(organizationId, userId, userRole);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single banner by ID' })
  @ApiParam({ name: 'id', description: 'Banner ID' })
  @ApiResponse({ status: 200, description: 'Banner retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Banner not found' })
  async findOne(@Req() req, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.bannersService.findOne(id, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new banner' })
  @ApiResponse({ status: 201, description: 'Banner created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(@Req() req, @Body() dto: CreateBannerDto) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.sub;
    return this.bannersService.create(dto, organizationId, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a banner' })
  @ApiParam({ name: 'id', description: 'Banner ID' })
  @ApiResponse({ status: 200, description: 'Banner updated successfully' })
  @ApiResponse({ status: 404, description: 'Banner not found' })
  async update(@Req() req, @Param('id') id: string, @Body() dto: UpdateBannerDto) {
    const organizationId = req.headers['x-organization-id'];
    return this.bannersService.update(id, organizationId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a banner' })
  @ApiParam({ name: 'id', description: 'Banner ID' })
  @ApiResponse({ status: 200, description: 'Banner deleted successfully' })
  @ApiResponse({ status: 404, description: 'Banner not found' })
  async delete(@Req() req, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.bannersService.delete(id, organizationId);
  }

  @Post(':id/dismiss')
  @ApiOperation({ summary: 'Dismiss a banner for current user' })
  @ApiParam({ name: 'id', description: 'Banner ID' })
  @ApiResponse({ status: 200, description: 'Banner dismissed' })
  async dismiss(@Req() req, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.bannersService.dismiss(id, userId);
  }
}
