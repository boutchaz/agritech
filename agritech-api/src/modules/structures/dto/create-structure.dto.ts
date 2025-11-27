import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsDateString, IsIn, IsObject, IsBoolean } from 'class-validator';

export class CreateStructureDto {
  @ApiProperty({ description: 'Structure name' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Structure type',
    enum: ['stable', 'technical_room', 'basin', 'well']
  })
  @IsIn(['stable', 'technical_room', 'basin', 'well'])
  type: string;

  @ApiPropertyOptional({ description: 'Farm ID (if farm-specific structure)' })
  @IsOptional()
  @IsUUID()
  farm_id?: string;

  @ApiPropertyOptional({
    description: 'Geographic location',
    type: 'object',
    additionalProperties: true,
    example: { lat: 33.5731, lng: -7.5898 }
  })
  @IsOptional()
  @IsObject()
  location?: { lat: number; lng: number };

  @ApiProperty({ description: 'Installation date' })
  @IsDateString()
  installation_date: string;

  @ApiPropertyOptional({
    description: 'Structure condition',
    enum: ['excellent', 'good', 'fair', 'poor', 'needs_repair']
  })
  @IsOptional()
  @IsIn(['excellent', 'good', 'fair', 'poor', 'needs_repair'])
  condition?: string;

  @ApiPropertyOptional({ description: 'Usage description' })
  @IsOptional()
  @IsString()
  usage?: string;

  @ApiPropertyOptional({
    description: 'Structure-specific details (dimensions, equipment, etc.)',
    type: 'object',
    additionalProperties: true
  })
  @IsOptional()
  @IsObject()
  structure_details?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Active status', default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
