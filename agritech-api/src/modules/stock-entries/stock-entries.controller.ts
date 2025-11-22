import { Controller, Post, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { StockEntriesService } from './stock-entries.service';
import { CreateStockEntryDto } from './dto/create-stock-entry.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';

@Controller('api/v1/stock-entries')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class StockEntriesController {
  constructor(private readonly stockEntriesService: StockEntriesService) {}

  @Post()
  async create(@Body() createStockEntryDto: CreateStockEntryDto, @Req() req: any) {
    // Set created_by from authenticated user
    createStockEntryDto.created_by = req.user.sub;
    return this.stockEntriesService.createStockEntry(createStockEntryDto);
  }

  @Patch(':id/post')
  async post(@Param('id') id: string, @Req() req: any) {
    return this.stockEntriesService.postStockEntry(id, req.user.sub);
  }
}
