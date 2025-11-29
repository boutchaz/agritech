import { IsString, IsNumber, IsEnum, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTaxDto {
  @ApiProperty({ description: 'Tax name', example: 'VAT', required: false })
  @IsString()
  @IsOptional()
  tax_name?: string;

  @ApiProperty({ description: 'Tax rate in percentage', example: 20, required: false })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  tax_rate?: number;

  @ApiProperty({
    description: 'Tax type',
    enum: ['sales', 'purchase', 'both'],
    example: 'sales',
    required: false
  })
  @IsEnum(['sales', 'purchase', 'both'])
  @IsOptional()
  tax_type?: 'sales' | 'purchase' | 'both';

  @ApiProperty({ description: 'Whether the tax is active', example: true, required: false })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiProperty({ description: 'Tax description', example: 'Standard VAT rate', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
