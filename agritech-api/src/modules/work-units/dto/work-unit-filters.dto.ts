import { IsOptional, IsBoolean, IsString, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum UnitCategory {
  COUNT = 'count',
  WEIGHT = 'weight',
  VOLUME = 'volume',
  AREA = 'area',
  LENGTH = 'length',
}

export class WorkUnitFiltersDto {
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_active?: boolean;

  @IsOptional()
  @IsEnum(UnitCategory)
  unit_category?: UnitCategory;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}
