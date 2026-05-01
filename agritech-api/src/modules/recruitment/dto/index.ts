import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

const OPENING_STATUSES = ['draft', 'open', 'on_hold', 'closed', 'cancelled'] as const;
const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'seasonal'] as const;

export class CreateJobOpeningDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() farm_id?: string;
  @ApiProperty() @IsString() title!: string;
  @ApiProperty() @IsString() description!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() designation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() department?: string;
  @ApiPropertyOptional({ enum: EMPLOYMENT_TYPES })
  @IsOptional()
  @IsIn(EMPLOYMENT_TYPES as unknown as string[])
  employment_type?: typeof EMPLOYMENT_TYPES[number];
  @ApiPropertyOptional() @IsOptional() @IsString() worker_type?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) vacancies?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() salary_range_min?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() salary_range_max?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() publish_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() closing_date?: string;
  @ApiPropertyOptional({ enum: OPENING_STATUSES })
  @IsOptional()
  @IsIn(OPENING_STATUSES as unknown as string[])
  status?: typeof OPENING_STATUSES[number];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_published?: boolean;
}

export class UpdateJobOpeningDto extends PartialType(CreateJobOpeningDto) {}

const APPLICANT_STATUSES = [
  'applied', 'screening', 'interview_scheduled', 'interviewed',
  'offered', 'hired', 'rejected', 'withdrawn',
] as const;
const SOURCES = ['direct', 'referral', 'website', 'agency', 'other'] as const;

export class CreateJobApplicantDto {
  @ApiProperty() @IsUUID() job_opening_id!: string;
  @ApiProperty() @IsString() first_name!: string;
  @ApiProperty() @IsString() last_name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() resume_url?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cover_letter_url?: string;
  @ApiPropertyOptional({ enum: SOURCES })
  @IsOptional()
  @IsIn(SOURCES as unknown as string[])
  source?: typeof SOURCES[number];
  @ApiPropertyOptional() @IsOptional() @IsUUID() referred_by_worker_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() tags?: string[];
}

export class UpdateJobApplicantDto extends PartialType(CreateJobApplicantDto) {
  @ApiPropertyOptional({ enum: APPLICANT_STATUSES })
  @IsOptional()
  @IsIn(APPLICANT_STATUSES as unknown as string[])
  status?: typeof APPLICANT_STATUSES[number];
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(5) rating?: number;
}

const INTERVIEW_TYPES = ['phone', 'video', 'in_person'] as const;
const INTERVIEW_STATUSES = ['scheduled', 'completed', 'cancelled', 'no_show'] as const;

export class CreateInterviewDto {
  @ApiProperty() @IsUUID() applicant_id!: string;
  @ApiProperty() @IsUUID() job_opening_id!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) round?: number;
  @ApiPropertyOptional({ enum: INTERVIEW_TYPES })
  @IsOptional()
  @IsIn(INTERVIEW_TYPES as unknown as string[])
  interview_type?: typeof INTERVIEW_TYPES[number];
  @ApiProperty() @IsDateString() scheduled_at!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(15) duration_minutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  interviewer_ids?: string[];
}

export class UpdateInterviewDto extends PartialType(CreateInterviewDto) {
  @ApiPropertyOptional({ enum: INTERVIEW_STATUSES })
  @IsOptional()
  @IsIn(INTERVIEW_STATUSES as unknown as string[])
  status?: typeof INTERVIEW_STATUSES[number];
  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  feedback?: unknown[];
}
