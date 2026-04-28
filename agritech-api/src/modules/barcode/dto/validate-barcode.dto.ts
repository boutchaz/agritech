import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { BarcodeType } from './create-barcode.dto';

export class ValidateBarcodeDto {
  @ApiProperty({ description: 'Barcode value', minLength: 1 })
  @IsString()
  @MinLength(1)
  barcode: string;

  @ApiPropertyOptional({ description: 'Barcode type', enum: BarcodeType })
  @IsOptional()
  @IsEnum(BarcodeType)
  barcode_type?: BarcodeType;
}
