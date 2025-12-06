import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HarvestsService } from './harvests.service';
import { CreateHarvestDto } from './dto/create-harvest.dto';
import { UpdateHarvestDto } from './dto/update-harvest.dto';
import { HarvestFiltersDto } from './dto/harvest-filters.dto';
import { SellHarvestDto } from './dto/sell-harvest.dto';

@ApiTags('harvests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/harvests')
export class HarvestsController {
  constructor(private readonly harvestsService: HarvestsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all harvests for an organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  async getHarvests(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Query() filters: HarvestFiltersDto,
  ) {
    return this.harvestsService.findAll(req.user.id, organizationId, filters);
  }

  @Get(':harvestId')
  @ApiOperation({ summary: 'Get a harvest by ID' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'harvestId', description: 'Harvest ID' })
  async getHarvest(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('harvestId') harvestId: string,
  ) {
    return this.harvestsService.findOne(req.user.id, organizationId, harvestId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new harvest' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  async createHarvest(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body() createHarvestDto: CreateHarvestDto,
  ) {
    return this.harvestsService.create(req.user.id, organizationId, createHarvestDto);
  }

  @Patch(':harvestId')
  @ApiOperation({ summary: 'Update a harvest' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'harvestId', description: 'Harvest ID' })
  async updateHarvest(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('harvestId') harvestId: string,
    @Body() updateHarvestDto: UpdateHarvestDto,
  ) {
    return this.harvestsService.update(req.user.id, organizationId, harvestId, updateHarvestDto);
  }

  @Post(':harvestId/sell')
  @ApiOperation({
    summary: 'Sell a harvest and create journal entry',
    description: 'Marks harvest as sold and creates a double-entry journal entry for the revenue. Payment terms determine if Cash (debit) or Accounts Receivable (debit) is used.',
  })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'harvestId', description: 'Harvest ID to sell' })
  async sellHarvest(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('harvestId') harvestId: string,
    @Body() sellHarvestDto: SellHarvestDto,
  ) {
    return this.harvestsService.sellHarvest(req.user.id, organizationId, harvestId, sellHarvestDto);
  }

  @Delete(':harvestId')
  @ApiOperation({ summary: 'Delete a harvest' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'harvestId', description: 'Harvest ID' })
  async deleteHarvest(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('harvestId') harvestId: string,
  ) {
    return this.harvestsService.remove(req.user.id, organizationId, harvestId);
  }
}
