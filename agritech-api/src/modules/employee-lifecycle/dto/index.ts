import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateOnboardingTemplateDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() department?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() designation?: string;
  @ApiPropertyOptional({ description: 'Activities array (free-form)' })
  @IsOptional()
  @IsArray()
  activities?: unknown[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_active?: boolean;
}
export class UpdateOnboardingTemplateDto extends PartialType(CreateOnboardingTemplateDto) {}

export class StartOnboardingDto {
  @ApiProperty() @IsUUID() worker_id!: string;
  @ApiProperty() @IsUUID() template_id!: string;
}

export class UpdateOnboardingRecordDto {
  @ApiPropertyOptional({ enum: ['pending', 'in_progress', 'completed', 'overdue'] })
  @IsOptional()
  @IsIn(['pending', 'in_progress', 'completed', 'overdue'])
  status?: 'pending' | 'in_progress' | 'completed' | 'overdue';
  @ApiPropertyOptional() @IsOptional() @IsArray() activities?: unknown[];
}

const SEPARATION_TYPES = [
  'resignation', 'termination', 'end_of_contract', 'retirement', 'death', 'dismissal',
] as const;

export class CreateSeparationDto {
  @ApiProperty() @IsUUID() worker_id!: string;
  @ApiProperty({ enum: SEPARATION_TYPES })
  @IsIn(SEPARATION_TYPES as unknown as string[])
  separation_type!: typeof SEPARATION_TYPES[number];
  @ApiProperty() @IsDateString() notice_date!: string;
  @ApiProperty() @IsDateString() relieving_date!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() exit_interview_notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() exit_feedback?: Record<string, unknown>;
}

export class UpdateSeparationDto extends PartialType(CreateSeparationDto) {
  @ApiPropertyOptional({ enum: ['pending', 'notice_period', 'relieved', 'settled'] })
  @IsOptional()
  @IsIn(['pending', 'notice_period', 'relieved', 'settled'])
  status?: 'pending' | 'notice_period' | 'relieved' | 'settled';
  @ApiPropertyOptional() @IsOptional() @IsBoolean() exit_interview_conducted?: boolean;
}

export class UpdateFnfDto {
  @ApiPropertyOptional() @IsOptional() @IsArray() fnf_payables?: unknown[];
  @ApiPropertyOptional() @IsOptional() @IsArray() fnf_receivables?: unknown[];
  @ApiPropertyOptional() @IsOptional() @IsArray() fnf_assets?: unknown[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() fnf_total_payable?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() fnf_total_receivable?: number;
  @ApiPropertyOptional({ enum: ['pending', 'processing', 'settled'] })
  @IsOptional()
  @IsIn(['pending', 'processing', 'settled'])
  fnf_status?: 'pending' | 'processing' | 'settled';
}
