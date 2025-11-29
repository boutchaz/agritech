import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateInvoiceStatusDto {
  @ApiProperty({ description: 'New invoice status', enum: ['draft', 'submitted', 'paid', 'partially_paid', 'overdue', 'cancelled'] })
  @IsEnum(['draft', 'submitted', 'paid', 'partially_paid', 'overdue', 'cancelled'])
  status: 'draft' | 'submitted' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';

  @ApiProperty({ description: 'Optional remarks for status change', required: false })
  @IsString()
  @IsOptional()
  remarks?: string;
}
