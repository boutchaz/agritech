import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional, IsArray, ValidateNested, IsEnum, IsBoolean, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTaskAssignmentDto {
  @ApiProperty({ description: 'Worker ID to assign' })
  @IsUUID()
  worker_id: string;

  @ApiPropertyOptional({ description: 'Role in the task', enum: ['worker', 'supervisor', 'lead'] })
  @IsOptional()
  @IsEnum(['worker', 'supervisor', 'lead'])
  role?: 'worker' | 'supervisor' | 'lead';

  @ApiPropertyOptional({ description: 'For fixed_salary workers: task is included in salary (no extra pay)' })
  @IsOptional()
  @IsBoolean()
  payment_included_in_salary?: boolean;

  @ApiPropertyOptional({ description: 'Bonus amount for fixed_salary workers (when not included in salary)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bonus_amount?: number;

  @ApiPropertyOptional({ description: 'Notes about the assignment' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkCreateTaskAssignmentsDto {
  @ApiProperty({ description: 'Array of worker assignments', type: [CreateTaskAssignmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTaskAssignmentDto)
  assignments: CreateTaskAssignmentDto[];
}

export class UpdateTaskAssignmentDto {
  @ApiPropertyOptional({ description: 'Status of the assignment', enum: ['assigned', 'working', 'completed', 'removed'] })
  @IsOptional()
  @IsEnum(['assigned', 'working', 'completed', 'removed'])
  status?: 'assigned' | 'working' | 'completed' | 'removed';

  @ApiPropertyOptional({ description: 'Hours worked' })
  @IsOptional()
  hours_worked?: number;

  @ApiPropertyOptional({ description: 'Units completed' })
  @IsOptional()
  units_completed?: number;

  @ApiPropertyOptional({ description: 'For fixed_salary workers: task is included in salary (no extra pay)' })
  @IsOptional()
  @IsBoolean()
  payment_included_in_salary?: boolean;

  @ApiPropertyOptional({ description: 'Bonus amount for fixed_salary workers' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bonus_amount?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
