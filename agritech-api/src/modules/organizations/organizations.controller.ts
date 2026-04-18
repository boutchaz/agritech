import { Controller, Get, Post, Patch, Body, UseGuards, Request, Param } from '@nestjs/common';
import { OrganizationsService, CreateOrganizationDto } from './organizations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/action.enum';
import { AppAbility } from '../casl/casl-ability.factory';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@ApiTags('organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard, OrganizationGuard, PoliciesGuard)
@ApiBearerAuth()
export class OrganizationsController {
    constructor(private readonly organizationsService: OrganizationsService) { }

    @Get('my-organizations')
    @ApiOperation({ summary: 'Get user organizations' })
    @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Organization'))
    async getUserOrganizations(@Request() req) {
        // This logic is currently in AuthService.getUserOrganizations
        // We should move it here eventually, but for now we focus on creation
        return [];
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get organization by ID' })
    @ApiParam({
        name: 'id',
        description: 'Organization ID',
        type: String,
    })
    @ApiResponse({ status: 200, description: 'Organization retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - no access to organization' })
    @ApiResponse({ status: 404, description: 'Organization not found' })
    @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Organization'))
    async getOrganization(
        @Request() req,
        @Param('id') organizationId: string,
    ) {
        return this.organizationsService.getOrganization(req.user.id, organizationId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update organization' })
    @ApiParam({
        name: 'id',
        description: 'Organization ID',
        type: String,
    })
    @ApiResponse({ status: 200, description: 'Organization updated successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - no access to organization' })
    @ApiResponse({ status: 404, description: 'Organization not found' })
    @CheckPolicies((ability: AppAbility) => ability.can(Action.Update, 'Organization'))
    async updateOrganization(
        @Request() req,
        @Param('id') organizationId: string,
        @Body() updateDto: UpdateOrganizationDto,
    ) {
        return this.organizationsService.updateOrganization(req.user.id, organizationId, updateDto);
    }
}

