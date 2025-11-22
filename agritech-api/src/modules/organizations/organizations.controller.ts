import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { OrganizationsService, CreateOrganizationDto } from './organizations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrganizationsController {
    constructor(private readonly organizationsService: OrganizationsService) { }

    @Get('my-organizations')
    @ApiOperation({ summary: 'Get user organizations' })
    async getUserOrganizations(@Request() req) {
        // This logic is currently in AuthService.getUserOrganizations
        // We should move it here eventually, but for now we focus on creation
        return [];
    }
}
