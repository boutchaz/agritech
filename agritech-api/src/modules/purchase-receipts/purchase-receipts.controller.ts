import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import {
  CanCreatePurchaseReceipt,
  CanDeletePurchaseReceipt,
  CanReadPurchaseReceipts,
  CanUpdatePurchaseReceipt,
} from '../casl/permissions.decorator';
import { PurchaseReceiptsService } from './purchase-receipts.service';
import {
  CreatePurchaseReceiptDto,
  PurchaseReceiptFiltersDto,
  UpdatePurchaseReceiptDto,
} from './dto';

@ApiTags('Purchase Receipts')
@ApiBearerAuth()
@Controller('purchase-receipts')
@UseGuards(JwtAuthGuard, OrganizationGuard, PoliciesGuard)
export class PurchaseReceiptsController {
  constructor(private readonly purchaseReceiptsService: PurchaseReceiptsService) {}

  @Post()
  @CanCreatePurchaseReceipt()
  @ApiOperation({ summary: 'Create a new purchase receipt' })
  @ApiResponse({ status: 201, description: 'Purchase receipt created successfully' })
  async create(@Body() dto: CreatePurchaseReceiptDto, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.sub;
    return this.purchaseReceiptsService.create(dto, organizationId, userId);
  }

  @Get()
  @CanReadPurchaseReceipts()
  @ApiOperation({ summary: 'Get purchase receipts' })
  @ApiResponse({ status: 200, description: 'Purchase receipts retrieved successfully' })
  async findAll(@Query() filters: PurchaseReceiptFiltersDto, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    return this.purchaseReceiptsService.findAll(organizationId, filters);
  }

  @Get(':id')
  @CanReadPurchaseReceipts()
  @ApiOperation({ summary: 'Get a purchase receipt by ID' })
  @ApiParam({ name: 'id', description: 'Purchase receipt UUID' })
  @ApiResponse({ status: 200, description: 'Purchase receipt retrieved successfully' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    return this.purchaseReceiptsService.findOne(id, organizationId);
  }

  @Patch(':id')
  @CanUpdatePurchaseReceipt()
  @ApiOperation({ summary: 'Update a draft purchase receipt' })
  @ApiParam({ name: 'id', description: 'Purchase receipt UUID' })
  @ApiResponse({ status: 200, description: 'Purchase receipt updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseReceiptDto,
    @Req() req: any,
  ) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.sub;
    return this.purchaseReceiptsService.update(id, organizationId, userId, dto);
  }

  @Post(':id/submit')
  @CanUpdatePurchaseReceipt()
  @ApiOperation({ summary: 'Submit a purchase receipt' })
  @ApiParam({ name: 'id', description: 'Purchase receipt UUID' })
  @ApiResponse({ status: 200, description: 'Purchase receipt submitted successfully' })
  async submit(@Param('id') id: string, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.sub;
    return this.purchaseReceiptsService.submit(id, organizationId, userId);
  }

  @Patch(':id/cancel')
  @CanUpdatePurchaseReceipt()
  @ApiOperation({ summary: 'Cancel a purchase receipt' })
  @ApiParam({ name: 'id', description: 'Purchase receipt UUID' })
  @ApiResponse({ status: 200, description: 'Purchase receipt cancelled successfully' })
  async cancel(@Param('id') id: string, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.sub;
    return this.purchaseReceiptsService.cancel(id, organizationId, userId);
  }

  @Delete(':id')
  @CanDeletePurchaseReceipt()
  @ApiOperation({ summary: 'Delete a draft purchase receipt' })
  @ApiParam({ name: 'id', description: 'Purchase receipt UUID' })
  @ApiResponse({ status: 200, description: 'Purchase receipt deleted successfully' })
  async remove(@Param('id') id: string, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    return this.purchaseReceiptsService.remove(id, organizationId);
  }
}
