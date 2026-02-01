import { IsString, IsDateString, IsArray, IsOptional, IsNumber, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class UpdateQuoteItemDto {
  @ApiProperty({ description: 'Item ID (for existing items)', required: false })
  @IsUUID()
  @IsOptional()
  id?: string;

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

  @ApiProperty({ description: 'Product variant ID (e.g., 1L, 5L, 10kg)', required: false })
  @IsUUID()
  @IsOptional()
  variant_id?: string;

  @ApiProperty({ description: 'Account ID', required: false })
  @IsUUID()
  @IsOptional()
  account_id?: string;

  @ApiProperty({ description: 'Tax ID', required: false })
  @IsUUID()
  @IsOptional()
  tax_id?: string;
}

export class UpdateQuoteDto {
  @ApiProperty({ description: 'Quote date', example: '2024-01-15', required: false })
  @IsDateString()
  @IsOptional()
  quote_date?: string;

  @ApiProperty({ description: 'Valid until date', example: '2024-02-15', required: false })
  @IsDateString()
  @IsOptional()
  valid_until?: string;

  @ApiProperty({ description: 'Customer ID', required: false })
  @IsUUID()
  @IsOptional()
  customer_id?: string;

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

  @ApiProperty({ description: 'Quote items', type: [UpdateQuoteItemDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateQuoteItemDto)
  @IsOptional()
  items?: UpdateQuoteItemDto[];
}
