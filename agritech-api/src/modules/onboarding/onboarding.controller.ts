import { Controller, Get, Patch, Post, Delete, Body, UseGuards, Request, Param, Put, Query } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
import {
  OnboardingStateDto,
  SaveOnboardingProfileDto,
  SaveOnboardingOrganizationDto,
  SaveOnboardingFarmDto,
  SaveOnboardingModulesDto,
  SaveOnboardingPreferencesDto,
  CheckSlugAvailabilityResponseDto,
} from './dto/onboarding.dto';

@ApiTags('onboarding')
@Controller('onboarding')
@UseGuards(JwtAuthGuard, OrganizationGuard)
@ApiBearerAuth()
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('check-slug')
  @ApiOperation({ summary: 'Check if organization slug is available' })
  @ApiQuery({ name: 'slug', required: true, description: 'The slug to check' })
  @ApiResponse({ status: 200, description: 'Slug availability check result', type: CheckSlugAvailabilityResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid slug format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async checkSlugAvailability(@Query('slug') slug: string): Promise<CheckSlugAvailabilityResponseDto> {
    return this.onboardingService.checkSlugAvailability(slug);
  }

  @Get('state')
  @ApiOperation({ summary: 'Get current onboarding state' })
  @ApiResponse({ status: 200, description: 'Onboarding state retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getState(@Request() req) {
    return this.onboardingService.getState(req.user.id);
  }

  @Patch('state')
  @ApiOperation({ summary: 'Save onboarding state (partial update)' })
  @ApiResponse({ status: 200, description: 'Onboarding state saved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async saveState(@Request() req, @Body() state: OnboardingStateDto) {
    return this.onboardingService.saveState(req.user.id, state);
  }

  @Delete('state')
  @ApiOperation({ summary: 'Clear/reset onboarding state' })
  @ApiResponse({ status: 200, description: 'Onboarding state cleared successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async clearState(@Request() req) {
    return this.onboardingService.clearState(req.user.id);
  }

  @Post('profile')
  @ApiOperation({ summary: 'Save user profile data (Step 1)' })
  @ApiResponse({ status: 201, description: 'Profile saved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async saveProfile(@Request() req, @Body() dto: SaveOnboardingProfileDto) {
    return this.onboardingService.saveProfile(req.user.id, req.user.email, dto);
  }

  @Post('organization')
  @ApiOperation({ summary: 'Create organization (Step 2)' })
  @ApiResponse({ status: 201, description: 'Organization created successfully', type: Object })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async saveOrganization(@Request() req, @Body() dto: SaveOnboardingOrganizationDto) {
    return this.onboardingService.saveOrganization(req.user.id, dto);
  }

  @Patch('organization/:id')
  @ApiOperation({ summary: 'Update existing organization (Step 2)' })
  @ApiResponse({ status: 200, description: 'Organization updated successfully', type: Object })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async updateOrganization(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: SaveOnboardingOrganizationDto,
  ) {
    return this.onboardingService.saveOrganization(req.user.id, dto, id);
  }

  @Post('farm')
  @ApiOperation({ summary: 'Save farm data (Step 3)' })
  @ApiResponse({ status: 201, description: 'Farm created successfully', type: Object })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async saveFarm(@Request() req, @Body() dto: SaveOnboardingFarmDto & { existingFarmId?: string }) {
    return this.onboardingService.saveFarm(req.user.id, dto, dto.existingFarmId);
  }

  @Post('modules')
  @ApiOperation({ summary: 'Save selected modules (Step 4)' })
  @ApiResponse({ status: 201, description: 'Modules saved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async saveModules(@Request() req, @Body() dto: SaveOnboardingModulesDto) {
    return this.onboardingService.saveModules(req.user.id, dto);
  }

  @Post('complete')
  @ApiOperation({ summary: 'Save preferences and complete onboarding (Step 5)' })
  @ApiResponse({ status: 201, description: 'Onboarding completed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async savePreferencesAndComplete(@Request() req, @Body() dto: SaveOnboardingPreferencesDto) {
    // Get organization from request (set by auth middleware)
    const organizationId = (req as any).organizationId || null;
    return this.onboardingService.savePreferencesAndComplete(req.user.id, organizationId, dto);
  }
}
