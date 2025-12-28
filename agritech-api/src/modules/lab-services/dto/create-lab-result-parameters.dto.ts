import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsString, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class LabResultParameterDto {
  @ApiProperty({ description: 'Order ID this result belongs to' })
  @IsNotEmpty()
  @IsUUID()
  order_id: string;

  @ApiProperty({ description: 'Parameter name (e.g., pH, Nitrogen, Phosphorus)' })
  @IsNotEmpty()
  @IsString()
  parameter_name: string;

  @ApiPropertyOptional({ description: 'Measured value' })
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional({ description: 'Unit of measurement' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ description: 'Minimum reference value' })
  @IsOptional()
  @IsNumber()
  reference_min?: number;

  @ApiPropertyOptional({ description: 'Maximum reference value' })
  @IsOptional()
  @IsNumber()
  reference_max?: number;

  @ApiPropertyOptional({ description: 'Result interpretation (low, normal, high)' })
  @IsOptional()
  @IsString()
  interpretation?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateLabResultParametersDto {
  @ApiProperty({ type: [LabResultParameterDto], description: 'Array of result parameters' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabResultParameterDto)
  parameters: LabResultParameterDto[];
}
