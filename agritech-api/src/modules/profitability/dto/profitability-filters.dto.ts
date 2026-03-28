import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsIn } from 'class-validator';

export class ProfitabilityFiltersDto {
  @ApiProperty({ description: 'Start date (YYYY-MM-DD)', required: false })
  @IsString()
  @IsOptional()
  start_date?: string;

  @ApiProperty({ description: 'End date (YYYY-MM-DD)', required: false })
  @IsString()
  @IsOptional()
  end_date?: string;

  @ApiProperty({ description: 'Parcel ID to filter by', required: false })
  @IsUUID()
  @IsOptional()
  parcel_id?: string;
}

export class ProfitabilityAnalysisFiltersDto {
  @ApiProperty({
    description: 'Filter scope level',
    required: false,
    enum: ['organization', 'farm', 'parcel', 'crop_type', 'variety'],
  })
  @IsOptional()
  @IsIn(['organization', 'farm', 'parcel', 'crop_type', 'variety'])
  filter_type?: 'organization' | 'farm' | 'parcel' | 'crop_type' | 'variety';

  @ApiProperty({
    description: 'Filter value: farm_id / parcel_id / crop_type text / variety text',
    required: false,
  })
  @IsOptional()
  @IsString()
  filter_value?: string;

  @ApiProperty({ description: 'Start date (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiProperty({ description: 'End date (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsString()
  end_date?: string;
}
