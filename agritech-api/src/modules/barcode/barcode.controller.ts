import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { BarcodeService } from './barcode.service';
import { CreateBarcodeDto } from './dto/create-barcode.dto';
import { UpdateBarcodeDto } from './dto/update-barcode.dto';
import { ValidateBarcodeDto } from './dto/validate-barcode.dto';

@ApiTags('barcodes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PoliciesGuard)
@Controller('barcodes')
export class BarcodeController {
  constructor(private readonly barcodeService: BarcodeService) {}

  @Post()
  @ApiOperation({ summary: 'Create barcode for item' })
  @ApiResponse({ status: 201, description: 'Barcode created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid barcode payload' })
  async create(@Req() req: any, @Body() createBarcodeDto: CreateBarcodeDto) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.userId || req.user.sub;
    return this.barcodeService.create(createBarcodeDto, organizationId, userId);
  }

  @Get('item/:itemId')
  @ApiOperation({ summary: 'List barcodes for an item' })
  @ApiParam({ name: 'itemId', description: 'Item UUID' })
  @ApiResponse({ status: 200, description: 'Item barcodes retrieved successfully' })
  async findByItem(@Req() req: any, @Param('itemId') itemId: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.barcodeService.findByItem(itemId, organizationId);
  }

  @Get('variant/:variantId')
  @ApiOperation({ summary: 'List barcodes for a product variant' })
  @ApiParam({ name: 'variantId', description: 'Product variant UUID' })
  @ApiResponse({ status: 200, description: 'Variant barcodes retrieved successfully' })
  async findByVariant(@Req() req: any, @Param('variantId') variantId: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.barcodeService.findByVariant(variantId, organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update barcode' })
  @ApiParam({ name: 'id', description: 'Barcode UUID' })
  @ApiResponse({ status: 200, description: 'Barcode updated successfully' })
  @ApiResponse({ status: 404, description: 'Barcode not found' })
  async update(@Req() req: any, @Param('id') id: string, @Body() updateBarcodeDto: UpdateBarcodeDto) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.userId || req.user.sub;
    return this.barcodeService.update(id, updateBarcodeDto, organizationId, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete barcode' })
  @ApiParam({ name: 'id', description: 'Barcode UUID' })
  @ApiResponse({ status: 200, description: 'Barcode deleted successfully' })
  @ApiResponse({ status: 404, description: 'Barcode not found' })
  async remove(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.userId || req.user.sub;
    return this.barcodeService.remove(id, organizationId, userId);
  }

  @Get('scan/:value')
  @ApiOperation({ summary: 'Universal scan endpoint' })
  @ApiParam({ name: 'value', description: 'Scanned barcode, batch number, or warehouse name' })
  @ApiResponse({ status: 200, description: 'Scan result returned successfully' })
  async scan(@Req() req: any, @Param('value') value: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.barcodeService.scanBarcode(value, organizationId);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate barcode checksum or format' })
  @ApiResponse({ status: 200, description: 'Barcode validation completed successfully' })
  async validate(@Body() validateBarcodeDto: ValidateBarcodeDto) {
    return this.barcodeService.validateBarcode(
      validateBarcodeDto.barcode,
      validateBarcodeDto.barcode_type,
    );
  }

  @Post('generate')
  @ApiOperation({ summary: 'Auto-generate an EAN-13 barcode for an item or variant' })
  async generate(@Req() req: any, @Body() body: { item_id?: string; variant_id?: string }) {
    const organizationId = req.headers['x-organization-id'];
    return this.barcodeService.generate(body.item_id, body.variant_id, organizationId);
  }

  @Post('regenerate/:id')
  @ApiOperation({ summary: 'Regenerate an existing barcode with a new EAN-13' })
  @ApiParam({ name: 'id', description: 'Barcode UUID' })
  async regenerate(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.userId || req.user.sub;
    return this.barcodeService.regenerate(id, organizationId, userId);
  }
}
