import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsNumber, IsDateString, IsUUID, IsArray, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { CreateTaskDto } from './create-task.dto';

// Custom transform to convert empty strings to null
function EmptyStringToNull() {
  return Transform(({ value }) => (value === '' ? null : value));
}

export class UpdateTaskDto {
  @ApiPropertyOptional({ description: 'Task title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Task description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Task type',
    enum: ['planting', 'harvesting', 'irrigation', 'fertilization', 'maintenance', 'general', 'pest_control', 'pruning', 'soil_preparation']
  })
  @IsOptional()
  @IsIn(['planting', 'harvesting', 'irrigation', 'fertilization', 'maintenance', 'general', 'pest_control', 'pruning', 'soil_preparation'])
  task_type?: string;

  @ApiPropertyOptional({
    description: 'Task status',
    enum: ['pending', 'assigned', 'in_progress', 'paused', 'completed', 'cancelled', 'overdue']
  })
  @IsOptional()
  @IsIn(['pending', 'assigned', 'in_progress', 'paused', 'completed', 'cancelled', 'overdue'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Task priority',
    enum: ['low', 'medium', 'high', 'urgent']
  })
  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority?: string;

  @ApiPropertyOptional({ description: 'Farm ID' })
  @IsOptional()
  @EmptyStringToNull()
  @IsUUID()
  farm_id?: string;

  @ApiPropertyOptional({ description: 'Parcel ID' })
  @IsOptional()
  @EmptyStringToNull()
  @IsUUID()
  parcel_id?: string;

  @ApiPropertyOptional({ description: 'Crop ID' })
  @IsOptional()
  @EmptyStringToNull()
  @IsUUID()
  crop_id?: string;

  @ApiPropertyOptional({ description: 'Worker ID to assign the task to' })
  @IsOptional()
  @EmptyStringToNull()
  @IsUUID()
  assigned_to?: string;

  @ApiPropertyOptional({ description: 'Scheduled start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  scheduled_start?: string;

  @ApiPropertyOptional({ description: 'Scheduled end date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  scheduled_end?: string;

  @ApiPropertyOptional({ description: 'Due date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  due_date?: string;

  @ApiPropertyOptional({ description: 'Estimated duration in hours' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimated_duration?: number;

  @ApiPropertyOptional({ description: 'Completion percentage (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  completion_percentage?: number;

  @ApiPropertyOptional({ description: 'Actual start time (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  actual_start?: string;

  @ApiPropertyOptional({ description: 'Actual end time (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  actual_end?: string;

  @ApiPropertyOptional({ description: 'Actual duration in hours' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actual_duration?: number;

  @ApiPropertyOptional({ description: 'Actual cost' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actual_cost?: number;

  @ApiPropertyOptional({ description: 'Quality rating (1-5)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  quality_rating?: number;

  @ApiPropertyOptional({
    description: 'Payment type',
    enum: ['daily', 'per_unit', 'monthly', 'metayage', 'none']
  })
  @IsOptional()
  @IsIn(['daily', 'per_unit', 'monthly', 'metayage', 'none', 'forfait'])
  payment_type?: string;

  @ApiPropertyOptional({ description: 'Forfait amount (lump sum payment)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  forfait_amount?: number;

  @ApiPropertyOptional({ description: 'Work unit ID for piece-work' })
  @IsOptional()
  @EmptyStringToNull()
  @IsUUID()
  work_unit_id?: string;

  @ApiPropertyOptional({ description: 'Units required for the task' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  units_required?: number;

  @ApiPropertyOptional({ description: 'Rate per unit' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rate_per_unit?: number;

  @ApiPropertyOptional({ description: 'Required skills' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  required_skills?: string[];

  @ApiPropertyOptional({ description: 'Equipment required' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  equipment_required?: string[];

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
