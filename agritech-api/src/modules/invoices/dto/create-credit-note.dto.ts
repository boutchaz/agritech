import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreditNoteLineDto {
  @ApiProperty({ description: 'ID of the invoice_items row from the original invoice being credited' })
  @IsUUID()
  original_item_id: string;

  @ApiProperty({ description: 'Quantity to credit (must be > 0 and <= original line quantity)' })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiPropertyOptional({ description: 'Override the per-unit refund amount (defaults to original unit_price)' })
  @IsOptional()
  @IsNumber()
  unit_price?: number;
}

export class CreateCreditNoteDto {
  @ApiPropertyOptional({
    description: 'Lines to credit. If omitted, the credit note credits the full original invoice.',
    type: [CreditNoteLineDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreditNoteLineDto)
  lines?: CreditNoteLineDto[];

  @ApiProperty({
    description: 'Free-text reason for the credit (return, damage, weight dispute, price adjustment, other)',
    example: 'Customer rejected 2 caisses for quality',
  })
  @IsString()
  credit_reason: string;

  @ApiPropertyOptional({
    description: 'When true (default), credit notes for stock items also restore stock to the original warehouse',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  restore_stock?: boolean;

  @ApiPropertyOptional({
    description: 'ISO date for the credit note. Defaults to today.',
  })
  @IsOptional()
  @IsString()
  invoice_date?: string;

  @ApiPropertyOptional({
    description: 'Free-text notes shown on the credit note document',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
