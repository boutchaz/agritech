import {
  IsString,
  IsDateString,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsNumber,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreatePurchaseOrderItemDto } from './create-purchase-order-item.dto';

export class CreatePurchaseOrderDto {
  @ApiPropertyOptional({ description: 'Order number (auto-generated if not provided)' })
  @IsString()
  @IsOptional()
  order_number?: string;

  @ApiProperty({ description: 'Order date', example: '2024-01-15' })
  @IsDateString()
  order_date: string;

  @ApiPropertyOptional({ description: 'Expected delivery date', example: '2024-01-22' })
  @IsDateString()
  @IsOptional()
  expected_delivery_date?: string;

  @ApiPropertyOptional({ description: 'Supplier ID', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  supplier_id?: string;

  @ApiPropertyOptional({ description: 'Supplier name', example: 'AgriSupply Co.' })
  @IsString()
  @IsOptional()
  supplier_name?: string;

  @ApiPropertyOptional({ description: 'Supplier contact information' })
  @IsString()
  @IsOptional()
  supplier_contact?: string;

  @ApiPropertyOptional({ description: 'Order status', example: 'draft' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Terms and conditions' })
  @IsString()
  @IsOptional()
  terms_and_conditions?: string;

  @ApiPropertyOptional({ description: 'Stock entry ID if stock received', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  stock_entry_id?: string;

  @ApiPropertyOptional({ description: 'Whether stock has been received', default: false })
  @IsBoolean()
  @IsOptional()
  stock_received?: boolean;

  @ApiPropertyOptional({ description: 'Date when stock was received' })
  @IsDateString()
  @IsOptional()
  stock_received_date?: string;

  @ApiPropertyOptional({ description: 'Default tax rate applied when a line tax_rate is not provided (hybrid model)', example: 20 })
  @IsNumber()
  @IsOptional()
  default_tax_rate?: number;

  @ApiProperty({
    description: 'Order line items',
    type: [CreatePurchaseOrderItemDto],
    example: [{
      line_number: 1,
      item_name: 'Fertilizer NPK 20-20-20',
      quantity: 500,
      unit_price: 12.50,
      unit_of_measure: 'kg'
    }]
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one order item is required' })
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items: CreatePurchaseOrderItemDto[];
}
