import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PolarBillingInterval {
  MONTH = 'month',
  YEAR = 'year',
}

export class CreatePolarProductDto {
  @ApiProperty({ description: 'Product name shown in Polar', example: 'AgroGina Standard - Annual' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Product description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Price amount in centimes (MAD)', example: 1710000 })
  @IsNumber()
  @Min(0)
  priceAmount: number;

  @ApiProperty({ description: 'Currency code', example: 'usd', default: 'usd' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ description: 'Billing interval', enum: PolarBillingInterval, example: 'year' })
  @IsEnum(PolarBillingInterval)
  recurringInterval: PolarBillingInterval;

  @ApiPropertyOptional({ description: 'Metadata key-value pairs for the product' })
  @IsOptional()
  metadata?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Whether this product is highlighted in Polar' })
  @IsOptional()
  isHighlighted?: boolean;

  @ApiPropertyOptional({ description: 'Selected ERP module IDs', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  selectedModules?: string[];

  @ApiPropertyOptional({ description: 'Contracted hectares for this product config', example: 200 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  contractedHectares?: number;

  @ApiPropertyOptional({ description: 'Discount percent applied', example: 10 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPercent?: number;
}
