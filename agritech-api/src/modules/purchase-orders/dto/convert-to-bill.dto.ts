import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class ConvertToBillDto {
  @ApiProperty({
    description: 'Invoice date (defaults to today if not provided)',
    example: '2024-01-15',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  invoice_date?: string;

  @ApiProperty({
    description: 'Due date (defaults to invoice_date + 30 days if not provided)',
    example: '2024-02-14',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  due_date?: string;
}
