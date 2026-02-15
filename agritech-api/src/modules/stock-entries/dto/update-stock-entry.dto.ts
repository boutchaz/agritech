import { IsUUID, IsString, IsDate, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { StockEntryType } from './create-stock-entry.dto';

export class UpdateStockEntryDto {
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

  @IsUUID()
  @IsOptional()
  crop_cycle_id?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
