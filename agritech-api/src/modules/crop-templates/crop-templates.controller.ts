import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Request,
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
import { CropTemplatesService } from './crop-templates.service';
import { CreateCropTemplateDto } from './dto/create-crop-template.dto';

@ApiTags('Crop Templates')
@ApiBearerAuth()
@Controller('crop-templates')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class CropTemplatesController {
  constructor(private readonly cropTemplatesService: CropTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all crop templates (org + global)' })
  @ApiResponse({ status: 200, description: 'Crop templates retrieved successfully' })
  findAll(@Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.cropTemplatesService.findAll(organizationId);
  }

  @Get('global')
  @ApiOperation({ summary: 'Get global crop templates only' })
  @ApiResponse({ status: 200, description: 'Global crop templates retrieved successfully' })
  findGlobal() {
    return this.cropTemplatesService.findGlobal();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get crop template by ID' })
  @ApiResponse({ status: 200, description: 'Crop template retrieved successfully' })
  findOne(@Param('id') id: string) {
    return this.cropTemplatesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create crop template' })
  @ApiResponse({ status: 201, description: 'Crop template created successfully' })
  @RequireRole('organization_admin', 'system_admin')
  create(@Request() req, @Body() createDto: CreateCropTemplateDto) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.cropTemplatesService.create(organizationId, createDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update crop template' })
  @ApiResponse({ status: 200, description: 'Crop template updated successfully' })
  @RequireRole('organization_admin', 'system_admin')
  update(
    @Param('id') id: string,
    @Request() req,
    @Body() updateDto: Partial<CreateCropTemplateDto>,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.cropTemplatesService.update(id, organizationId, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete crop template' })
  @ApiResponse({ status: 200, description: 'Crop template deleted successfully' })
  @RequireRole('organization_admin', 'system_admin')
  remove(@Param('id') id: string, @Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.cropTemplatesService.remove(id, organizationId);
  }
}
