import { IsUUID, IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { PartialType, OmitType } from '@nestjs/swagger';

export class CreateProductVariantDto {
  @IsUUID()
  organization_id: string;

  @IsUUID()
  item_id: string;

  @IsString()
  variant_name: string;

  @IsString()
  @IsOptional()
  variant_sku?: string;

  @IsUUID()
  @IsOptional()
  unit_id?: string; // Reference to work_units table

  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsNumber()
  @IsOptional()
  min_stock_level?: number;

  @IsNumber()
  @IsOptional()
  standard_rate?: number;

  @IsNumber()
  @IsOptional()
  last_purchase_rate?: number;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsNumber()
  @IsOptional()
  base_quantity?: number;
}

export class UpdateProductVariantDto extends PartialType(
  OmitType(CreateProductVariantDto, ['organization_id', 'item_id'] as const),
) {}
