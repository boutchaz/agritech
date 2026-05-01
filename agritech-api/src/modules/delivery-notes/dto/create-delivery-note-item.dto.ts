import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateDeliveryNoteItemDto {
  @ApiPropertyOptional({ description: 'Linked sales order item', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  sales_order_item_id?: string;

  @ApiProperty({ description: 'Inventory item ID', format: 'uuid' })
  @IsUUID()
  item_id: string;

  @ApiProperty({ description: 'Delivery quantity', example: 10 })
  @IsNumber()
  @Min(0.001)
  quantity: number;

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
