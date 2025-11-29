import {
  IsString,
  IsDateString,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
  IsBoolean,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateSalesOrderItemDto } from './create-sales-order-item.dto';

export class CreateSalesOrderDto {
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

  @ApiPropertyOptional({ description: 'Customer ID', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  customer_id?: string;

  @ApiProperty({ description: 'Customer name', example: 'ACME Corp' })
  @IsString()
  customer_name: string;

  @ApiPropertyOptional({ description: 'Customer contact information' })
  @IsString()
  @IsOptional()
  customer_contact?: string;

  @ApiPropertyOptional({ description: 'Customer billing address' })
  @IsString()
  @IsOptional()
  customer_address?: string;

  @ApiPropertyOptional({ description: 'Shipping address' })
  @IsString()
  @IsOptional()
  shipping_address?: string;

  @ApiPropertyOptional({ description: 'Tracking number for shipment' })
  @IsString()
  @IsOptional()
  tracking_number?: string;

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

  @ApiPropertyOptional({ description: 'Stock entry ID if stock issued', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  stock_entry_id?: string;

  @ApiPropertyOptional({ description: 'Whether stock has been issued', default: false })
  @IsBoolean()
  @IsOptional()
  stock_issued?: boolean;

  @ApiPropertyOptional({ description: 'Date when stock was issued' })
  @IsDateString()
  @IsOptional()
  stock_issued_date?: string;

  @ApiProperty({
    description: 'Order line items',
    type: [CreateSalesOrderItemDto],
    example: [{
      line_number: 1,
      item_name: 'Organic Olive Oil',
      quantity: 100,
      unit_price: 25.50,
      unit_of_measure: 'kg'
    }]
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one order item is required' })
  @ValidateNested({ each: true })
  @Type(() => CreateSalesOrderItemDto)
  items: CreateSalesOrderItemDto[];
}
