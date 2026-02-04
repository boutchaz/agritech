import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsDateString, IsUUID, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductApplicationDto {
  @ApiProperty({ description: 'Product ID from inventory' })
  @IsUUID()
  product_id: string;

  @ApiProperty({ description: 'Application date' })
  @IsDateString()
  application_date: string;

  @ApiProperty({ description: 'Quantity used' })
  @IsNumber()
  quantity_used: number;

  @ApiProperty({ description: 'Area treated in hectares' })
  @IsNumber()
  area_treated: number;

  @ApiPropertyOptional({ description: 'Application notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Parcel ID' })
  @IsUUID()
  @IsOptional()
  parcel_id?: string;

  @ApiPropertyOptional({ description: 'Optional: Task ID if this application was planned' })
  @IsUUID()
  @IsOptional()
  task_id?: string;

  @ApiPropertyOptional({ description: 'Cost of application' })
  @IsNumber()
  @IsOptional()
  cost?: number;

  @ApiProperty({ description: 'Farm ID' })
  @IsUUID()
  farm_id: string;

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Array of image URLs' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];
}
