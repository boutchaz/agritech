import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsString, IsDateString, IsEnum } from 'class-validator';

export class OpeningStockFiltersDto {
  @ApiPropertyOptional({ description: 'Filter by item ID' })
  @IsOptional()
  @IsUUID()
  item_id?: string;

  @ApiPropertyOptional({ description: 'Filter by warehouse ID' })
  @IsOptional()
  @IsUUID()
  warehouse_id?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by status',
    enum: ['Draft', 'Posted', 'Cancelled']
  })
  @IsOptional()
  @IsEnum(['Draft', 'Posted', 'Cancelled'])
  status?: string;

  @ApiPropertyOptional({ description: 'Filter from date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  from_date?: string;

  @ApiPropertyOptional({ description: 'Filter to date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  to_date?: string;
}
