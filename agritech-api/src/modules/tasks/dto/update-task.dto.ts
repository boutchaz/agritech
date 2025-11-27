import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsNumber, IsDateString, Min, Max } from 'class-validator';
import { CreateTaskDto } from './create-task.dto';

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

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
