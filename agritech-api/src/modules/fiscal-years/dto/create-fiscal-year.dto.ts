import { IsString, IsDateString, IsOptional, IsBoolean, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFiscalYearDto {
  @ApiProperty({ description: 'Fiscal year name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Fiscal year code (e.g. EX2025)' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Start date of fiscal year' })
  @IsDateString()
  start_date: string;

  @ApiProperty({ description: 'End date of fiscal year' })
  @IsDateString()
  end_date: string;

  @ApiPropertyOptional({ description: 'Period type', enum: ['monthly', 'quarterly'] })
  @IsOptional()
  @IsIn(['monthly', 'quarterly'])
  period_type?: string;

  @ApiPropertyOptional({ description: 'Whether this is the current fiscal year' })
  @IsOptional()
  @IsBoolean()
  is_current?: boolean;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
