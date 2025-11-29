import { IsOptional, IsString, IsDateString, IsNumber, IsArray } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class SoilAnalysisFiltersDto {
  @IsOptional()
  @IsString()
  parcel_id?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      // Handle comma-separated string or array
      return value.includes(',') ? value.split(',').map(id => id.trim()) : [value];
    }
    return value;
  })
  parcel_ids?: string[];

  @IsOptional()
  @IsString()
  test_type_id?: string;

  @IsOptional()
  @IsDateString()
  date_from?: string;

  @IsOptional()
  @IsDateString()
  date_to?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}
