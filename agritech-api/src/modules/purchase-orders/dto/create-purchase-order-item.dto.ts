import { IsString, IsNumber, IsOptional, IsUUID, Min, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePurchaseOrderItemDto {
  @ApiProperty({ description: 'Line number for ordering items', example: 1 })
  @IsInt()
  @Min(1)
  line_number: number;

  @ApiProperty({ description: 'Item name', example: 'Fertilizer NPK 20-20-20' })
  @IsString()
  item_name: string;

  @ApiPropertyOptional({ description: 'Item description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Quantity', example: 500 })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiPropertyOptional({ description: 'Unit of measure', example: 'kg', default: 'unit' })
  @IsString()
  @IsOptional()
  unit_of_measure?: string;

  @ApiProperty({ description: 'Unit price', example: 12.50 })
  @IsNumber()
  @Min(0)
  unit_price: number;

  @ApiPropertyOptional({ description: 'Discount percentage', example: 5 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  discount_percent?: number;

  @ApiPropertyOptional({ description: 'Tax rate', example: 20 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  tax_rate?: number;

  @ApiPropertyOptional({ description: 'Item ID if from catalog', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  item_id?: string;

  @ApiPropertyOptional({ description: 'Product variant ID (e.g., 1L, 5L, 10kg)', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  variant_id?: string;

  @ApiPropertyOptional({ description: 'Account ID for expense', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  account_id?: string;
}
