import {
  IsString,
  IsNumber,
  IsEnum,
  IsUUID,
  IsOptional,
  IsArray,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InvoiceItemDto {
  @ApiProperty({ description: 'Item name', example: 'Tomato Seeds' })
  @IsString()
  item_name: string;

  @ApiProperty({ description: 'Item description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Quantity', example: 100 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ description: 'Unit price', example: 25.5 })
  @IsNumber()
  unit_price: number;

  @ApiProperty({ description: 'Line amount before tax', example: 2550 })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Tax ID', required: false })
  @IsUUID()
  @IsOptional()
  tax_id?: string;

  @ApiProperty({ description: 'Tax rate percentage', example: 20, required: false })
  @IsNumber()
  @IsOptional()
  tax_rate?: number;

  @ApiProperty({ description: 'Tax amount', example: 510 })
  @IsNumber()
  tax_amount: number;

  @ApiProperty({ description: 'Line total with tax', example: 3060 })
  @IsNumber()
  line_total: number;

  @ApiProperty({ description: 'Income account ID', required: false })
  @IsUUID()
  @IsOptional()
  income_account_id?: string;

  @ApiProperty({ description: 'Expense account ID', required: false })
  @IsUUID()
  @IsOptional()
  expense_account_id?: string;

  @ApiProperty({ description: 'Item ID reference', required: false })
  @IsUUID()
  @IsOptional()
  item_id?: string;

  @ApiProperty({ description: 'Product variant ID (e.g., 1L, 5L, 10kg)', required: false })
  @IsUUID()
  @IsOptional()
  variant_id?: string;
}

export class CreateInvoiceDto {
  // These will be set by the controller
  organization_id?: string;
  created_by?: string;

  @ApiProperty({ description: 'Invoice number', required: false, example: 'INV-2024-001' })
  @IsString()
  @IsOptional()
  invoice_number?: string;

  @ApiProperty({ description: 'Invoice type', enum: ['sales', 'purchase'], example: 'sales' })
  @IsEnum(['sales', 'purchase'])
  invoice_type: 'sales' | 'purchase';

  @ApiProperty({ description: 'Party type', enum: ['Customer', 'Supplier'], example: 'Customer' })
  @IsEnum(['Customer', 'Supplier'])
  party_type: 'Customer' | 'Supplier';

  @ApiProperty({ description: 'Party (customer/supplier) ID', required: false })
  @IsUUID()
  @IsOptional()
  party_id?: string;

  @ApiProperty({ description: 'Party (customer/supplier) name', example: 'Farm Supplies Inc' })
  @IsString()
  party_name: string;

  @ApiProperty({ description: 'Invoice date', example: '2024-01-15' })
  @IsDateString()
  invoice_date: string;

  @ApiProperty({ description: 'Due date', example: '2024-02-15' })
  @IsDateString()
  due_date: string;

  @ApiProperty({ description: 'Subtotal before tax', example: 10000 })
  @IsNumber()
  subtotal: number;

  @ApiProperty({ description: 'Total tax amount', example: 2000 })
  @IsNumber()
  tax_total: number;

  @ApiProperty({ description: 'Grand total', example: 12000 })
  @IsNumber()
  grand_total: number;

  @ApiProperty({ description: 'Outstanding amount', example: 12000 })
  @IsNumber()
  outstanding_amount: number;

  @ApiPropertyOptional({ description: 'Default tax rate applied when a line tax_rate is not provided (hybrid model)', example: 20 })
  @IsNumber()
  @IsOptional()
  default_tax_rate?: number;

  @ApiProperty({ description: 'Currency code', example: 'MAD', required: false })
  @IsString()
  @IsOptional()
  currency_code?: string;

  @ApiProperty({ description: 'Exchange rate', example: 1.0, required: false })
  @IsNumber()
  @IsOptional()
  exchange_rate?: number;

  @ApiProperty({ description: 'Payment terms', required: false })
  @IsString()
  @IsOptional()
  payment_terms?: string;

  @ApiProperty({ description: 'Notes', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'Related sales order ID', required: false })
  @IsUUID()
  @IsOptional()
  sales_order_id?: string;

  @ApiProperty({ description: 'Related purchase order ID', required: false })
  @IsUUID()
  @IsOptional()
  purchase_order_id?: string;

  @ApiProperty({ description: 'Related quote ID', required: false })
  @IsUUID()
  @IsOptional()
  quote_id?: string;

  @ApiProperty({ description: 'Invoice items', type: [InvoiceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
}
