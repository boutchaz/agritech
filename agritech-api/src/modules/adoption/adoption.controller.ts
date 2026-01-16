import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InternalAdminGuard } from '../admin/guards/internal-admin.guard';
import { AdoptionService, MilestoneType } from './adoption.service';

@Controller('admin/adoption')
@UseGuards(JwtAuthGuard, InternalAdminGuard)
export class AdoptionController {
  private readonly logger = new Logger(AdoptionController.name);

  constructor(private readonly adoptionService: AdoptionService) {}

  /**
   * Get adoption dashboard data
   */
  @Get('dashboard')
  async getDashboard(@Query('funnel') funnelName?: string) {
    return this.adoptionService.getAdoptionDashboard(
      funnelName || 'user_onboarding',
    );
  }

  /**
   * Get list of available funnels
   */
  @Get('funnels')
  async getAvailableFunnels() {
    return this.adoptionService.getAvailableFunnels();
  }

  /**
   * Get funnel definitions
   */
  @Get('funnels/:funnelName/definitions')
  async getFunnelDefinitions(@Param('funnelName') funnelName: string) {
    return this.adoptionService.getFunnelDefinitions(funnelName);
  }

  /**
   * Get funnel conversion rates
   */
  @Get('funnels/:funnelName/conversion-rates')
  async getConversionRates(@Param('funnelName') funnelName: string) {
    return this.adoptionService.getFunnelConversionRates(funnelName);
  }

  /**
   * Get time to milestone statistics
   */
  @Get('funnels/:funnelName/time-to-milestone')
  async getTimeToMilestone(@Param('funnelName') funnelName: string) {
    return this.adoptionService.getTimeToMilestone(funnelName);
  }

  /**
   * Get drop-off analysis
   */
  @Get('funnels/:funnelName/dropoffs')
  async getDropoffAnalysis(@Param('funnelName') funnelName: string) {
    return this.adoptionService.getDropoffAnalysis(funnelName);
  }

  /**
   * Get cohort analysis
   */
  @Get('funnels/:funnelName/cohorts')
  async getCohortAnalysis(
    @Param('funnelName') funnelName: string,
    @Query('months') months?: string,
  ) {
    return this.adoptionService.getCohortAnalysis(
      funnelName,
      months ? parseInt(months, 10) : 6,
    );
  }

  /**
   * Get daily metrics trend
   */
  @Get('funnels/:funnelName/daily-trend')
  async getDailyTrend(
    @Param('funnelName') funnelName: string,
    @Query('days') days?: string,
  ) {
    return this.adoptionService.getDailyMetricsTrend(
      funnelName,
      days ? parseInt(days, 10) : 30,
    );
  }

  /**
   * Get user milestones (for specific user)
   */
  @Get('users/:userId/milestones')
  async getUserMilestones(@Param('userId') userId: string) {
    return this.adoptionService.getUserMilestones(userId);
  }

  /**
   * Manually trigger daily metrics calculation (for admin use)
   */
  @Post('calculate-daily-metrics')
  async calculateDailyMetrics(@Body() body: { date?: string }) {
    const date = body.date ? new Date(body.date) : undefined;
    await this.adoptionService.calculateDailyMetrics(date);
    return { success: true, message: 'Daily metrics calculated successfully' };
  }

  /**
   * Get available milestone types
   */
  @Get('milestone-types')
  getMilestoneTypes() {
    return Object.values(MilestoneType);
  }
}
