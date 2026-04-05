import { Controller, Get, Patch, Post, Body, UseGuards, Request, Param, Delete, UseInterceptors, UploadedFile, BadRequestException, Headers } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody, ApiConsumes } from '@nestjs/swagger';
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

    @Post('me/activity')
    @ApiOperation({ summary: 'Track user activity for live dashboard' })
    @ApiResponse({ status: 200, description: 'Activity tracked successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async trackActivity(@Request() req) {
        return this.usersService.trackActivity(req.user.id);
    }

    // Tour Preferences Endpoints

    @Get('me/tour-preferences')
    @ApiOperation({ summary: 'Get current user tour preferences (completed and dismissed tours)' })
    @ApiResponse({ status: 200, description: 'Tour preferences retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getTourPreferences(@Request() req) {
        return this.usersService.getTourPreferences(req.user.id);
    }

    @Patch('me/tour-preferences')
    @ApiOperation({ summary: 'Update user tour preferences' })
    @ApiResponse({ status: 200, description: 'Tour preferences updated successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                completed_tours: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array of completed tour IDs'
                },
                dismissed_tours: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array of dismissed tour IDs'
                }
            }
        }
    })
    async updateTourPreferences(
        @Request() req,
        @Body() body: { completed_tours?: string[]; dismissed_tours?: string[] }
    ) {
        return this.usersService.updateTourPreferences(req.user.id, body);
    }

    @Post('me/tours/:tourId/dismiss')
    @ApiOperation({ summary: 'Dismiss a specific tour (mark as permanently skipped)' })
    @ApiResponse({ status: 200, description: 'Tour dismissed successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async dismissTour(@Request() req, @Param('tourId') tourId: string) {
        return this.usersService.dismissTour(req.user.id, tourId);
    }

    @Post('me/tours/:tourId/complete')
    @ApiOperation({ summary: 'Mark a specific tour as completed' })
    @ApiResponse({ status: 200, description: 'Tour marked as completed' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async completeTour(@Request() req, @Param('tourId') tourId: string) {
        return this.usersService.completeTour(req.user.id, tourId);
    }

    @Post('me/tours/:tourId/reset')
    @ApiOperation({ summary: 'Reset a specific tour (remove from completed and dismissed)' })
    @ApiResponse({ status: 200, description: 'Tour reset successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async resetTour(@Request() req, @Param('tourId') tourId: string) {
        return this.usersService.resetTour(req.user.id, tourId);
    }

    @Post('me/tours/reset-all')
    @ApiOperation({ summary: 'Reset all tours (clear completed and dismissed)' })
    @ApiResponse({ status: 200, description: 'All tours reset successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async resetAllTours(@Request() req) {
        return this.usersService.resetAllTours(req.user.id);
    }

    @Post('me/avatar')
    @UseInterceptors(FileInterceptor('file'))
    @ApiOperation({ summary: 'Upload user avatar' })
    @ApiConsumes('multipart/form-data')
    @ApiResponse({ status: 200, description: 'Avatar uploaded successfully' })
    @ApiResponse({ status: 400, description: 'Invalid file' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async uploadAvatar(
        @Request() req,
        @UploadedFile() file: Express.Multer.File,
        @Headers('x-organization-id') organizationId?: string,
    ) {
        if (!file) {
            throw new BadRequestException('No file provided');
        }
        return this.usersService.uploadAvatar(req.user.id, file, organizationId);
    }

    @Delete('me/avatar')
    @ApiOperation({ summary: 'Remove user avatar' })
    @ApiResponse({ status: 200, description: 'Avatar removed successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async removeAvatar(
        @Request() req,
        @Headers('x-organization-id') organizationId?: string,
    ) {
        return this.usersService.removeAvatar(req.user.id, organizationId);
    }

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
