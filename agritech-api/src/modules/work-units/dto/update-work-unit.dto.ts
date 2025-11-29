import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { UnitCategory } from './work-unit-filters.dto';

export class UpdateWorkUnitDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  name_ar?: string;

  @IsOptional()
  @IsString()
  name_fr?: string;

  @IsOptional()
  @IsEnum(UnitCategory)
  unit_category?: UnitCategory;

  @IsOptional()
  @IsString()
  base_unit?: string;

  @IsOptional()
  @IsNumber()
  conversion_factor?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsBoolean()
  allow_decimal?: boolean;
}
