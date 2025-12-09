import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

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
