import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class RetrievalQueryDto {
  @ApiProperty({ description: 'Natural-language retrieval query' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ description: 'Optional crop type filter' })
  @IsOptional()
  @IsString()
  crop_type?: string;

  @ApiPropertyOptional({
    description: 'Optional region filters',
    type: [String],
    example: ['Meknes', 'Fes'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.includes(',') ? value.split(',').map((item) => item.trim()) : [value.trim()];
    }
    return value;
  })
  region?: string[];

  @ApiPropertyOptional({
    description: 'Maximum number of chunks to return',
    default: 8,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit: number = 8;
}
