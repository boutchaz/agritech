import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateOpeningStockDto {
  @ApiProperty({ description: 'Item ID' })
  @IsNotEmpty()
  @IsUUID()
  item_id: string;

  @ApiProperty({ description: 'Warehouse ID' })
  @IsNotEmpty()
  @IsUUID()
  warehouse_id: string;

  @ApiProperty({ description: 'Opening quantity' })
  @IsNotEmpty()
  @IsNumber()
  quantity: number;

  @ApiProperty({ description: 'Unit of measure' })
  @IsNotEmpty()
  @IsString()
  unit: string;

  @ApiProperty({ description: 'Cost per unit' })
  @IsNotEmpty()
  @IsNumber()
  cost_per_unit: number;

  @ApiProperty({ description: 'Total value' })
  @IsNotEmpty()
  @IsNumber()
  total_value: number;

  @ApiProperty({ description: 'Opening date (YYYY-MM-DD)' })
  @IsNotEmpty()
  @IsDateString()
  opening_date: string;

  @ApiPropertyOptional({ description: 'Batch number' })
  @IsOptional()
  @IsString()
  batch_number?: string;

  @ApiPropertyOptional({ description: 'Serial number' })
  @IsOptional()
  @IsString()
  serial_number?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
