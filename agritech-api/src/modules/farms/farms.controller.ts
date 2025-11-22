import { Controller, Delete, Post, Body, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FarmsService } from './farms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  DeleteFarmDto,
  DeleteFarmResponseDto,
} from './dto/delete-farm.dto';
import {
  ImportFarmDto,
  ImportFarmResponseDto,
} from './dto/import-farm.dto';

@ApiTags('farms')
@Controller('farms')
export class FarmsController {
  constructor(private farmsService: FarmsService) {}

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a farm',
    description:
      'Delete a farm with role-based authorization. Requires system_admin or organization_admin role. Checks for sub-farms and active subscription.',
  })
  @ApiResponse({
    status: 200,
    description: 'Farm deleted successfully',
    type: DeleteFarmResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - farm has sub-farms' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions or invalid subscription' })
  @ApiResponse({ status: 404, description: 'Farm not found' })
  async deleteFarm(@Request() req, @Body() deleteFarmDto: DeleteFarmDto) {
    return this.farmsService.deleteFarm(req.user.id, deleteFarmDto);
  }

  @Post('import')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Import farms, parcels, and satellite AOIs',
    description:
      'Import farm data from export format. Supports farms (with hierarchy), parcels, and satellite AOIs. Can skip duplicates.',
  })
  @ApiResponse({
    status: 200,
    description: 'Import completed successfully (may have warnings)',
    type: ImportFarmResponseDto,
  })
  @ApiResponse({
    status: 207,
    description: 'Import partially successful (some errors occurred)',
    type: ImportFarmResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid export data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to organization' })
  async importFarm(@Request() req, @Body() importFarmDto: ImportFarmDto) {
    return this.farmsService.importFarm(req.user.id, importFarmDto);
  }
}
