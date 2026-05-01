import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeaveAllocationDto {
  @ApiProperty() @IsUUID() worker_id!: string;
  @ApiProperty() @IsUUID() leave_type_id!: string;
  @ApiProperty() @IsNumber() @Min(0) total_days!: number;
  @ApiProperty() @IsDateString() period_start!: string;
  @ApiProperty() @IsDateString() period_end!: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) carry_forwarded_days?: number;
}

export class BulkAllocateDto {
  @ApiProperty() @IsUUID() leave_type_id!: string;
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  worker_ids!: string[];
  @ApiProperty() @IsNumber() @Min(0) total_days!: number;
  @ApiProperty() @IsDateString() period_start!: string;
  @ApiProperty() @IsDateString() period_end!: string;
}
