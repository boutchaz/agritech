import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CropsService } from './crops.service';
import { CropFiltersDto, CreateCropDto } from './dto';

@ApiTags('Crops')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/crops')
export class CropsController {
  constructor(private readonly cropsService: CropsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all crops for organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Crops retrieved successfully' })
  @ApiQuery({ type: CropFiltersDto, required: false })
  findAll(
    @Param('organizationId') organizationId: string,
    @Query() filters: CropFiltersDto,
  ) {
    return this.cropsService.findAll(organizationId, filters);
  }

  @Get(':cropId')
  @ApiOperation({ summary: 'Get crop by ID' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'cropId', description: 'Crop ID' })
  @ApiResponse({ status: 200, description: 'Crop retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Crop not found' })
  findOne(
    @Param('organizationId') organizationId: string,
    @Param('cropId') cropId: string,
  ) {
    return this.cropsService.findOne(cropId, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new crop' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({ status: 201, description: 'Crop created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  create(
    @Param('organizationId') organizationId: string,
    @Body() createDto: CreateCropDto,
  ) {
    return this.cropsService.create(organizationId, createDto);
  }

  @Patch(':cropId')
  @ApiOperation({ summary: 'Update a crop' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'cropId', description: 'Crop ID' })
  @ApiResponse({ status: 200, description: 'Crop updated successfully' })
  @ApiResponse({ status: 404, description: 'Crop not found' })
  update(
    @Param('organizationId') organizationId: string,
    @Param('cropId') cropId: string,
    @Body() updateDto: Partial<CreateCropDto>,
  ) {
    return this.cropsService.update(cropId, organizationId, updateDto);
  }

  @Delete(':cropId')
  @ApiOperation({ summary: 'Delete a crop' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'cropId', description: 'Crop ID' })
  @ApiResponse({ status: 200, description: 'Crop deleted successfully' })
  @ApiResponse({ status: 404, description: 'Crop not found' })
  remove(
    @Param('organizationId') organizationId: string,
    @Param('cropId') cropId: string,
  ) {
    return this.cropsService.remove(cropId, organizationId);
  }
}
