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
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JournalEntriesService, CreateJournalEntryDto, UpdateJournalEntryDto } from './journal-entries.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';

@ApiTags('journal-entries')
@Controller('journal-entries')
@UseGuards(JwtAuthGuard, OrganizationGuard)
@ApiBearerAuth()
export class JournalEntriesCrudController {
  constructor(private readonly journalEntriesService: JournalEntriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all journal entries with optional filters' })
  @ApiQuery({ name: 'status', enum: ['draft', 'posted', 'cancelled'], required: false })
  @ApiQuery({ name: 'entry_type', enum: ['expense', 'revenue', 'transfer', 'adjustment'], required: false })
  @ApiQuery({ name: 'date_from', required: false })
  @ApiQuery({ name: 'date_to', required: false })
  @ApiQuery({ name: 'account_id', required: false })
  @ApiQuery({ name: 'cost_center_id', required: false })
  @ApiQuery({ name: 'farm_id', required: false })
  @ApiQuery({ name: 'parcel_id', required: false })
  @ApiResponse({ status: 200, description: 'Journal entries retrieved successfully' })
  async findAll(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('entry_type') entryType?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('account_id') accountId?: string,
    @Query('cost_center_id') costCenterId?: string,
    @Query('farm_id') farmId?: string,
    @Query('parcel_id') parcelId?: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.journalEntriesService.findAll(organizationId, {
      status,
      entry_type: entryType,
      date_from: dateFrom,
      date_to: dateTo,
      account_id: accountId,
      cost_center_id: costCenterId,
      farm_id: farmId,
      parcel_id: parcelId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single journal entry by ID' })
  @ApiParam({ name: 'id', description: 'Journal entry ID' })
  @ApiResponse({ status: 200, description: 'Journal entry retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Journal entry not found' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.journalEntriesService.findOne(id, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new journal entry' })
  @ApiResponse({ status: 201, description: 'Journal entry created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - entry not balanced' })
  async create(@Body() dto: CreateJournalEntryDto, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.sub;
    return this.journalEntriesService.create(dto, organizationId, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft journal entry' })
  @ApiParam({ name: 'id', description: 'Journal entry ID' })
  @ApiResponse({ status: 200, description: 'Journal entry updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot update non-draft entries' })
  @ApiResponse({ status: 404, description: 'Journal entry not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateJournalEntryDto,
    @Req() req: any,
  ) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.sub;
    return this.journalEntriesService.update(id, dto, organizationId, userId);
  }

  @Post(':id/post')
  @ApiOperation({ summary: 'Post a draft journal entry' })
  @ApiParam({ name: 'id', description: 'Journal entry ID' })
  @ApiResponse({ status: 200, description: 'Journal entry posted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot post non-draft entries' })
  async post(@Param('id') id: string, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.sub;
    return this.journalEntriesService.post(id, organizationId, userId);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a journal entry' })
  @ApiParam({ name: 'id', description: 'Journal entry ID' })
  @ApiResponse({ status: 200, description: 'Journal entry cancelled successfully' })
  async cancel(@Param('id') id: string, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    return this.journalEntriesService.cancel(id, organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a draft journal entry' })
  @ApiParam({ name: 'id', description: 'Journal entry ID' })
  @ApiResponse({ status: 200, description: 'Journal entry deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete non-draft entries' })
  async delete(@Param('id') id: string, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    return this.journalEntriesService.delete(id, organizationId);
  }
}
