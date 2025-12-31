import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Headers,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AIReportsService } from './ai-reports.service';
import { GenerateAIReportDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';

@ApiTags('ai-reports')
@ApiBearerAuth()
@Controller('ai-reports')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class AIReportsController {
  constructor(private readonly aiReportsService: AIReportsService) {}

  @Get('providers')
  @ApiOperation({ summary: 'Get available AI providers' })
  @ApiResponse({
    status: 200,
    description: 'List of AI providers and their availability status',
  })
  async getProviders() {
    return this.aiReportsService.getAvailableProviders();
  }

  @Post('generate')
  @ApiOperation({
    summary: 'Generate an AI-powered parcel report',
    description:
      'Aggregates soil, water, satellite, and weather data to generate comprehensive AI analysis',
  })
  @ApiResponse({
    status: 201,
    description: 'Report generated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or AI provider not configured',
  })
  @ApiResponse({
    status: 500,
    description: 'AI generation failed',
  })
  async generateReport(
    @Req() req,
    @Body() dto: GenerateAIReportDto,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }

    return this.aiReportsService.generateReport(organizationId, userId, dto);
  }
}
