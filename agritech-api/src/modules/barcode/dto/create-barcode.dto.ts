import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export enum BarcodeType {
  AUTO = 'AUTO',
  EAN = 'EAN',
  EAN_8 = 'EAN-8',
  EAN_13 = 'EAN-13',
  UPC = 'UPC',
  UPC_A = 'UPC-A',
  CODE_39 = 'CODE-39',
  CODE_128 = 'CODE-128',
  GS1 = 'GS1',
  GTIN = 'GTIN',
  GTIN_14 = 'GTIN-14',
  ISBN = 'ISBN',
  ISBN_10 = 'ISBN-10',
  ISBN_13 = 'ISBN-13',
  ISSN = 'ISSN',
  JAN = 'JAN',
  PZN = 'PZN',
  QR = 'QR',
}

export class CreateBarcodeDto {
  @ApiPropertyOptional({ description: 'Item UUID (use item_id or variant_id)' })
  @IsOptional()
  @IsUUID()
  item_id?: string;

  @ApiPropertyOptional({ description: 'Product variant UUID (use item_id or variant_id)' })
  @IsOptional()
  @IsUUID()
  variant_id?: string;

  @ApiProperty({ description: 'Barcode value', minLength: 1 })
  @IsString()
  @MinLength(1)
  barcode: string;

  @ApiPropertyOptional({ description: 'Barcode type', enum: BarcodeType })
  @IsOptional()
  @IsEnum(BarcodeType)
  barcode_type?: BarcodeType;

  @ApiPropertyOptional({ description: 'Work unit UUID' })
  @IsOptional()
  @IsUUID()
  unit_id?: string;

  @ApiPropertyOptional({ description: 'Whether this barcode is primary', default: false })
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;
}
