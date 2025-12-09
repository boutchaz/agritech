import { ApiProperty } from '@nestjs/swagger';

export class ProfitabilityDataDto {
  @ApiProperty({ description: 'Total costs' })
  totalCosts: number;

  @ApiProperty({ description: 'Total revenue' })
  totalRevenue: number;

  @ApiProperty({ description: 'Net profit' })
  netProfit: number;

  @ApiProperty({ description: 'Profit margin percentage' })
  profitMargin: number;

  @ApiProperty({ description: 'Cost breakdown by type' })
  costBreakdown: Record<string, number>;

  @ApiProperty({ description: 'Revenue breakdown by type' })
  revenueBreakdown: Record<string, number>;

  @ApiProperty({ description: 'Profitability by parcel' })
  byParcel: any[];
}
