import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsIn,
  IsNumber,
  IsBoolean,
  IsArray,
  IsDateString,
  Min,
  Max,
} from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({ description: 'Farm ID' })
  @IsUUID()
  farm_id: string;

  @ApiProperty({ description: 'Task title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Task description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Task type',
    enum: ['planting', 'harvesting', 'irrigation', 'fertilization', 'maintenance', 'general', 'pest_control', 'pruning', 'soil_preparation']
  })
  @IsIn(['planting', 'harvesting', 'irrigation', 'fertilization', 'maintenance', 'general', 'pest_control', 'pruning', 'soil_preparation'])
  task_type: string;

  @ApiPropertyOptional({
    description: 'Task priority',
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  })
  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority?: string;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsOptional()
  @IsUUID()
  category_id?: string;

  @ApiPropertyOptional({ description: 'Parcel ID' })
  @IsOptional()
  @IsUUID()
  parcel_id?: string;

  @ApiPropertyOptional({ description: 'Crop ID' })
  @IsOptional()
  @IsUUID()
  crop_id?: string;

  @ApiPropertyOptional({ description: 'Worker ID to assign task to' })
  @IsOptional()
  @IsUUID()
  assigned_to?: string;

  @ApiPropertyOptional({ description: 'Scheduled start time (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  scheduled_start?: string;

  @ApiPropertyOptional({ description: 'Scheduled end time (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  scheduled_end?: string;

  @ApiPropertyOptional({ description: 'Due date (ISO date)' })
  @IsOptional()
  @IsDateString()
  due_date?: string;

  @ApiPropertyOptional({ description: 'Estimated duration in hours' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimated_duration?: number;

  @ApiPropertyOptional({
    description: 'Required skills',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  required_skills?: string[];

  @ApiPropertyOptional({
    description: 'Equipment required',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  equipment_required?: string[];

  @ApiPropertyOptional({ description: 'Weather dependency', default: false })
  @IsOptional()
  @IsBoolean()
  weather_dependency?: boolean;

  @ApiPropertyOptional({ description: 'Cost estimate' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost_estimate?: number;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Location latitude' })
  @IsOptional()
  @IsNumber()
  location_lat?: number;

  @ApiPropertyOptional({ description: 'Location longitude' })
  @IsOptional()
  @IsNumber()
  location_lng?: number;
}
