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

export class UpdateDeliveryNoteItemDto {
  @ApiPropertyOptional({ description: 'Linked sales order item', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  sales_order_item_id?: string;

  @ApiPropertyOptional({ description: 'Inventory item ID', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  item_id?: string;

  @ApiPropertyOptional({ description: 'Delivery quantity', example: 10 })
  @IsNumber()
  @Min(0.001)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ description: 'Batch number' })
  @IsString()
  @IsOptional()
  batch_number?: string;

  @ApiPropertyOptional({ description: 'Warehouse issuing the item', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  warehouse_id?: string;

  @ApiPropertyOptional({ description: 'Line notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateDeliveryNoteDto {
  @ApiPropertyOptional({ description: 'Delivery note number' })
  @IsString()
  @IsOptional()
  delivery_note_number?: string;

  @ApiPropertyOptional({ description: 'Delivery date', example: '2026-04-29' })
  @IsDateString()
  @IsOptional()
  delivery_date?: string;

  @ApiPropertyOptional({ description: 'Sales order ID', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  sales_order_id?: string;

  @ApiPropertyOptional({ description: 'Customer ID', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  customer_id?: string;

  @ApiPropertyOptional({ description: 'Default warehouse ID', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  warehouse_id?: string;

  @ApiPropertyOptional({ description: 'Customer name' })
  @IsString()
  @IsOptional()
  customer_name?: string;

  @ApiPropertyOptional({ description: 'Customer address' })
  @IsString()
  @IsOptional()
  customer_address?: string;

  @ApiPropertyOptional({ description: 'Delivery note notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ type: [UpdateDeliveryNoteItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateDeliveryNoteItemDto)
  @IsOptional()
  items?: UpdateDeliveryNoteItemDto[];
}
