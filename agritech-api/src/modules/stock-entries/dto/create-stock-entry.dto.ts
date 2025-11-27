import { IsUUID, IsString, IsDate, IsArray, IsNumber, IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum StockEntryType {
  MATERIAL_RECEIPT = 'Material Receipt',
  MATERIAL_ISSUE = 'Material Issue',
  STOCK_TRANSFER = 'Stock Transfer',
  STOCK_RECONCILIATION = 'Stock Reconciliation',
}

export enum StockEntryStatus {
  DRAFT = 'Draft',
  POSTED = 'Posted',
  CANCELLED = 'Cancelled',
}

export class StockEntryItemDto {
  @IsUUID()
  item_id: string;

  @IsString()
  @IsOptional()
  item_name?: string;

  @IsNumber()
  quantity: number;

  @IsString()
  unit: string;

  @IsUUID()
  @IsOptional()
  source_warehouse_id?: string;

  @IsUUID()
  @IsOptional()
  target_warehouse_id?: string;

  @IsNumber()
  @IsOptional()
  cost_per_unit?: number;

  @IsString()
  @IsOptional()
  batch_number?: string;

  @IsString()
  @IsOptional()
  serial_number?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  expiry_date?: Date;

  @IsNumber()
  @IsOptional()
  system_quantity?: number;

  @IsNumber()
  @IsOptional()
  physical_quantity?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateStockEntryDto {
  @IsUUID()
  organization_id: string;

  @IsEnum(StockEntryType)
  entry_type: StockEntryType;

  @IsString()
  @IsOptional()
  entry_number?: string;

  @Type(() => Date)
  @IsDate()
  entry_date: Date;

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

  @IsEnum(StockEntryStatus)
  @IsOptional()
  status?: StockEntryStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockEntryItemDto)
  items: StockEntryItemDto[];

  @IsUUID()
  created_by: string;
}
