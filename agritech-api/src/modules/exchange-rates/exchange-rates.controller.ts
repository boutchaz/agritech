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
import { ExchangeRatesService } from './exchange-rates.service';
import { CreateExchangeRateDto, UpdateExchangeRateDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { ModuleEntitlementGuard } from '../../common/guards/module-entitlement.guard';
import { RequireModule } from '../../common/decorators/require-module.decorator';

@ApiTags('exchange-rates')
@Controller('exchange-rates')
@RequireModule('accounting')
@UseGuards(JwtAuthGuard, OrganizationGuard, ModuleEntitlementGuard)
@ApiBearerAuth()
export class ExchangeRatesController {
  constructor(private readonly service: ExchangeRatesService) {}

  @Get()
  @ApiOperation({ summary: 'List exchange rates' })
  @ApiQuery({ name: 'from_currency', required: false })
  @ApiQuery({ name: 'to_currency', required: false })
  @ApiQuery({ name: 'from_date', required: false })
  @ApiQuery({ name: 'to_date', required: false })
  async findAll(
    @Req() req: any,
    @Query('from_currency') fromCurrency?: string,
    @Query('to_currency') toCurrency?: string,
    @Query('from_date') fromDate?: string,
    @Query('to_date') toDate?: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.service.findAll(organizationId, {
      from_currency: fromCurrency,
      to_currency: toCurrency,
      from_date: fromDate,
      to_date: toDate,
    });
  }

  @Get('lookup')
  @ApiOperation({ summary: 'Resolve the rate for from->to on a given date' })
  @ApiQuery({ name: 'from_currency', required: true })
  @ApiQuery({ name: 'to_currency', required: true })
  @ApiQuery({ name: 'date', required: true })
  @ApiResponse({ status: 200, description: 'Rate resolved' })
  async lookup(
    @Req() req: any,
    @Query('from_currency') from: string,
    @Query('to_currency') to: string,
    @Query('date') date: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    const rate = await this.service.getRate(organizationId, from, to, date);
    return { from_currency: from.toUpperCase(), to_currency: to.toUpperCase(), date, rate };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one exchange rate' })
  @ApiParam({ name: 'id' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.service.findOne(id, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create an exchange rate' })
  async create(@Req() req: any, @Body() dto: CreateExchangeRateDto) {
    const organizationId = req.headers['x-organization-id'];
    return this.service.create(organizationId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an exchange rate' })
  @ApiParam({ name: 'id' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateExchangeRateDto,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.service.update(id, organizationId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an exchange rate' })
  @ApiParam({ name: 'id' })
  async remove(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    await this.service.remove(id, organizationId);
    return { success: true };
  }
}
