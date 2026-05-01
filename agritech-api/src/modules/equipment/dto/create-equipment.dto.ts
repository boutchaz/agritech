import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsIn,
  IsNumber,
  IsArray,
  IsUrl,
  Min,
} from 'class-validator';

const CATEGORIES = [
  'tractor',
  'harvester',
  'sprayer',
  'utility_vehicle',
  'pump',
  'small_tool',
  'other',
] as const;

const FUEL_TYPES = ['diesel', 'petrol', 'electric', 'other'] as const;

const STATUSES = [
  'available',
  'in_use',
  'maintenance',
  'out_of_service',
] as const;

export class CreateEquipmentDto {
  @ApiProperty({ description: 'Equipment name' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Equipment category',
    enum: CATEGORIES,
  })
  @IsIn(CATEGORIES)
  category: string;

  @ApiPropertyOptional({ description: 'Brand' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ description: 'Model' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ description: 'Serial number' })
  @IsOptional()
  @IsString()
  serial_number?: string;

  @ApiPropertyOptional({ description: 'License plate (for road vehicles)' })
  @IsOptional()
  @IsString()
  license_plate?: string;

  @ApiPropertyOptional({ description: 'Purchase date' })
  @IsOptional()
  @IsDateString()
  purchase_date?: string;

  @ApiPropertyOptional({ description: 'Purchase price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchase_price?: number;

  @ApiPropertyOptional({ description: 'Current value (manual for v1)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  current_value?: number;

  @ApiPropertyOptional({ description: 'Hour meter reading (hours)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hour_meter_reading?: number;

  @ApiPropertyOptional({ description: 'Hour meter reading date' })
  @IsOptional()
  @IsDateString()
  hour_meter_date?: string;

  @ApiProperty({
    description: 'Fuel type',
    enum: FUEL_TYPES,
  })
  @IsIn(FUEL_TYPES)
  fuel_type: string;

  @ApiProperty({
    description: 'Equipment status',
    enum: STATUSES,
  })
  @IsIn(STATUSES)
  status: string;

  @ApiPropertyOptional({ description: 'Assigned operator user ID' })
  @IsOptional()
  @IsUUID()
  assigned_to?: string;

  @ApiPropertyOptional({ description: 'Insurance expiry date' })
  @IsOptional()
  @IsDateString()
  insurance_expiry?: string;

  @ApiPropertyOptional({ description: 'Registration expiry date' })
  @IsOptional()
  @IsDateString()
  registration_expiry?: string;

  @ApiPropertyOptional({ description: 'Farm ID (if farm-specific)' })
  @IsOptional()
  @IsUUID()
  farm_id?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Photo URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  photos?: string[];
}
