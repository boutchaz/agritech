import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InternalAdminGuard } from './guards/internal-admin.guard';
import { PolarProductsService } from './polar-products.service';
import { CreatePolarProductDto } from './dto/create-polar-product.dto';

@ApiTags('admin/polar-products')
@ApiBearerAuth()
@Controller('admin/polar-products')
@UseGuards(JwtAuthGuard, InternalAdminGuard)
export class PolarProductsController {
  private readonly logger = new Logger(PolarProductsController.name);

  constructor(private readonly polarProductsService: PolarProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List all Polar products' })
  async listProducts() {
    return this.polarProductsService.listProducts();
  }

  @Post()
  @ApiOperation({ summary: 'Create a Polar product from subscription model simulation' })
  @ApiResponse({ status: 201 })
  async createProduct(@Body() dto: CreatePolarProductDto) {
    return this.polarProductsService.createProduct(dto);
  }

  @Post('sync-formulas')
  @ApiOperation({ summary: 'Sync all formula-based products to Polar (4 formulas × 3 billing cycles)' })
  async syncFormulaProducts() {
    return this.polarProductsService.syncFormulaProducts();
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Archive a Polar product' })
  async archiveProduct(@Param('productId') productId: string) {
    return this.polarProductsService.archiveProduct(productId);
  }
}
