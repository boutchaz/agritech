import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InternalAdminGuard } from '../admin/guards/internal-admin.guard';
import { ModuleConfigService } from './module-config.service';
import {
  ModuleConfigResponseDto,
  CalculatePriceRequestDto,
  CalculatePriceResponseDto,
} from './dto/module-config.dto';

@ApiTags('Module Configuration')
@Controller('module-config')
export class ModuleConfigController {
  constructor(private readonly moduleConfigService: ModuleConfigService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Get module configuration',
    description: 'Returns all available modules with their pricing, features, and UI configuration. Translations are returned based on locale query parameter.'
  })
  @ApiQuery({ 
    name: 'locale', 
    required: false, 
    description: 'Locale for translations (en, fr, ar)', 
    example: 'en' 
  })
  @ApiResponse({ status: 200, description: 'Module configuration', type: ModuleConfigResponseDto })
  async getConfig(
    @Query('locale') locale?: string
  ): Promise<ModuleConfigResponseDto> {
    return this.moduleConfigService.getModuleConfig(locale || 'en');
  }

  @Post('calculate-price')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Calculate subscription price',
    description: 'Calculates the total subscription price based on selected module slugs'
  })
  @ApiResponse({ status: 200, description: 'Price calculation result', type: CalculatePriceResponseDto })
  async calculatePrice(
    @Body() body: CalculatePriceRequestDto
  ): Promise<CalculatePriceResponseDto> {
    return this.moduleConfigService.calculatePrice(body.moduleSlugs);
  }

  @Post('clear-cache')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, InternalAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Clear configuration cache',
    description: 'Clears the in-memory cache for module configuration. Useful after admin updates. Requires internal admin privileges.'
  })
  async clearCache(): Promise<void> {
    this.moduleConfigService.clearCache();
  }
}
