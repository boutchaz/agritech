import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsDateString,
  IsIn,
  IsArray,
  IsInt,
  IsISO8601,
  Min,
  Max,
  ValidateNested,
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

  @ApiPropertyOptional({ description: 'Quantity picked by worker' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity_picked?: number;
}

export class CreateHarvestDto {
  @ApiPropertyOptional({ description: 'Client-generated UUID for idempotent replay' })
  @IsOptional()
  @IsUUID()
  client_id?: string;

  @ApiPropertyOptional({ description: 'Row version' })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;

  @ApiPropertyOptional({ description: 'Client wall-clock at action time' })
  @IsOptional()
  @IsISO8601()
  client_created_at?: string;

  @ApiProperty({ description: 'Farm ID' })
  @IsUUID()
  farm_id: string;

  @ApiProperty({ description: 'Parcel ID' })
  @IsUUID()
  parcel_id: string;

  @ApiPropertyOptional({ description: 'Crop ID' })
  @IsOptional()
  @IsUUID()
  crop_id?: string;

  @ApiProperty({ description: 'Harvest date (ISO date)' })
  @IsDateString()
  harvest_date: string;

  @ApiProperty({ description: 'Quantity harvested' })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({
    description: 'Unit of measurement',
    enum: ['kg', 'tons', 'units', 'boxes', 'crates', 'liters']
  })
  @IsIn(['kg', 'tons', 'units', 'boxes', 'crates', 'liters'])
  unit: string;

  @ApiPropertyOptional({
    description: 'Quality grade',
    enum: ['A', 'B', 'C', 'Extra', 'First', 'Second', 'Third']
  })
  @IsOptional()
  @IsIn(['A', 'B', 'C', 'Extra', 'First', 'Second', 'Third'])
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

  @ApiPropertyOptional({
    description: 'Workers involved in harvest',
    type: [HarvestWorkerDto]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HarvestWorkerDto)
  workers?: HarvestWorkerDto[];

  @ApiPropertyOptional({ description: 'Supervisor worker ID' })
  @IsOptional()
  @IsUUID()
  supervisor_id?: string;

  @ApiPropertyOptional({ description: 'Storage location' })
  @IsOptional()
  @IsString()
  storage_location?: string;

  @ApiPropertyOptional({ description: 'Temperature (Celsius)' })
  @IsOptional()
  @IsNumber()
  temperature?: number;

  @ApiPropertyOptional({ description: 'Humidity (percentage)' })
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
  @IsIn(['market', 'storage', 'processing', 'export', 'direct_client'])
  intended_for?: string;

  @ApiPropertyOptional({ description: 'Expected price per unit' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  expected_price_per_unit?: number;

  @ApiPropertyOptional({ description: 'Task ID related to harvest' })
  @IsOptional()
  @IsUUID()
  harvest_task_id?: string;

  @ApiPropertyOptional({ description: 'Lot number for traceability' })
  @IsOptional()
  @IsString()
  lot_number?: string;

  @ApiPropertyOptional({ description: 'Whether this is a partial harvest' })
  @IsOptional()
  is_partial?: boolean;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
