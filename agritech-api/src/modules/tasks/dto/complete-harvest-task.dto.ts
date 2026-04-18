import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class HarvestWorkerDto {
  @ApiProperty({ description: 'Worker ID' })
  @IsUUID()
  worker_id: string;

  @ApiProperty({ description: 'Hours worked' })
  @IsNumber()
  @Min(0)
  hours_worked: number;

  @ApiPropertyOptional({ description: 'Quantity picked by this worker' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity_picked?: number;
}

export class CompleteHarvestTaskDto {
  @ApiPropertyOptional({ description: 'Quality rating (1-5)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  quality_rating?: number;

  @ApiPropertyOptional({ description: 'Actual cost incurred' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actual_cost?: number;

  @ApiPropertyOptional({ description: 'Completion notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  // Harvest-specific fields
  @ApiPropertyOptional({ description: 'Crop ID harvested. If not provided, will use crop_type from parcel' })
  @IsOptional()
  @ValidateIf((o) => o.crop_id !== undefined && o.crop_id !== null && o.crop_id !== '')
  @IsUUID()
  crop_id?: string;

  @ApiProperty({ description: 'Harvest date (YYYY-MM-DD)' })
  @IsString()
  harvest_date: string;

  @ApiProperty({ description: 'Total quantity harvested' })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({
    description: 'Unit of measurement',
    enum: ['kg', 'tons', 'units', 'boxes', 'crates', 'liters']
  })
  @IsEnum(['kg', 'tons', 'units', 'boxes', 'crates', 'liters'])
  unit: string;

  @ApiPropertyOptional({
    description: 'Quality grade',
    enum: ['A', 'B', 'C', 'Extra', 'First', 'Second', 'Third']
  })
  @IsOptional()
  @IsEnum(['A', 'B', 'C', 'Extra', 'First', 'Second', 'Third'])
  quality_grade?: string;

  @ApiPropertyOptional({ description: 'Quality score (1-10)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  quality_score?: number;

  @ApiPropertyOptional({ description: 'Quality notes' })
  @IsOptional()
  @IsString()
  quality_notes?: string;

  @ApiProperty({
    description: 'Workers involved in harvest',
    type: [HarvestWorkerDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HarvestWorkerDto)
  workers: HarvestWorkerDto[];

  @ApiPropertyOptional({ description: 'Supervisor ID' })
  @IsOptional()
  @IsUUID()
  supervisor_id?: string;

  @ApiPropertyOptional({ description: 'Storage location' })
  @IsOptional()
  @IsString()
  storage_location?: string;

  @ApiPropertyOptional({ description: 'Temperature (celsius)' })
  @IsOptional()
  @IsNumber()
  temperature?: number;

  @ApiPropertyOptional({ description: 'Humidity percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  humidity?: number;

  @ApiPropertyOptional({
    description: 'Intended use',
    enum: ['market', 'storage', 'processing', 'export', 'direct_client']
  })
  @IsOptional()
  @IsEnum(['market', 'storage', 'processing', 'export', 'direct_client'])
  intended_for?: string;

  @ApiPropertyOptional({ description: 'Expected price per unit' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  expected_price_per_unit?: number;

  @ApiPropertyOptional({ description: 'Harvest notes' })
  @IsOptional()
  @IsString()
  harvest_notes?: string;

  @ApiPropertyOptional({ description: 'Lot number for traceability' })
  @IsOptional()
  @IsString()
  lot_number?: string;

  @ApiPropertyOptional({ description: 'Whether this is a partial harvest (task stays in progress)' })
  @IsOptional()
  is_partial?: boolean;

  @ApiPropertyOptional({ description: 'Rate per unit for per-unit payment tasks (overrides task rate)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rate_per_unit?: number;
}
