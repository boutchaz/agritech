import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateBankTransactionDto {
  @ApiProperty()
  @IsUUID()
  bank_account_id: string;

  @ApiProperty({ description: 'ISO date' })
  @IsString()
  transaction_date: string;

  @ApiPropertyOptional({ description: 'ISO date — bank value date if different from transaction date' })
  @IsOptional()
  @IsString()
  value_date?: string;

  @ApiProperty({ description: 'Positive = inflow, negative = outflow' })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  balance_after?: number;

  @ApiPropertyOptional({ description: 'manual / csv / ofx / mt940 / api', default: 'manual' })
  @IsOptional()
  @IsString()
  source?: string;
}

export class MatchBankTransactionDto {
  @ApiProperty({ description: 'accounting_payments.id to link' })
  @IsUUID()
  payment_id: string;
}

export class ListBankTransactionsQueryDto {
  @ApiPropertyOptional({ description: 'Only unreconciled lines' })
  @IsOptional()
  @IsBoolean()
  unreconciled_only?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to_date?: string;
}
