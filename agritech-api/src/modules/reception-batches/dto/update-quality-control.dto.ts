import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  Min,
  Max,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DefectDto } from './create-reception-batch.dto';

export class UpdateQualityControlDto {
  @ApiProperty({
    description: 'Quality grade',
    enum: ['A', 'B', 'C', 'Extra', 'First', 'Second', 'Third']
  })
  @IsEnum(['A', 'B', 'C', 'Extra', 'First', 'Second', 'Third'])
  quality_grade: string;

  @ApiProperty({ description: 'Quality score (1-10)' })
  @IsInt()
  @Min(1)
  @Max(10)
  quality_score: number;

  @ApiPropertyOptional({ description: 'Quality control notes' })
  @IsOptional()
  @IsString()
  quality_notes?: string;

  @ApiPropertyOptional({ description: 'Humidity percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  humidity_percentage?: number;

  @ApiPropertyOptional({
    description: 'Maturity level',
    enum: ['immature', 'optimal', 'overripe']
  })
  @IsOptional()
  @IsEnum(['immature', 'optimal', 'overripe'])
  maturity_level?: string;

  @ApiPropertyOptional({ description: 'Temperature in celsius' })
  @IsOptional()
  @IsNumber()
  temperature?: number;

  @ApiPropertyOptional({ description: 'Moisture content percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  moisture_content?: number;

  @ApiPropertyOptional({
    description: 'Array of defects',
    type: [DefectDto]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DefectDto)
  defects?: DefectDto[];

  @ApiPropertyOptional({
    description: 'Array of photo URLs',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiPropertyOptional({ description: 'Quality checker worker ID' })
  @IsOptional()
  @IsString()
  quality_checked_by?: string;
}
