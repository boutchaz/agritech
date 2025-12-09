import { IsNotEmpty, IsString, IsEnum, IsOptional, IsObject, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AnalysisType {
  SOIL = 'soil',
  PLANT = 'plant',
  WATER = 'water',
}

export class CreateAnalysisDto {
  @ApiProperty({ description: 'Parcel ID', example: 'uuid' })
  @IsNotEmpty()
  @IsString()
  parcel_id: string;

  @ApiProperty({ description: 'Type of analysis', enum: AnalysisType })
  @IsNotEmpty()
  @IsEnum(AnalysisType)
  analysis_type: AnalysisType;

  @ApiProperty({ description: 'Analysis date', example: '2024-01-15' })
  @IsNotEmpty()
  @IsDateString()
  analysis_date: string;

  @ApiPropertyOptional({ description: 'Laboratory name', example: 'AgriLab Solutions' })
  @IsOptional()
  @IsString()
  laboratory?: string;

  @ApiProperty({ description: 'Analysis data (JSON)', example: { ph_level: 6.5, organic_matter_percentage: 3.2 } })
  @IsNotEmpty()
  @IsObject()
  data: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional notes', example: 'Sample taken from north corner' })
  @IsOptional()
  @IsString()
  notes?: string;
}
