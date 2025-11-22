import { IsUUID, IsString, IsDate, IsArray, IsNumber, IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum JournalEntryType {
  EXPENSE = 'expense',
  REVENUE = 'revenue',
  TRANSFER = 'transfer',
  ADJUSTMENT = 'adjustment',
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
}
