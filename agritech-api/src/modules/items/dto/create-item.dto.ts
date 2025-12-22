import {
  IsUUID,
  IsString,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDate,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ValuationMethod {
  FIFO = 'FIFO',
  MOVING_AVERAGE = 'Moving Average',
  LIFO = 'LIFO',
}

export class CreateItemDto {
  // These will be set by the controller
  organization_id?: string;
  created_by?: string;

  @IsString()
  @IsOptional()
  item_code?: string;

  @IsString()
  item_name: string;

  @IsUUID()
  @IsOptional()
  item_group_id?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  default_unit?: string;

  @IsString()
  @IsOptional()
  unit_of_measure?: string;

  @IsNumber()
  @IsOptional()
  sales_rate?: number;

  @IsBoolean()
  @IsOptional()
  is_inventory_item?: boolean;

  @IsString()
  @IsOptional()
  stock_uom?: string;

  @IsBoolean()
  @IsOptional()
  is_stock_item?: boolean;

  @IsBoolean()
  @IsOptional()
  is_sales_item?: boolean;

  @IsBoolean()
  @IsOptional()
  is_purchase_item?: boolean;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsNumber()
  @IsOptional()
  standard_rate?: number;

  @IsEnum(ValuationMethod)
  @IsOptional()
  valuation_method?: ValuationMethod;

  @IsNumber()
  @IsOptional()
  opening_stock?: number;

  @IsNumber()
  @IsOptional()
  minimum_stock_level?: number;

  @IsNumber()
  @IsOptional()
  reorder_level?: number;

  @IsNumber()
  @IsOptional()
  reorder_quantity?: number;

  @IsNumber()
  @IsOptional()
  min_order_quantity?: number;

  @IsNumber()
  @IsOptional()
  max_order_quantity?: number;

  @IsNumber()
  @IsOptional()
  lead_time_days?: number;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsString()
  @IsOptional()
  image_url?: string;

  @IsString()
  @IsOptional()
  crop_type?: string;

  @IsString()
  @IsOptional()
  variety?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  planting_season_start?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  planting_season_end?: Date;

  @IsNumber()
  @IsOptional()
  days_to_harvest?: number;

  // Marketplace fields
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsString()
  @IsOptional()
  website_description?: string;

  @IsBoolean()
  @IsOptional()
  show_in_website?: boolean;
}
