import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  IsInt,
  Min,
  IsDateString,
} from 'class-validator';

export class CreateHarvestEventDto {
  @ApiProperty({ description: 'Crop cycle ID' })
  @IsUUID()
  @IsNotEmpty()
  crop_cycle_id: string;

  @ApiProperty({ description: 'Harvest date (ISO 8601)' })
  @IsDateString()
  @IsNotEmpty()
  harvest_date: string;

  @ApiPropertyOptional({ description: 'Harvest number (auto-generated if not provided)' })
  @IsInt()
  @Min(1)
  @IsOptional()
  harvest_number?: number;

  @ApiPropertyOptional({ description: 'Quantity harvested' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ description: 'Quantity unit', default: 'kg' })
  @IsString()
  @IsOptional()
  quantity_unit?: string;

  @ApiPropertyOptional({ description: 'Quality grade' })
  @IsString()
  @IsOptional()
  quality_grade?: string;

  @ApiPropertyOptional({ description: 'Quality notes' })
  @IsString()
  @IsOptional()
  quality_notes?: string;
}
