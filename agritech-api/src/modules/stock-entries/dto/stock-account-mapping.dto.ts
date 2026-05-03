import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsString, IsOptional } from 'class-validator';

export class CreateStockAccountMappingDto {
  @ApiProperty({ description: 'Entry type (e.g., opening_stock, material_receipt)' })
  @IsNotEmpty()
  @IsString()
  entry_type: string;

  @ApiProperty({ description: 'Debit account ID' })
  @IsNotEmpty()
  @IsUUID()
  debit_account_id: string;

  @ApiProperty({ description: 'Credit account ID' })
  @IsNotEmpty()
  @IsUUID()
  credit_account_id: string;

  @ApiPropertyOptional({ description: 'Optional item category for category-specific mapping' })
  @IsOptional()
  @IsString()
  item_category?: string;

  @ApiPropertyOptional({ description: 'Deprecated alias. Ignored by the API.' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateStockAccountMappingDto {
  @ApiPropertyOptional({ description: 'Entry type' })
  @IsOptional()
  @IsString()
  entry_type?: string;

  @ApiPropertyOptional({ description: 'Debit account ID' })
  @IsOptional()
  @IsUUID()
  debit_account_id?: string;

  @ApiPropertyOptional({ description: 'Credit account ID' })
  @IsOptional()
  @IsUUID()
  credit_account_id?: string;

  @ApiPropertyOptional({ description: 'Optional item category for category-specific mapping' })
  @IsOptional()
  @IsString()
  item_category?: string;

  @ApiPropertyOptional({ description: 'Deprecated alias. Ignored by the API.' })
  @IsOptional()
  @IsString()
  description?: string;
}
