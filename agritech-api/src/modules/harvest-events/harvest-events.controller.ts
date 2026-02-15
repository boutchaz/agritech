import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
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
import { HarvestEventsService } from './harvest-events.service';
import { CreateHarvestEventDto } from './dto/create-harvest-event.dto';

@ApiTags('Harvest Events')
@ApiBearerAuth()
@Controller('harvest-events')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class HarvestEventsController {
  constructor(private readonly harvestEventsService: HarvestEventsService) {}

  @Get('cycle/:cropCycleId')
  @ApiOperation({ summary: 'Get all harvest events for a crop cycle' })
  @ApiResponse({ status: 200, description: 'Harvest events retrieved successfully' })
  findByCropCycle(@Param('cropCycleId') cropCycleId: string) {
    return this.harvestEventsService.findByCropCycle(cropCycleId);
  }

  @Get('cycle/:cropCycleId/stats')
  @ApiOperation({ summary: 'Get harvest statistics for a crop cycle' })
  @ApiResponse({ status: 200, description: 'Harvest statistics retrieved successfully' })
  getStatsByCropCycle(@Param('cropCycleId') cropCycleId: string) {
    return this.harvestEventsService.getStatsByCropCycle(cropCycleId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get harvest event by ID' })
  @ApiResponse({ status: 200, description: 'Harvest event retrieved successfully' })
  findOne(@Param('id') id: string) {
    return this.harvestEventsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create harvest event' })
  @ApiResponse({ status: 201, description: 'Harvest event created successfully' })
  @RequireRole('organization_admin', 'farm_manager', 'system_admin')
  create(@Body() createDto: CreateHarvestEventDto) {
    return this.harvestEventsService.create(createDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update harvest event' })
  @ApiResponse({ status: 200, description: 'Harvest event updated successfully' })
  @RequireRole('organization_admin', 'farm_manager', 'system_admin')
  update(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateHarvestEventDto>,
  ) {
    return this.harvestEventsService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete harvest event' })
  @ApiResponse({ status: 200, description: 'Harvest event deleted successfully' })
  @RequireRole('organization_admin', 'farm_manager', 'system_admin')
  remove(@Param('id') id: string) {
    return this.harvestEventsService.remove(id);
  }
}
