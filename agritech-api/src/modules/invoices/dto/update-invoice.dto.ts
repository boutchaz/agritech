import {
  IsString,
  IsNumber,
  IsUUID,
  IsOptional,
  IsArray,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateInvoiceItemDto {
  @ApiProperty({ description: 'Item ID (for existing items)', required: false })
  @IsUUID()
  @IsOptional()
  id?: string;

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
}

export class UpdateInvoiceDto {
  @ApiProperty({ description: 'Party (customer/supplier) ID', required: false })
  @IsUUID()
  @IsOptional()
  party_id?: string;

  @ApiProperty({ description: 'Party (customer/supplier) name', required: false })
  @IsString()
  @IsOptional()
  party_name?: string;

  @ApiProperty({ description: 'Invoice date', required: false })
  @IsDateString()
  @IsOptional()
  invoice_date?: string;

  @ApiProperty({ description: 'Due date', required: false })
  @IsDateString()
  @IsOptional()
  due_date?: string;

  @ApiProperty({ description: 'Payment terms', required: false })
  @IsString()
  @IsOptional()
  payment_terms?: string;

  @ApiProperty({ description: 'Notes/Remarks', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'Invoice items', type: [UpdateInvoiceItemDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateInvoiceItemDto)
  @IsOptional()
  items?: UpdateInvoiceItemDto[];
}
