import { IsString, IsNumber, IsEnum, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTaxDto {
  @ApiProperty({ description: 'Tax name', example: 'VAT' })
  @IsString()
  tax_name: string;

  @ApiProperty({ description: 'Tax rate in percentage', example: 20 })
  @IsNumber()
  @Min(0)
  @Max(100)
  tax_rate: number;

  @ApiProperty({
    description: 'Tax type',
    enum: ['sales', 'purchase', 'both'],
    example: 'sales'
  })
  @IsEnum(['sales', 'purchase', 'both'])
  tax_type: 'sales' | 'purchase' | 'both';

  @ApiProperty({ description: 'Whether the tax is active', example: true, required: false })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiProperty({ description: 'Tax description', example: 'Standard VAT rate', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  // These will be set by the controller
  organization_id?: string;
  created_by?: string;
}
