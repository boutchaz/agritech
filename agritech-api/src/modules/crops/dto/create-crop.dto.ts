import { IsNotEmpty, IsOptional, IsUUID, IsString, IsNumber, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCropDto {
  @ApiProperty({ description: 'Farm ID' })
  @IsNotEmpty()
  @IsUUID()
  farm_id: string;

  @ApiPropertyOptional({ description: 'Parcel ID' })
  @IsOptional()
  @IsUUID()
  parcel_id?: string;

  @ApiProperty({ description: 'Crop variety ID' })
  @IsNotEmpty()
  @IsUUID()
  variety_id: string;

  @ApiProperty({ description: 'Crop name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Planting date' })
  @IsOptional()
  @IsDateString()
  planting_date?: string;

  @ApiPropertyOptional({ description: 'Expected harvest date' })
  @IsOptional()
  @IsDateString()
  expected_harvest_date?: string;

  @ApiPropertyOptional({ description: 'Actual harvest date' })
  @IsOptional()
  @IsDateString()
  actual_harvest_date?: string;

  @ApiPropertyOptional({ description: 'Planted area in hectares' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  planted_area?: number;

  @ApiPropertyOptional({ description: 'Expected yield' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  expected_yield?: number;

  @ApiPropertyOptional({ description: 'Actual yield' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actual_yield?: number;

  @ApiPropertyOptional({ description: 'Yield unit (e.g., kg, tonnes)' })
  @IsOptional()
  @IsString()
  yield_unit?: string;

  @ApiPropertyOptional({ description: 'Status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
