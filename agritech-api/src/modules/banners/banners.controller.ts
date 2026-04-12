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

/** Authenticated endpoints — active banners + dismiss (dashboard) */
@ApiTags('banners')
@ApiBearerAuth()
@Controller('banners')
@UseGuards(JwtAuthGuard)
export class BannersUserController {
  constructor(private readonly bannersService: BannersService) {}

  @Get('active')
  @ApiOperation({ summary: 'Get active banners for display' })
  @ApiResponse({ status: 200, description: 'Active banners' })
  async findActive(@Req() req) {
    const organizationId = req.headers['x-organization-id'] as string | undefined;
    const userId = req.user?.sub;
    const userRole = req.user?.role;
    return this.bannersService.findActive(organizationId, userId, userRole);
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

/** Admin endpoints — full CRUD (admin-app) */
@ApiTags('banners')
@ApiBearerAuth()
@Controller('admin/banners')
@UseGuards(JwtAuthGuard)
export class BannersAdminController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all banners (admin, cross-org)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Banners retrieved successfully' })
  async findAll(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.bannersService.findAll(page ? Number(page) : 1, pageSize ? Number(pageSize) : 50);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single banner by ID' })
  @ApiParam({ name: 'id', description: 'Banner ID' })
  @ApiResponse({ status: 200, description: 'Banner retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Banner not found' })
  async findOne(@Param('id') id: string) {
    return this.bannersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new banner' })
  @ApiResponse({ status: 201, description: 'Banner created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(@Req() req, @Body() dto: CreateBannerDto) {
    const userId = req.user.sub;
    return this.bannersService.create(dto, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a banner' })
  @ApiParam({ name: 'id', description: 'Banner ID' })
  @ApiResponse({ status: 200, description: 'Banner updated successfully' })
  @ApiResponse({ status: 404, description: 'Banner not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    return this.bannersService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a banner' })
  @ApiParam({ name: 'id', description: 'Banner ID' })
  @ApiResponse({ status: 200, description: 'Banner deleted successfully' })
  @ApiResponse({ status: 404, description: 'Banner not found' })
  async delete(@Param('id') id: string) {
    return this.bannersService.delete(id);
  }
}
