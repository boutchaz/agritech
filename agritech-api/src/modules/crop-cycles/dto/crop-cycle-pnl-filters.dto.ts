import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class CropCyclePnLFiltersDto {
  @ApiPropertyOptional({ description: 'Filter by campaign ID' })
  @IsOptional()
  @IsUUID()
  campaign_id?: string;

  @ApiPropertyOptional({ description: 'Filter by fiscal year ID' })
  @IsOptional()
  @IsUUID()
  fiscal_year_id?: string;

  @ApiPropertyOptional({ description: 'Filter by farm ID' })
  @IsOptional()
  @IsUUID()
  farm_id?: string;

  @ApiPropertyOptional({ description: 'Sort field (default: net_profit)' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort direction' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc';
}
