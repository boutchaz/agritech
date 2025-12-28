import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsString, IsOptional, IsNumber, IsDateString, IsBoolean, IsEnum } from 'class-validator';

export enum ScheduleFrequency {
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  BIANNUALLY = 'biannually',
  ANNUALLY = 'annually',
  CUSTOM = 'custom',
}

export class CreateSampleScheduleDto {
  @ApiProperty({ description: 'Service type ID' })
  @IsNotEmpty()
  @IsUUID()
  service_type_id: string;

  @ApiPropertyOptional({ description: 'Farm ID' })
  @IsOptional()
  @IsUUID()
  farm_id?: string;

  @ApiPropertyOptional({ description: 'Parcel ID' })
  @IsOptional()
  @IsUUID()
  parcel_id?: string;

  @ApiProperty({ description: 'Schedule name/description' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ enum: ScheduleFrequency, description: 'Collection frequency' })
  @IsOptional()
  @IsEnum(ScheduleFrequency)
  frequency?: ScheduleFrequency;

  @ApiPropertyOptional({ description: 'Custom frequency in days (when frequency is CUSTOM)' })
  @IsOptional()
  @IsNumber()
  frequency_days?: number;

  @ApiProperty({ description: 'Next scheduled collection date' })
  @IsNotEmpty()
  @IsDateString()
  next_collection_date: string;

  @ApiPropertyOptional({ description: 'Last collection date' })
  @IsOptional()
  @IsDateString()
  last_collection_date?: string;

  @ApiPropertyOptional({ description: 'Assigned user ID' })
  @IsOptional()
  @IsUUID()
  assigned_to?: string;

  @ApiPropertyOptional({ description: 'Whether schedule is active', default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ description: 'Sampling location description' })
  @IsOptional()
  @IsString()
  sampling_location?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
