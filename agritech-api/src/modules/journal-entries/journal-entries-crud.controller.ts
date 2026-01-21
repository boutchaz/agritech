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
import { PoliciesGuard } from '../casl/policies.guard';
import {
  CanReadJournalEntries,
  CanCreateJournalEntry,
  CanUpdateJournalEntry,
  CanManageJournalEntries,
} from '../casl/permissions.decorator';

@ApiTags('journal-entries')
@Controller('journal-entries')
@UseGuards(JwtAuthGuard, OrganizationGuard, PoliciesGuard)
@ApiBearerAuth()
export class JournalEntriesCrudController {
  constructor(private readonly journalEntriesService: JournalEntriesService) {}

  @Get()
  @CanReadJournalEntries()
  @ApiOperation({ summary: 'Get all journal entries with optional filters and pagination' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)' })
  @ApiQuery({ name: 'pageSize', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field' })
  @ApiQuery({ name: 'sortDir', required: false, enum: ['asc', 'desc'], description: 'Sort direction' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Filter from date' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Filter to date' })
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
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('status') status?: string,
    @Query('entry_type') entryType?: string,
    @Query('date_from') legacyDateFrom?: string,
    @Query('date_to') legacyDateTo?: string,
    @Query('account_id') accountId?: string,
    @Query('cost_center_id') costCenterId?: string,
    @Query('farm_id') farmId?: string,
    @Query('parcel_id') parcelId?: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.journalEntriesService.findAll(organizationId, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      sortBy,
      sortDir: sortDir as 'asc' | 'desc' | undefined,
      search,
      dateFrom: dateFrom || legacyDateFrom,
      dateTo: dateTo || legacyDateTo,
      status,
      entry_type: entryType,
      account_id: accountId,
      cost_center_id: costCenterId,
      farm_id: farmId,
      parcel_id: parcelId,
    });
  }

  @Get(':id')
  @CanReadJournalEntries()
  @ApiOperation({ summary: 'Get a single journal entry by ID' })
  @ApiParam({ name: 'id', description: 'Journal entry ID' })
  @ApiResponse({ status: 200, description: 'Journal entry retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Journal entry not found' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.journalEntriesService.findOne(id, organizationId);
  }

  @Post()
  @CanCreateJournalEntry()
  @ApiOperation({ summary: 'Create a new journal entry' })
  @ApiResponse({ status: 201, description: 'Journal entry created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - entry not balanced' })
  async create(@Body() dto: CreateJournalEntryDto, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.sub;
    return this.journalEntriesService.create(dto, organizationId, userId);
  }

  @Patch(':id')
  @CanUpdateJournalEntry()
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
  @CanUpdateJournalEntry()
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
  @CanUpdateJournalEntry()
  @ApiOperation({ summary: 'Cancel a journal entry' })
  @ApiParam({ name: 'id', description: 'Journal entry ID' })
  @ApiResponse({ status: 200, description: 'Journal entry cancelled successfully' })
  async cancel(@Param('id') id: string, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    return this.journalEntriesService.cancel(id, organizationId);
  }

  @Delete(':id')
  @CanManageJournalEntries()
  @ApiOperation({ summary: 'Delete a draft journal entry' })
  @ApiParam({ name: 'id', description: 'Journal entry ID' })
  @ApiResponse({ status: 200, description: 'Journal entry deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete non-draft entries' })
  async delete(@Param('id') id: string, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    return this.journalEntriesService.delete(id, organizationId);
  }
}
