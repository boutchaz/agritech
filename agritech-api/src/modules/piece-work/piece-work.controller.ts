import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PieceWorkService } from './piece-work.service';
import { CreatePieceWorkDto, UpdatePieceWorkDto, PieceWorkFiltersDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';

@ApiTags('piece-work')
@ApiBearerAuth()
@Controller('organizations/:organizationId/farms/:farmId/piece-work')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class PieceWorkController {
  constructor(private readonly pieceWorkService: PieceWorkService) {}

  @Get()
  @ApiOperation({ summary: 'Get all piece work records for a farm' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'farmId', description: 'Farm ID' })
  @ApiQuery({ name: 'worker_id', required: false })
  @ApiQuery({ name: 'task_id', required: false })
  @ApiQuery({ name: 'parcel_id', required: false })
  @ApiQuery({ name: 'start_date', required: false })
  @ApiQuery({ name: 'end_date', required: false })
  @ApiQuery({ name: 'payment_status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({
    status: 200,
    description: 'Piece work records retrieved successfully',
  })
  async findAll(
    @Req() req,
    @Param('organizationId') organizationId: string,
    @Param('farmId') farmId: string,
    @Query() filters: PieceWorkFiltersDto,
  ) {
    return this.pieceWorkService.findAll(organizationId, farmId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single piece work record by ID' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'farmId', description: 'Farm ID' })
  @ApiParam({ name: 'id', description: 'Piece Work Record ID' })
  @ApiResponse({
    status: 200,
    description: 'Piece work record retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Piece work record not found' })
  async findOne(
    @Req() req,
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.pieceWorkService.findOne(id, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new piece work record' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'farmId', description: 'Farm ID' })
  @ApiResponse({
    status: 201,
    description: 'Piece work record created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(
    @Req() req,
    @Param('organizationId') organizationId: string,
    @Param('farmId') farmId: string,
    @Body() dto: CreatePieceWorkDto,
  ) {
    const userId = req.user.sub;
    return this.pieceWorkService.create(dto, organizationId, farmId, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a piece work record' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'farmId', description: 'Farm ID' })
  @ApiParam({ name: 'id', description: 'Piece Work Record ID' })
  @ApiResponse({
    status: 200,
    description: 'Piece work record updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Piece work record not found' })
  async update(
    @Req() req,
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePieceWorkDto,
  ) {
    return this.pieceWorkService.update(id, organizationId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a piece work record' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'farmId', description: 'Farm ID' })
  @ApiParam({ name: 'id', description: 'Piece Work Record ID' })
  @ApiResponse({
    status: 200,
    description: 'Piece work record deleted successfully',
  })
  @ApiResponse({ status: 400, description: 'Cannot delete paid records' })
  @ApiResponse({ status: 404, description: 'Piece work record not found' })
  async delete(
    @Req() req,
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.pieceWorkService.delete(id, organizationId);
  }

  @Patch(':id/verify')
  @ApiOperation({ summary: 'Verify a piece work record' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'farmId', description: 'Farm ID' })
  @ApiParam({ name: 'id', description: 'Piece Work Record ID' })
  @ApiResponse({
    status: 200,
    description: 'Piece work record verified successfully',
  })
  @ApiResponse({ status: 404, description: 'Piece work record not found' })
  async verify(
    @Req() req,
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    const userId = req.user.sub;
    return this.pieceWorkService.verify(id, organizationId, userId);
  }
}
