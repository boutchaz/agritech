import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

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
}
