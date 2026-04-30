import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateDeliveryNoteItemDto } from './create-delivery-note-item.dto';

export class CreateDeliveryNoteDto {
  @ApiPropertyOptional({ description: 'Delivery note number (auto-generated if omitted)' })
  @IsString()
  @IsOptional()
  delivery_note_number?: string;

  @ApiPropertyOptional({ description: 'Delivery date', example: '2026-04-29' })
  @IsDateString()
  @IsOptional()
  delivery_date?: string;

  @ApiProperty({ description: 'Sales order ID', format: 'uuid' })
  @IsUUID()
  sales_order_id: string;

  @ApiPropertyOptional({ description: 'Customer ID', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  customer_id?: string;

  @ApiPropertyOptional({ description: 'Default warehouse ID', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  warehouse_id?: string;

  @ApiPropertyOptional({ description: 'Customer name' })
  @IsString()
  @IsOptional()
  customer_name?: string;

  @ApiPropertyOptional({ description: 'Customer address' })
  @IsString()
  @IsOptional()
  customer_address?: string;

  @ApiPropertyOptional({ description: 'Delivery note notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [CreateDeliveryNoteItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateDeliveryNoteItemDto)
  items: CreateDeliveryNoteItemDto[];
}
