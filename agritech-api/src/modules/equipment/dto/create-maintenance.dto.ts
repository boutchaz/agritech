import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsIn,
  IsNumber,
  Min,
} from 'class-validator';

const MAINTENANCE_TYPES = [
  'oil_change',
  'repair',
  'inspection',
  'tire_replacement',
  'battery',
  'filter',
  'fuel_fill',
  'registration',
  'insurance',
  'other',
] as const;

export class CreateMaintenanceDto {
  @ApiProperty({
    description: 'Maintenance type',
    enum: MAINTENANCE_TYPES,
  })
  @IsIn(MAINTENANCE_TYPES)
  type: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Cost' })
  @IsNumber()
  @Min(0)
  cost: number;

  @ApiProperty({ description: 'Maintenance date' })
  @IsDateString()
  maintenance_date: string;

  @ApiPropertyOptional({ description: 'Hour meter reading at time of service' })
  @IsOptional()
  @IsNumber()
  hour_meter_reading?: number;

  @ApiPropertyOptional({ description: 'Next service date' })
  @IsOptional()
  @IsDateString()
  next_service_date?: string;

  @ApiPropertyOptional({ description: 'Next service hours' })
  @IsOptional()
  @IsNumber()
  next_service_hours?: number;

  @ApiPropertyOptional({ description: 'Vendor name' })
  @IsOptional()
  @IsString()
  vendor?: string;

  @ApiPropertyOptional({ description: 'Vendor invoice number' })
  @IsOptional()
  @IsString()
  vendor_invoice_number?: string;

  @ApiPropertyOptional({ description: 'Cost center ID' })
  @IsOptional()
  @IsUUID()
  cost_center_id?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
