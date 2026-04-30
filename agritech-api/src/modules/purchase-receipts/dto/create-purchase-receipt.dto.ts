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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePurchaseReceiptItemDto {
  @ApiPropertyOptional({ description: 'Linked purchase order item', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  purchase_order_item_id?: string;

  @ApiProperty({ description: 'Inventory item ID', format: 'uuid' })
  @IsUUID()
  item_id: string;

  @ApiProperty({ description: 'Received quantity', example: 10 })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiPropertyOptional({ description: 'Rejected quantity', example: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  rejected_quantity?: number;

  @ApiProperty({ description: 'Warehouse receiving the item', format: 'uuid' })
  @IsUUID()
  warehouse_id: string;

  @ApiPropertyOptional({ description: 'Batch number' })
  @IsString()
  @IsOptional()
  batch_number?: string;

  @ApiPropertyOptional({ description: 'Line notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreatePurchaseReceiptDto {
  @ApiPropertyOptional({ description: 'Receipt number (auto-generated if omitted)' })
  @IsString()
  @IsOptional()
  receipt_number?: string;

  @ApiPropertyOptional({ description: 'Receipt date', example: '2026-04-29' })
  @IsDateString()
  @IsOptional()
  receipt_date?: string;

  @ApiProperty({ description: 'Purchase order ID', format: 'uuid' })
  @IsUUID()
  purchase_order_id: string;

  @ApiPropertyOptional({ description: 'Receipt notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [CreatePurchaseReceiptItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseReceiptItemDto)
  items: CreatePurchaseReceiptItemDto[];
}
