import { IsUUID, IsString, IsDate, IsArray, IsNumber, IsOptional, IsEnum, ValidateNested, Length } from 'class-validator';
import { Type } from 'class-transformer';

export enum JournalEntryType {
  EXPENSE = 'expense',
  REVENUE = 'revenue',
  TRANSFER = 'transfer',
  ADJUSTMENT = 'adjustment',
  PERIOD_CLOSING = 'period_closing',
  FX_REVALUATION = 'fx_revaluation',
}

export enum JournalEntryStatus {
  DRAFT = 'draft',
  POSTED = 'posted',
  CANCELLED = 'cancelled',
}

export class JournalItemDto {
  @IsUUID()
  account_id: string;

  @IsNumber()
  debit: number;

  @IsNumber()
  credit: number;

  @IsString()
  @IsOptional()
  description?: string;

  // Multi-currency FX (4d) — optional. If not provided, derived in service:
  // currency = account.currency_code or org base; rate = 1 if same as base;
  // fc_debit/fc_credit default to debit/credit.
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsNumber()
  exchange_rate?: number;

  @IsOptional()
  @IsNumber()
  fc_debit?: number;

  @IsOptional()
  @IsNumber()
  fc_credit?: number;
}

export class CreateJournalEntryDto {
  @IsUUID()
  organization_id: string;

  @IsString()
  entry_number: string;

  @Type(() => Date)
  @IsDate()
  entry_date: Date;

  @IsEnum(JournalEntryType)
  entry_type: JournalEntryType;

  @IsString()
  description: string;

  @IsUUID()
  @IsOptional()
  reference_id?: string;

  @IsString()
  @IsOptional()
  reference_type?: string;

  @IsNumber()
  total_debit: number;

  @IsNumber()
  total_credit: number;

  @IsEnum(JournalEntryStatus)
  status: JournalEntryStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalItemDto)
  items: JournalItemDto[];

  @IsUUID()
  created_by: string;

  // Phase 4f: tag inter-org transaction pair (eliminated on consolidation)
  @IsOptional()
  @IsUUID()
  intercompany_pair_id?: string;
}
