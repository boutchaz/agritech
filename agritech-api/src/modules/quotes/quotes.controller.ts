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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto, UpdateQuoteStatusDto, QuoteFiltersDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';

@ApiTags('quotes')
@ApiBearerAuth()
@Controller('quotes')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all quotes with filters' })
  @ApiQuery({ name: 'status', enum: ['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted', 'cancelled'], required: false })
  @ApiQuery({ name: 'customer_id', required: false })
  @ApiQuery({ name: 'customer_name', required: false })
  @ApiQuery({ name: 'quote_number', required: false })
  @ApiQuery({ name: 'date_from', required: false })
  @ApiQuery({ name: 'date_to', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({
    status: 200,
    description: 'Quotes retrieved successfully',
  })
  async findAll(@Req() req, @Query() filters: QuoteFiltersDto) {
    const organizationId = req.headers['x-organization-id'];
    return this.quotesService.findAll(organizationId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single quote by ID with items' })
  @ApiParam({ name: 'id', description: 'Quote ID' })
  @ApiResponse({
    status: 200,
    description: 'Quote retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  async findOne(@Req() req, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.quotesService.findOne(id, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new quote' })
  @ApiResponse({
    status: 201,
    description: 'Quote created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or business rule violation',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() createQuoteDto: CreateQuoteDto, @Req() req) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.sub;
    return this.quotesService.create(createQuoteDto, organizationId, userId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update quote status' })
  @ApiParam({ name: 'id', description: 'Quote ID' })
  @ApiResponse({
    status: 200,
    description: 'Quote status updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async updateStatus(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateQuoteStatusDto,
  ) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.sub;
    return this.quotesService.updateStatus(id, organizationId, userId, dto);
  }

  @Post(':id/convert-to-order')
  @ApiOperation({ summary: 'Convert a quote to a sales order' })
  @ApiParam({ name: 'id', description: 'Quote ID' })
  @ApiResponse({
    status: 201,
    description: 'Quote converted to sales order successfully',
  })
  @ApiResponse({ status: 400, description: 'Cannot convert quote' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  async convertToOrder(@Req() req, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.sub;
    return this.quotesService.convertToOrder(id, organizationId, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a quote (only drafts)' })
  @ApiParam({ name: 'id', description: 'Quote ID' })
  @ApiResponse({
    status: 200,
    description: 'Quote deleted successfully',
  })
  @ApiResponse({ status: 400, description: 'Cannot delete non-draft quotes' })
  async delete(@Req() req, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.quotesService.delete(id, organizationId);
  }
}
