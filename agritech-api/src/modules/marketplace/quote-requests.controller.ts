import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QuoteRequestsService } from './quote-requests.service';
import { CreateQuoteRequestDto } from './dto/create-quote-request.dto';
import { UpdateQuoteRequestDto } from './dto/update-quote-request.dto';

@Controller('marketplace/quote-requests')
export class QuoteRequestsController {
  constructor(private readonly quoteRequestsService: QuoteRequestsService) {}

  /**
   * Create a new quote request (authenticated users only)
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createQuoteRequest(
    @Body() dto: CreateQuoteRequestDto,
    @Request() req: any,
  ) {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      throw new HttpException('Organization not found', HttpStatus.BAD_REQUEST);
    }

    return this.quoteRequestsService.create(dto, organizationId);
  }

  /**
   * Get quote requests sent by the current user (buyer)
   */
  @Get('sent')
  @UseGuards(JwtAuthGuard)
  async getSentQuoteRequests(
    @Query('status') status: string,
    @Request() req: any,
  ) {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      throw new HttpException('Organization not found', HttpStatus.BAD_REQUEST);
    }

    return this.quoteRequestsService.getBuyerRequests(organizationId, status);
  }

  /**
   * Get quote requests received by the current user (seller)
   */
  @Get('received')
  @UseGuards(JwtAuthGuard)
  async getReceivedQuoteRequests(
    @Query('status') status: string,
    @Request() req: any,
  ) {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      throw new HttpException('Organization not found', HttpStatus.BAD_REQUEST);
    }

    return this.quoteRequestsService.getSellerRequests(organizationId, status);
  }

  /**
   * Get seller quote statistics
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getSellerStats(@Request() req: any) {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      throw new HttpException('Organization not found', HttpStatus.BAD_REQUEST);
    }

    return this.quoteRequestsService.getSellerStats(organizationId);
  }

  /**
   * Get a specific quote request by ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getQuoteRequest(@Param('id') id: string, @Request() req: any) {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      throw new HttpException('Organization not found', HttpStatus.BAD_REQUEST);
    }

    return this.quoteRequestsService.getById(id, organizationId);
  }

  /**
   * Update a quote request (seller responding or buyer accepting/cancelling)
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateQuoteRequest(
    @Param('id') id: string,
    @Body() dto: UpdateQuoteRequestDto,
    @Request() req: any,
  ) {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      throw new HttpException('Organization not found', HttpStatus.BAD_REQUEST);
    }

    return this.quoteRequestsService.update(id, organizationId, dto);
  }
}
