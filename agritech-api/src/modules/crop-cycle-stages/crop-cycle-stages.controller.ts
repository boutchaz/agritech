import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { CropCycleStagesService } from './crop-cycle-stages.service';
import { CreateCropCycleStageDto } from './dto/create-crop-cycle-stage.dto';

@ApiTags('Crop Cycle Stages')
@ApiBearerAuth()
@Controller('crop-cycle-stages')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class CropCycleStagesController {
  constructor(private readonly cropCycleStagesService: CropCycleStagesService) {}

  @Get('cycle/:cropCycleId')
  @ApiOperation({ summary: 'Get all stages for a crop cycle' })
  @ApiResponse({ status: 200, description: 'Stages retrieved successfully' })
  findByCropCycle(@Param('cropCycleId') cropCycleId: string) {
    return this.cropCycleStagesService.findByCropCycle(cropCycleId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get crop cycle stage by ID' })
  @ApiResponse({ status: 200, description: 'Stage retrieved successfully' })
  findOne(@Param('id') id: string) {
    return this.cropCycleStagesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create crop cycle stage' })
  @ApiResponse({ status: 201, description: 'Stage created successfully' })
  @RequireRole('organization_admin', 'farm_manager', 'system_admin')
  create(@Body() createDto: CreateCropCycleStageDto) {
    return this.cropCycleStagesService.create(createDto);
  }

  @Post('generate/:cropCycleId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate stages from a template' })
  @ApiResponse({ status: 201, description: 'Stages generated successfully' })
  @RequireRole('organization_admin', 'farm_manager', 'system_admin')
  generateFromTemplate(
    @Param('cropCycleId') cropCycleId: string,
    @Body() body: { template_stages: { name: string; order: number; duration_days: number }[]; planting_date: string },
  ) {
    return this.cropCycleStagesService.generateFromTemplate(
      cropCycleId,
      body.template_stages,
      body.planting_date,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update crop cycle stage' })
  @ApiResponse({ status: 200, description: 'Stage updated successfully' })
  @RequireRole('organization_admin', 'farm_manager', 'system_admin')
  update(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateCropCycleStageDto>,
  ) {
    return this.cropCycleStagesService.update(id, updateDto);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update crop cycle stage status' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @RequireRole('organization_admin', 'farm_manager', 'system_admin')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.cropCycleStagesService.updateStatus(id, status);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete crop cycle stage' })
  @ApiResponse({ status: 200, description: 'Stage deleted successfully' })
  @RequireRole('organization_admin', 'farm_manager', 'system_admin')
  remove(@Param('id') id: string) {
    return this.cropCycleStagesService.remove(id);
  }
}
