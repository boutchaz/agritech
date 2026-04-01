import { IsString, IsNumber, IsOptional, IsArray, Min, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateListingDto {
  @ApiProperty({ description: 'Listing title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Listing description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'Short description' })
  @IsString()
  @IsOptional()
  short_description?: string;

  @ApiProperty({ description: 'Price' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Unit (kg, piece, etc.)' })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiPropertyOptional({ description: 'Product category ID' })
  @IsString()
  @IsOptional()
  product_category_id?: string;

  @ApiPropertyOptional({ description: 'Image URLs', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({ description: 'Quantity available' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  quantity_available?: number;

  @ApiPropertyOptional({ description: 'SKU' })
  @IsString()
  @IsOptional()
  sku?: string;
}

export class UpdateListingDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  short_description?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  product_category_id?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  quantity_available?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sku?: string;
}
