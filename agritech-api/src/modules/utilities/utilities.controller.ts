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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UtilitiesService } from './utilities.service';
import { CreateUtilityDto } from './dto/create-utility.dto';
import { UpdateUtilityDto } from './dto/update-utility.dto';

@ApiTags('utilities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/farms/:farmId/utilities')
export class UtilitiesController {
  constructor(private readonly utilitiesService: UtilitiesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all utilities for a farm' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'farmId', description: 'Farm ID' })
  async getUtilities(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('farmId') farmId: string,
  ) {
    return this.utilitiesService.findAll(req.user.id, organizationId, farmId);
  }

  @Get(':utilityId')
  @ApiOperation({ summary: 'Get a utility by ID' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'farmId', description: 'Farm ID' })
  @ApiParam({ name: 'utilityId', description: 'Utility ID' })
  async getUtility(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('farmId') farmId: string,
    @Param('utilityId') utilityId: string,
  ) {
    return this.utilitiesService.findOne(req.user.id, organizationId, farmId, utilityId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new utility' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'farmId', description: 'Farm ID' })
  async createUtility(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body() createUtilityDto: CreateUtilityDto,
  ) {
    return this.utilitiesService.create(req.user.id, organizationId, createUtilityDto);
  }

  @Patch(':utilityId')
  @ApiOperation({ summary: 'Update a utility' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'farmId', description: 'Farm ID' })
  @ApiParam({ name: 'utilityId', description: 'Utility ID' })
  async updateUtility(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('farmId') farmId: string,
    @Param('utilityId') utilityId: string,
    @Body() updateUtilityDto: UpdateUtilityDto,
  ) {
    return this.utilitiesService.update(req.user.id, organizationId, farmId, utilityId, updateUtilityDto);
  }

  @Delete(':utilityId')
  @ApiOperation({ summary: 'Delete a utility' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'farmId', description: 'Farm ID' })
  @ApiParam({ name: 'utilityId', description: 'Utility ID' })
  async deleteUtility(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('farmId') farmId: string,
    @Param('utilityId') utilityId: string,
  ) {
    return this.utilitiesService.remove(req.user.id, organizationId, farmId, utilityId);
  }

  @Get('accounts/by-type')
  @ApiOperation({ summary: 'Get account by type for journal entries' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'farmId', description: 'Farm ID' })
  @ApiQuery({ name: 'accountType', description: 'Account type', example: 'Expense' })
  @ApiQuery({ name: 'accountSubtype', required: false, description: 'Account subtype', example: 'Operating Expense' })
  async getAccountByType(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Query('accountType') accountType: string,
    @Query('accountSubtype') accountSubtype?: string,
  ) {
    return this.utilitiesService.getAccountByType(req.user.id, organizationId, accountType, accountSubtype);
  }
}
