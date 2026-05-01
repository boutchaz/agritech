import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateLeaveTypeDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name_fr?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name_ar?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;

  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsNumber() @Min(0) annual_allocation?: number;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() is_carry_forward?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) maximum_carry_forward_days?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) carry_forward_expiry_months?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_encashable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) encashment_amount_per_day?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  applicable_worker_types?: string[];

  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_paid?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requires_approval?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) maximum_consecutive_days?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) minimum_advance_notice_days?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_earned_leave?: boolean;
  @ApiPropertyOptional({ enum: ['monthly', 'quarterly', 'biannual', 'annual'] })
  @IsOptional()
  @IsIn(['monthly', 'quarterly', 'biannual', 'annual'])
  earned_leave_frequency?: 'monthly' | 'quarterly' | 'biannual' | 'annual';
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) earned_leave_days_per_period?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_active?: boolean;
}

export class UpdateLeaveTypeDto extends PartialType(CreateLeaveTypeDto) {}
