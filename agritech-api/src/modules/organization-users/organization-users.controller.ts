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
import { OrganizationUsersService } from './organization-users.service';
import {
  OrganizationUserFiltersDto,
  CreateOrganizationUserDto,
  UpdateOrganizationUserDto,
  InviteOrganizationUserDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';

@ApiTags('organization-users')
@ApiBearerAuth()
@Controller('organization-users')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class OrganizationUsersController {
  constructor(private readonly organizationUsersService: OrganizationUsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all organization users' })
  @ApiQuery({ name: 'is_active', required: false, type: Boolean })
  @ApiQuery({ name: 'role_id', required: false, type: String })
  @ApiQuery({ name: 'user_id', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Organization users retrieved successfully',
  })
  async findAll(@Req() req, @Query() filters: OrganizationUserFiltersDto) {
    const organizationId = req.headers['x-organization-id'];
    return this.organizationUsersService.findAll(organizationId, filters);
  }

  @Get('assignable')
  @ApiOperation({ summary: 'Get assignable users for task assignment' })
  @ApiResponse({
    status: 200,
    description: 'Assignable users retrieved successfully',
  })
  async getAssignableUsers(@Req() req) {
    const organizationId = req.headers['x-organization-id'];
    return this.organizationUsersService.getAssignableUsers(organizationId);
  }

  @Post('invite')
  @ApiOperation({ summary: 'Invite a user to the organization by email' })
  @ApiResponse({
    status: 201,
    description: 'User invited successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async invite(@Req() req, @Body() dto: InviteOrganizationUserDto) {
    const organizationId = dto.organization_id || req.headers['x-organization-id'];
    const invitedBy = req.user.sub;
    return this.organizationUsersService.inviteUser(
      dto.email,
      dto.role_id,
      organizationId,
      invitedBy,
      dto.first_name,
      dto.last_name,
    );
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get a single organization user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization user retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Organization user not found' })
  async findOne(@Req() req, @Param('userId') userId: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.organizationUsersService.findOne(userId, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a user to the organization' })
  @ApiResponse({
    status: 201,
    description: 'User added to organization successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(@Req() req, @Body() dto: CreateOrganizationUserDto) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.sub;
    return this.organizationUsersService.create(dto, organizationId, userId);
  }

  @Patch(':userId')
  @ApiOperation({ summary: 'Update an organization user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization user updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Organization user not found' })
  async update(
    @Req() req,
    @Param('userId') userId: string,
    @Body() dto: UpdateOrganizationUserDto,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.organizationUsersService.update(userId, organizationId, dto);
  }

  @Delete(':userId')
  @ApiOperation({ summary: 'Remove a user from the organization' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User removed from organization successfully',
  })
  @ApiResponse({ status: 404, description: 'Organization user not found' })
  async delete(@Req() req, @Param('userId') userId: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.organizationUsersService.delete(userId, organizationId);
  }

  @Get(':userId/temp-password')
  @ApiOperation({ summary: 'Get temporary password for a worker user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Temporary password retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User or temporary password not found' })
  async getTempPassword(@Req() req, @Param('userId') userId: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.organizationUsersService.getTempPassword(userId, organizationId);
  }

  @Post(':userId/reset-password')
  @ApiOperation({ summary: 'Reset password for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async resetPassword(@Req() req, @Param('userId') userId: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.organizationUsersService.resetPassword(userId, organizationId);
  }
}
