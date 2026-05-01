import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

const COMPONENT_CATEGORIES = [
  'basic_salary', 'housing_allowance', 'transport_allowance', 'family_allowance',
  'overtime', 'bonus', 'commission', 'other_earning',
  'cnss_employee', 'cnss_employer', 'amo_employee', 'amo_employer',
  'cis_employee', 'cis_employer',
  'income_tax', 'professional_tax',
  'advance_deduction', 'loan_deduction', 'other_deduction',
] as const;

export class SalaryComponentDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name_fr?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name_ar?: string;

  @ApiProperty({ enum: ['earning', 'deduction'] })
  @IsIn(['earning', 'deduction'])
  component_type!: 'earning' | 'deduction';

  @ApiProperty({ enum: COMPONENT_CATEGORIES })
  @IsIn(COMPONENT_CATEGORIES as unknown as string[])
  category!: typeof COMPONENT_CATEGORIES[number];

  @ApiProperty({ enum: ['fixed', 'percentage_of_basic', 'formula'] })
  @IsIn(['fixed', 'percentage_of_basic', 'formula'])
  calculation_type!: 'fixed' | 'percentage_of_basic' | 'formula';

  @ApiPropertyOptional() @IsOptional() @IsNumber() amount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() percentage?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() formula?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_statutory?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_taxable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() depends_on_payment_days?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() condition_formula?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() sort_order?: number;
}

export class CreateSalaryStructureDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicable_worker_types?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_default?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_active?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;

  @ApiPropertyOptional({ type: [SalaryComponentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalaryComponentDto)
  components?: SalaryComponentDto[];
}

export class UpdateSalaryStructureDto extends PartialType(CreateSalaryStructureDto) {}

export class ReplaceComponentsDto {
  @ApiProperty({ type: [SalaryComponentDto] })
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => SalaryComponentDto)
  components!: SalaryComponentDto[];
}
