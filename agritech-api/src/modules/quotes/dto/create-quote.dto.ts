import { IsString, IsDateString, IsArray, IsOptional, IsNumber, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class QuoteItemDto {
  @ApiProperty({ description: 'Line number', example: 1 })
  @IsNumber()
  line_number: number;

  @ApiProperty({ description: 'Item name', example: 'Product A' })
  @IsString()
  item_name: string;

  @ApiProperty({ description: 'Item description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Quantity', example: 10 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ description: 'Unit of measure', example: 'kg', required: false })
  @IsString()
  @IsOptional()
  unit_of_measure?: string;

  @ApiProperty({ description: 'Unit price', example: 100.50 })
  @IsNumber()
  unit_price: number;

  @ApiProperty({ description: 'Discount percentage', example: 5, required: false })
  @IsNumber()
  @IsOptional()
  discount_percent?: number;

  @ApiProperty({ description: 'Tax rate', example: 20, required: false })
  @IsNumber()
  @IsOptional()
  tax_rate?: number;

  @ApiProperty({ description: 'Item ID reference', required: false })
  @IsUUID()
  @IsOptional()
  item_id?: string;

  @ApiProperty({ description: 'Account ID', required: false })
  @IsUUID()
  @IsOptional()
  account_id?: string;

  @ApiProperty({ description: 'Tax ID', required: false })
  @IsUUID()
  @IsOptional()
  tax_id?: string;
}

export class CreateQuoteDto {
  @ApiProperty({ description: 'Quote date', example: '2024-01-15' })
  @IsDateString()
  quote_date: string;

  @ApiProperty({ description: 'Valid until date', example: '2024-02-15' })
  @IsDateString()
  valid_until: string;

  @ApiProperty({ description: 'Customer ID' })
  @IsUUID()
  customer_id: string;

  @ApiProperty({ description: 'Payment terms', required: false })
  @IsString()
  @IsOptional()
  payment_terms?: string;

  @ApiProperty({ description: 'Delivery terms', required: false })
  @IsString()
  @IsOptional()
  delivery_terms?: string;

  @ApiProperty({ description: 'Terms and conditions', required: false })
  @IsString()
  @IsOptional()
  terms_and_conditions?: string;

  @ApiProperty({ description: 'Notes', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'Reference number', required: false })
  @IsString()
  @IsOptional()
  reference_number?: string;

  @ApiProperty({ description: 'Quote items', type: [QuoteItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items: QuoteItemDto[];

  // These will be set by the controller/service
  organization_id?: string;
  created_by?: string;
}
