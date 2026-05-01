import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeaveApplicationDto {
  @ApiProperty() @IsUUID() worker_id!: string;
  @ApiProperty() @IsUUID() leave_type_id!: string;
  @ApiProperty() @IsDateString() from_date!: string;
  @ApiProperty() @IsDateString() to_date!: string;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() half_day?: boolean;
  @ApiPropertyOptional({ enum: ['first_half', 'second_half'] })
  @IsOptional()
  @IsIn(['first_half', 'second_half'])
  half_day_period?: 'first_half' | 'second_half';
  @ApiProperty() @IsString() reason!: string;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachment_urls?: string[];
}

export class RejectLeaveApplicationDto {
  @ApiProperty() @IsString() rejection_reason!: string;
}
