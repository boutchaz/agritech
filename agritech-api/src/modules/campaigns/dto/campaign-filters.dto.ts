import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { CampaignType, CampaignStatus } from './create-campaign.dto';
import { PaginatedQueryDto } from '../../../common/dto/paginated-query.dto';

export class CampaignFiltersDto extends PaginatedQueryDto {
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

}
