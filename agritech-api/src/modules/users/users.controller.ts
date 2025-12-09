import { Controller, Get, Patch, Body, UseGuards, Request, Param, Delete, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UpdateUserProfileDto, UpdateUserRoleDto, UpdateUserStatusDto } from './dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get('me')
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Profile not found' })
    async getProfile(@Request() req) {
        return this.usersService.findOne(req.user.id);
    }

    @Patch('me')
    @ApiOperation({ summary: 'Update current user profile' })
    @ApiResponse({ status: 200, description: 'User profile updated successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async updateProfile(@Request() req, @Body() updateDto: UpdateUserProfileDto) {
        return this.usersService.updateProfile(req.user.id, updateDto);
    }

    @Get('me/organizations')
    @ApiOperation({ summary: 'Get all organizations that the current user belongs to' })
    @ApiResponse({ status: 200, description: 'User organizations retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getUserOrganizations(@Request() req) {
        return this.usersService.getUserOrganizations(req.user.id);
    }

    // Organization Users Management Endpoints

    @Get('organizations/:organizationId/users')
    @ApiOperation({ summary: 'Get all users in an organization' })
    @ApiResponse({ status: 200, description: 'Organization users retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Organization not found' })
    async getOrganizationUsers(@Param('organizationId') organizationId: string) {
        return this.usersService.getOrganizationUsers(organizationId);
    }

    @Patch('organizations/:organizationId/users/:userId/role')
    @ApiOperation({ summary: 'Update user role in organization' })
    @ApiResponse({ status: 200, description: 'User role updated successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'User or organization not found' })
    async updateUserRole(
        @Param('organizationId') organizationId: string,
        @Param('userId') userId: string,
        @Body() dto: UpdateUserRoleDto,
    ) {
        return this.usersService.updateUserRole(organizationId, userId, dto.role_id);
    }

    @Patch('organizations/:organizationId/users/:userId/status')
    @ApiOperation({ summary: 'Toggle user active status in organization' })
    @ApiResponse({ status: 200, description: 'User status updated successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'User or organization not found' })
    async updateUserStatus(
        @Param('organizationId') organizationId: string,
        @Param('userId') userId: string,
        @Body() dto: UpdateUserStatusDto,
    ) {
        return this.usersService.updateUserStatus(organizationId, userId, dto.is_active);
    }

    @Delete('organizations/:organizationId/users/:userId')
    @ApiOperation({ summary: 'Remove user from organization' })
    @ApiResponse({ status: 200, description: 'User removed successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'User or organization not found' })
    async removeUserFromOrganization(
        @Param('organizationId') organizationId: string,
        @Param('userId') userId: string,
    ) {
        return this.usersService.removeUserFromOrganization(organizationId, userId);
    }
}
