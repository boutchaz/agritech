import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

const CYCLE_STATUSES = ['draft', 'self_assessment', 'manager_review', 'calibration', 'completed'] as const;

export class CreateAppraisalCycleDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsDateString() start_date!: string;
  @ApiProperty() @IsDateString() end_date!: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() self_assessment_deadline?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() manager_assessment_deadline?: string;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  applicable_worker_types?: string[];
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  applicable_farm_ids?: string[];
}

export class UpdateAppraisalCycleDto extends PartialType(CreateAppraisalCycleDto) {
  @ApiPropertyOptional({ enum: CYCLE_STATUSES })
  @IsOptional()
  @IsIn(CYCLE_STATUSES as unknown as string[])
  status?: typeof CYCLE_STATUSES[number];
}

const APPRAISAL_STATUSES = ['pending', 'self_assessment', 'manager_review', 'completed'] as const;

export class CreateAppraisalDto {
  @ApiProperty() @IsUUID() worker_id!: string;
  @ApiProperty() @IsUUID() cycle_id!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() manager_id?: string;
}

export class UpdateAppraisalDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(5) self_rating?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() self_reflections?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() manager_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(5) manager_rating?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() manager_feedback?: string;
  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  kra_scores?: unknown[];
  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  goals?: unknown[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(5) final_score?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() final_feedback?: string;
  @ApiPropertyOptional({ enum: APPRAISAL_STATUSES })
  @IsOptional()
  @IsIn(APPRAISAL_STATUSES as unknown as string[])
  status?: typeof APPRAISAL_STATUSES[number];
}

const FEEDBACK_TYPES = ['peer', 'manager', 'subordinate', 'external'] as const;

export class CreateFeedbackDto {
  @ApiProperty() @IsUUID() worker_id!: string;
  @ApiProperty() @IsUUID() reviewer_id!: string;
  @ApiProperty({ enum: FEEDBACK_TYPES })
  @IsIn(FEEDBACK_TYPES as unknown as string[])
  feedback_type!: typeof FEEDBACK_TYPES[number];
  @ApiPropertyOptional() @IsOptional() @IsString() review_period?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(5) rating?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() strengths?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() improvements?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
