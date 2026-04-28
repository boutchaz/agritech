import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BankReconciliationService } from './bank-reconciliation.service';
import {
  CreateBankTransactionDto,
  ListBankTransactionsQueryDto,
  MatchBankTransactionDto,
} from './dto/bank-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';

@ApiTags('bank-reconciliation')
@ApiBearerAuth()
@Controller('bank-reconciliation')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class BankReconciliationController {
  constructor(private readonly service: BankReconciliationService) {}

  @Post('transactions')
  @ApiOperation({ summary: 'Manually create a bank statement line' })
  @ApiResponse({ status: 201, description: 'Transaction recorded' })
  async create(
    @Req() req,
    @Body() dto: CreateBankTransactionDto,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (!organizationId) throw new BadRequestException('Organization ID required');
    const userId = req.user?.id || req.user?.sub;
    return this.service.createTransaction(dto, organizationId, userId);
  }

  @Get('accounts/:bankAccountId/transactions')
  @ApiOperation({ summary: 'List bank transactions for a bank account' })
  async list(
    @Param('bankAccountId') bankAccountId: string,
    @Query() query: ListBankTransactionsQueryDto,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (!organizationId) throw new BadRequestException('Organization ID required');
    return this.service.listTransactions(bankAccountId, organizationId, query);
  }

  @Get('accounts/:bankAccountId/summary')
  @ApiOperation({ summary: 'Reconciliation summary for a bank account' })
  async summary(
    @Param('bankAccountId') bankAccountId: string,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (!organizationId) throw new BadRequestException('Organization ID required');
    return this.service.getSummary(bankAccountId, organizationId);
  }

  @Patch('transactions/:id/match')
  @ApiOperation({ summary: 'Link a bank transaction to an accounting payment' })
  async match(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: MatchBankTransactionDto,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (!organizationId) throw new BadRequestException('Organization ID required');
    const userId = req.user?.id || req.user?.sub;
    return this.service.matchTransaction(id, dto, organizationId, userId);
  }

  @Patch('transactions/:id/unmatch')
  @ApiOperation({ summary: 'Remove the payment match from a bank transaction' })
  async unmatch(
    @Param('id') id: string,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (!organizationId) throw new BadRequestException('Organization ID required');
    return this.service.unmatchTransaction(id, organizationId);
  }
}
