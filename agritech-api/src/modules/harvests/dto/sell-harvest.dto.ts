import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsDateString, IsEnum, IsOptional, IsUUID, Min } from 'class-validator';

export enum PaymentTerms {
  CASH = 'cash',
  CREDIT = 'credit',
}

export class SellHarvestDto {
  @ApiProperty({
    description: 'Sale date',
    example: '2025-12-01',
  })
  @IsNotEmpty()
  @IsDateString()
  sale_date: string;

  @ApiProperty({
    description: 'Quantity sold (must be <= harvest quantity)',
    example: 500,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  quantity_sold: number;

  @ApiProperty({
    description: 'Actual price per unit',
    example: 12.5,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  price_per_unit: number;

  @ApiProperty({
    description: 'Customer ID (optional, from customers table)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  customer_id?: string;

  @ApiProperty({
    description: 'Customer name (required if customer_id not provided)',
    example: 'Marché Central',
    required: false,
  })
  @IsOptional()
  @IsString()
  customer_name?: string;

  @ApiProperty({
    description: 'Payment terms',
    enum: PaymentTerms,
    example: PaymentTerms.CASH,
  })
  @IsNotEmpty()
  @IsEnum(PaymentTerms)
  payment_terms: PaymentTerms;

  @ApiProperty({
    description: 'Invoice number (auto-generated if not provided)',
    example: 'INV-2025-001',
    required: false,
  })
  @IsOptional()
  @IsString()
  invoice_number?: string;

  @ApiProperty({
    description: 'Sale notes',
    example: 'Sold to local market, Grade A quality',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
