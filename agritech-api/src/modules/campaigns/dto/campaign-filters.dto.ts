import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsIn, IsNumber, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { CampaignType, CampaignStatus } from './create-campaign.dto';

export class CampaignFiltersDto {
  @ApiPropertyOptional({ description: 'Filter by campaign type', enum: CampaignType })
  @IsOptional()
  @IsEnum(CampaignType)
  campaign_type?: CampaignType;

  @ApiPropertyOptional({ description: 'Filter by status', enum: CampaignStatus })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @ApiPropertyOptional({ description: 'Filter by primary fiscal year' })
  @IsOptional()
  @IsUUID()
  primary_fiscal_year_id?: string;

  @ApiPropertyOptional({ description: 'Search by name or description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number (default: 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: 'Page size (default: 12)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Sort by field' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort direction (asc or desc)' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc';
}
