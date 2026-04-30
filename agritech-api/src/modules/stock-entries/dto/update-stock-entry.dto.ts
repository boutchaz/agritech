import { IsUUID, IsString, IsDate, IsOptional, IsEnum, IsInt, IsISO8601, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { StockEntryType } from './create-stock-entry.dto';

export class UpdateStockEntryDto {
  @IsUUID()
  @IsOptional()
  client_id?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  version?: number;

  @IsISO8601()
  @IsOptional()
  client_created_at?: string;

  @IsEnum(StockEntryType)
  @IsOptional()
  entry_type?: StockEntryType;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  entry_date?: Date;

  @IsUUID()
  @IsOptional()
  from_warehouse_id?: string;

  @IsUUID()
  @IsOptional()
  to_warehouse_id?: string;

  @IsString()
  @IsOptional()
  reference_type?: string;

  @IsUUID()
  @IsOptional()
  reference_id?: string;

  @IsString()
  @IsOptional()
  reference_number?: string;

  @IsString()
  @IsOptional()
  purpose?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
