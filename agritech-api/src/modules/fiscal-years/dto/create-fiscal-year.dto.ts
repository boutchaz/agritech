import { IsString, IsDateString, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFiscalYearDto {
  @ApiProperty({ description: 'Fiscal year name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Start date of fiscal year' })
  @IsDateString()
  start_date: string;

  @ApiProperty({ description: 'End date of fiscal year' })
  @IsDateString()
  end_date: string;

  @ApiProperty({ description: 'Whether this is the active fiscal year', required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({ description: 'Budget amount', required: false })
  @IsOptional()
  @IsNumber()
  budget?: number;

  @ApiProperty({ description: 'Notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
