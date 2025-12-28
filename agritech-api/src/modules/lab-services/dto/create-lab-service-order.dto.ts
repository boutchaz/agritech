import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsOptional, IsString, IsDateString, IsEnum, IsNumber } from 'class-validator';
import { OrderStatus } from './lab-service-order-filters.dto';

export class CreateLabServiceOrderDto {
  @ApiProperty({ description: 'Service type ID' })
  @IsNotEmpty()
  @IsUUID()
  service_type_id: string;

  @ApiProperty({ description: 'Provider ID' })
  @IsNotEmpty()
  @IsUUID()
  provider_id: string;

  @ApiPropertyOptional({ description: 'Farm ID' })
  @IsOptional()
  @IsUUID()
  farm_id?: string;

  @ApiPropertyOptional({ description: 'Parcel ID' })
  @IsOptional()
  @IsUUID()
  parcel_id?: string;

  @ApiPropertyOptional({ description: 'Order date', default: 'now' })
  @IsOptional()
  @IsDateString()
  order_date?: string;

  @ApiPropertyOptional({ enum: OrderStatus, default: OrderStatus.PENDING })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ description: 'Sample collection date' })
  @IsOptional()
  @IsDateString()
  sample_collection_date?: string;

  @ApiPropertyOptional({ description: 'Sample collector user ID' })
  @IsOptional()
  @IsUUID()
  sample_collector_id?: string;

  @ApiPropertyOptional({ description: 'Lab reference number' })
  @IsOptional()
  @IsString()
  lab_reference_number?: string;

  @ApiPropertyOptional({ description: 'Expected results date' })
  @IsOptional()
  @IsDateString()
  expected_results_date?: string;

  @ApiPropertyOptional({ description: 'Actual results date' })
  @IsOptional()
  @IsDateString()
  actual_results_date?: string;

  @ApiPropertyOptional({ description: 'Cost of the service' })
  @IsOptional()
  @IsNumber()
  cost?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Sampling location description' })
  @IsOptional()
  @IsString()
  sampling_location?: string;

  @ApiPropertyOptional({ description: 'Sampling depth in cm' })
  @IsOptional()
  @IsNumber()
  sampling_depth_cm?: number;
}
