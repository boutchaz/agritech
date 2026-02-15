import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  IsArray,
  Min,
} from 'class-validator';

export class CreateCropTemplateDto {
  @ApiPropertyOptional({ description: 'Organization ID (null for global templates)' })
  @IsString()
  @IsOptional()
  organization_id?: string;

  @ApiProperty({ description: 'Crop type (e.g. wheat, olive, tomato)' })
  @IsString()
  @IsNotEmpty()
  crop_type: string;

  @ApiProperty({ description: 'Crop name' })
  @IsString()
  @IsNotEmpty()
  crop_name: string;

  @ApiProperty({ description: 'Cycle type (e.g. annual, perennial)', default: 'annual' })
  @IsString()
  @IsNotEmpty()
  cycle_type: string;

  @ApiPropertyOptional({ description: 'Cycle category (e.g. short, medium, long, perennial)' })
  @IsString()
  @IsOptional()
  cycle_category?: string;

  @ApiPropertyOptional({ description: 'Whether the crop is perennial', default: false })
  @IsBoolean()
  @IsOptional()
  is_perennial?: boolean;

  @ApiPropertyOptional({ description: 'Typical duration in days' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  typical_duration_days?: number;

  @ApiPropertyOptional({ description: 'Typical duration in months' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  typical_duration_months?: number;

  @ApiPropertyOptional({ description: 'Typical planting months (1-12)', type: [Number] })
  @IsArray()
  @IsOptional()
  typical_planting_months?: number[];

  @ApiPropertyOptional({ description: 'Typical harvest months (1-12)', type: [Number] })
  @IsArray()
  @IsOptional()
  typical_harvest_months?: number[];

  @ApiPropertyOptional({ description: 'Yield unit (e.g. kg, tonnes, quintaux)', default: 'kg' })
  @IsString()
  @IsOptional()
  yield_unit?: string;

  @ApiPropertyOptional({ description: 'Average yield per hectare' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  average_yield_per_ha?: number;

  @ApiPropertyOptional({ description: 'Code prefix for generated cycle codes' })
  @IsString()
  @IsOptional()
  code_prefix?: string;

  @ApiPropertyOptional({ description: 'Template stages (JSONB)' })
  @IsOptional()
  stages?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: 'Whether this is a global template', default: false })
  @IsBoolean()
  @IsOptional()
  is_global?: boolean;
}
