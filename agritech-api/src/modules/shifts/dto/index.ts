import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateShiftDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;

  @ApiProperty({ example: '08:00' })
  @Matches(/^[0-2]\d:[0-5]\d(:[0-5]\d)?$/, { message: 'start_time must be HH:MM[:SS]' })
  start_time!: string;

  @ApiProperty({ example: '17:00' })
  @Matches(/^[0-2]\d:[0-5]\d(:[0-5]\d)?$/, { message: 'end_time must be HH:MM[:SS]' })
  end_time!: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) grace_period_minutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enable_auto_attendance?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() mark_late_after_minutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() early_exit_before_minutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_active?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
}

export class UpdateShiftDto extends PartialType(CreateShiftDto) {}

export class CreateShiftAssignmentDto {
  @ApiProperty() @IsUUID() worker_id!: string;
  @ApiProperty() @IsUUID() shift_id!: string;
  @ApiProperty() @IsDateString() effective_from!: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() effective_to?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_recurring?: boolean;
  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  recurring_days?: number[];
}

export class CreateShiftRequestDto {
  @ApiProperty() @IsUUID() worker_id!: string;
  @ApiProperty() @IsUUID() requested_shift_id!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() current_shift_id?: string;
  @ApiProperty() @IsDateString() date!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class ResolveShiftRequestDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsIn(['approved', 'rejected'])
  status!: 'approved' | 'rejected';
}
