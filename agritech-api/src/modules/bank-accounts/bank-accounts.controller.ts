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
import { BankAccountsService } from './bank-accounts.service';
import { CreateBankAccountDto, UpdateBankAccountDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { ModuleEntitlementGuard } from '../../common/guards/module-entitlement.guard';

@ApiTags('bank-accounts')
@Controller('bank-accounts')
@RequireModule('accounting')
@UseGuards(JwtAuthGuard, OrganizationGuard, ModuleEntitlementGuard)
@ApiBearerAuth()
export class BankAccountsController {
  constructor(private readonly bankAccountsService: BankAccountsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all bank accounts with optional filters' })
  @ApiQuery({ name: 'is_active', type: 'boolean', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Bank accounts retrieved successfully' })
  async findAll(
    @Req() req: any,
    @Query('is_active') isActive?: string,
    @Query('search') search?: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.bankAccountsService.findAll(organizationId, {
      is_active: isActive === undefined ? undefined : isActive === 'true',
      search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single bank account by ID' })
  @ApiParam({ name: 'id', description: 'Bank account ID' })
  @ApiResponse({ status: 200, description: 'Bank account retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Bank account not found' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.bankAccountsService.findOne(id, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new bank account' })
  @ApiResponse({ status: 201, description: 'Bank account created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() dto: CreateBankAccountDto, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    dto.organization_id = organizationId;
    dto.created_by = req.user.sub;
    delete (dto as any).current_balance;
    return this.bankAccountsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a bank account' })
  @ApiParam({ name: 'id', description: 'Bank account ID' })
  @ApiResponse({ status: 200, description: 'Bank account updated successfully' })
  @ApiResponse({ status: 404, description: 'Bank account not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBankAccountDto,
    @Req() req: any,
  ) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.sub;
    return this.bankAccountsService.update(id, organizationId, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a bank account' })
  @ApiParam({ name: 'id', description: 'Bank account ID' })
  @ApiResponse({ status: 200, description: 'Bank account deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete bank account in use' })
  async delete(@Param('id') id: string, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    return this.bankAccountsService.delete(id, organizationId);
  }
}
