import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiReferencesService } from './ai-references.service';

@ApiTags('ai-references')
@ApiBearerAuth()
@Controller('ai/references')
@UseGuards(JwtAuthGuard)
export class AiReferencesController {
  constructor(private readonly aiReferencesService: AiReferencesService) {}

  @Get(':cropType')
  @ApiOperation({ summary: 'Get full AI reference data for a crop type' })
  @ApiResponse({ status: 200, description: 'AI reference data retrieved successfully' })
  async findByCropType(@Param('cropType') cropType: string) {
    return this.aiReferencesService.findByCropType(cropType);
  }

  @Get(':cropType/varieties')
  @ApiOperation({ summary: 'Get crop varieties reference data' })
  @ApiResponse({ status: 200, description: 'Crop varieties retrieved successfully' })
  async findVarieties(@Param('cropType') cropType: string) {
    return this.aiReferencesService.findVarieties(cropType);
  }

  @Get(':cropType/bbch')
  @ApiOperation({ summary: 'Get BBCH stages reference data' })
  @ApiResponse({ status: 200, description: 'BBCH stages retrieved successfully' })
  async findBbchStages(@Param('cropType') cropType: string) {
    return this.aiReferencesService.findBbchStages(cropType);
  }

  @Get(':cropType/alerts')
  @ApiOperation({ summary: 'Get crop alert thresholds reference data' })
  @ApiResponse({ status: 200, description: 'Alert thresholds retrieved successfully' })
  async findAlerts(@Param('cropType') cropType: string) {
    return this.aiReferencesService.findAlerts(cropType);
  }

  @Get(':cropType/npk-formulas')
  @ApiOperation({ summary: 'Get crop fertilisation and NPK reference data' })
  @ApiResponse({ status: 200, description: 'Fertilisation data retrieved successfully' })
  async findNpkFormulas(@Param('cropType') cropType: string) {
    return this.aiReferencesService.findNpkFormulas(cropType);
  }
}
