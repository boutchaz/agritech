import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePayrollRunDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsDateString() pay_period_start!: string;
  @ApiProperty() @IsDateString() pay_period_end!: string;
  @ApiProperty({ enum: ['monthly', 'biweekly', 'weekly', 'daily'] })
  @IsIn(['monthly', 'biweekly', 'weekly', 'daily'])
  pay_frequency!: 'monthly' | 'biweekly' | 'weekly' | 'daily';
  @ApiPropertyOptional() @IsOptional() @IsDateString() posting_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() farm_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() worker_type?: string;
}

export class GenerateSlipDto {
  @ApiProperty() @IsUUID() worker_id!: string;
  @ApiProperty() @IsDateString() pay_period_start!: string;
  @ApiProperty() @IsDateString() pay_period_end!: string;
  @ApiProperty({ enum: ['monthly', 'biweekly', 'weekly', 'daily'] })
  @IsIn(['monthly', 'biweekly', 'weekly', 'daily'])
  pay_frequency!: 'monthly' | 'biweekly' | 'weekly' | 'daily';
  @ApiPropertyOptional() @IsOptional() @IsUUID() payroll_run_id?: string;
}
