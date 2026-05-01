import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

const GRIEVANCE_TYPES = [
  'workplace', 'colleague', 'department', 'policy', 'harassment', 'safety', 'other',
] as const;
const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
const GRIEVANCE_STATUSES = [
  'submitted', 'acknowledged', 'investigating', 'resolved', 'escalated', 'closed',
] as const;

export class CreateGrievanceDto {
  @ApiProperty() @IsUUID() raised_by_worker_id!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() against_worker_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() against_department?: string;
  @ApiProperty() @IsString() subject!: string;
  @ApiProperty() @IsString() description!: string;
  @ApiProperty({ enum: GRIEVANCE_TYPES })
  @IsIn(GRIEVANCE_TYPES as unknown as string[])
  grievance_type!: typeof GRIEVANCE_TYPES[number];
  @ApiPropertyOptional({ enum: PRIORITIES })
  @IsOptional()
  @IsIn(PRIORITIES as unknown as string[])
  priority?: typeof PRIORITIES[number];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_anonymous?: boolean;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  attachments?: string[];
}

export class UpdateGrievanceDto extends PartialType(CreateGrievanceDto) {
  @ApiPropertyOptional({ enum: GRIEVANCE_STATUSES })
  @IsOptional()
  @IsIn(GRIEVANCE_STATUSES as unknown as string[])
  status?: typeof GRIEVANCE_STATUSES[number];
  @ApiPropertyOptional() @IsOptional() @IsString() resolution?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() resolution_date?: string;
}

const TRAINING_TYPES = ['safety', 'technical', 'certification', 'onboarding', 'other'] as const;
const RECURRENCES = ['annual', 'biannual', 'one_time'] as const;

export class CreateTrainingProgramDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: TRAINING_TYPES })
  @IsOptional()
  @IsIn(TRAINING_TYPES as unknown as string[])
  training_type?: typeof TRAINING_TYPES[number];
  @ApiPropertyOptional() @IsOptional() @IsString() provider?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) duration_hours?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cost_per_participant?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_mandatory?: boolean;
  @ApiPropertyOptional({ enum: RECURRENCES })
  @IsOptional()
  @IsIn(RECURRENCES as unknown as string[])
  recurrence?: typeof RECURRENCES[number];
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  applicable_worker_types?: string[];
}

export class UpdateTrainingProgramDto extends PartialType(CreateTrainingProgramDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_active?: boolean;
}

const ENROLLMENT_STATUSES = ['enrolled', 'in_progress', 'completed', 'failed', 'cancelled'] as const;

export class CreateEnrollmentDto {
  @ApiProperty() @IsUUID() program_id!: string;
  @ApiProperty() @IsUUID() worker_id!: string;
  @ApiProperty() @IsDateString() enrolled_date!: string;
}

export class UpdateEnrollmentDto {
  @ApiPropertyOptional({ enum: ENROLLMENT_STATUSES })
  @IsOptional()
  @IsIn(ENROLLMENT_STATUSES as unknown as string[])
  status?: typeof ENROLLMENT_STATUSES[number];
  @ApiPropertyOptional() @IsOptional() @IsDateString() completion_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() score?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() certificate_url?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() feedback?: string;
}

export class BulkEnrollDto {
  @ApiProperty() @IsUUID() program_id!: string;
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('all', { each: true })
  worker_ids!: string[];
  @ApiProperty() @IsDateString() enrolled_date!: string;
}
