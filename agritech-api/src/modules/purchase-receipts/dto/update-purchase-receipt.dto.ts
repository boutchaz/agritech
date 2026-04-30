import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePurchaseReceiptItemDto {
  @ApiPropertyOptional({ description: 'Linked purchase order item', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  purchase_order_item_id?: string;

  @ApiPropertyOptional({ description: 'Inventory item ID', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  item_id?: string;

  @ApiPropertyOptional({ description: 'Received quantity', example: 10 })
  @IsNumber()
  @Min(0.001)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ description: 'Rejected quantity', example: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  rejected_quantity?: number;

  @ApiPropertyOptional({ description: 'Warehouse receiving the item', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  warehouse_id?: string;

  @ApiPropertyOptional({ description: 'Batch number' })
  @IsString()
  @IsOptional()
  batch_number?: string;

  @ApiPropertyOptional({ description: 'Line notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdatePurchaseReceiptDto {
  @ApiPropertyOptional({ description: 'Receipt number' })
  @IsString()
  @IsOptional()
  receipt_number?: string;

  @ApiPropertyOptional({ description: 'Receipt date', example: '2026-04-29' })
  @IsDateString()
  @IsOptional()
  receipt_date?: string;

  @ApiPropertyOptional({ description: 'Purchase order ID', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  purchase_order_id?: string;

  @ApiPropertyOptional({ description: 'Receipt notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ type: [UpdatePurchaseReceiptItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdatePurchaseReceiptItemDto)
  @IsOptional()
  items?: UpdatePurchaseReceiptItemDto[];
}
