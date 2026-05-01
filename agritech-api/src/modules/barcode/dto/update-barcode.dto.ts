import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { CreateBarcodeDto, BarcodeType } from './create-barcode.dto';

export class UpdateBarcodeDto extends PartialType(CreateBarcodeDto) {
  @ApiPropertyOptional({ description: 'Barcode value', minLength: 1 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  barcode?: string;

  @ApiPropertyOptional({ description: 'Barcode type', enum: BarcodeType })
  @IsOptional()
  @IsEnum(BarcodeType)
  barcode_type?: BarcodeType;

  @ApiPropertyOptional({ description: 'Work unit UUID', nullable: true })
  @IsOptional()
  @IsUUID()
  unit_id?: string | null;

  @ApiPropertyOptional({ description: 'Whether this barcode is primary' })
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;

  @ApiPropertyOptional({ description: 'Whether this barcode is active' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
