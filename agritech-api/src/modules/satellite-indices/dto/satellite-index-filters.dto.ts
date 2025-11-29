import { IsOptional, IsString, IsDateString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class SatelliteIndexFiltersDto {
  @IsOptional()
  @IsString()
  parcel_id?: string;

  @IsOptional()
  @IsString()
  farm_id?: string;

  @IsOptional()
  @IsString()
  index_name?: string;

  @IsOptional()
  @IsDateString()
  date_from?: string;

  @IsOptional()
  @IsDateString()
  date_to?: string;

  @IsOptional()
  @IsDateString()
  created_at_from?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}
