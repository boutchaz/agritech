import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  Min,
} from 'class-validator';

export class ProcessReceptionPaymentDto {
  @ApiProperty({ description: 'Whether to create payment record for workers' })
  @IsBoolean()
  create_payment: boolean;

  @ApiPropertyOptional({ description: 'Worker ID to receive payment' })
  @IsOptional()
  @IsUUID()
  worker_id?: string;

  @ApiPropertyOptional({
    description: 'Payment type',
    enum: ['daily_wage', 'per_unit', 'bonus', 'overtime']
  })
  @IsOptional()
  @IsEnum(['daily_wage', 'per_unit', 'bonus', 'overtime'])
  payment_type?: string;

  @ApiPropertyOptional({ description: 'Payment amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ description: 'Units completed (for per_unit payment)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  units_completed?: number;

  @ApiPropertyOptional({ description: 'Rate per unit' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rate_per_unit?: number;

  @ApiPropertyOptional({ description: 'Hours worked' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hours_worked?: number;

  @ApiPropertyOptional({
    description: 'Payment method',
    enum: ['cash', 'bank_transfer', 'check', 'mobile_money']
  })
  @IsOptional()
  @IsEnum(['cash', 'bank_transfer', 'check', 'mobile_money'])
  payment_method?: string;

  @ApiPropertyOptional({ description: 'Payment notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Whether to create journal entry' })
  @IsBoolean()
  create_journal_entry: boolean;

  @ApiPropertyOptional({ description: 'Debit account ID (expense account)' })
  @IsOptional()
  @IsUUID()
  debit_account_id?: string;

  @ApiPropertyOptional({ description: 'Credit account ID (cash/bank account)' })
  @IsOptional()
  @IsUUID()
  credit_account_id?: string;

  @ApiPropertyOptional({ description: 'Journal entry description' })
  @IsOptional()
  @IsString()
  journal_description?: string;
}
