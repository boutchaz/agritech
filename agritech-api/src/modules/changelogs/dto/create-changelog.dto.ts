import { IsString, IsEnum, IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChangelogCategory } from './changelog-category.enum';

export class CreateChangelogDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ enum: ChangelogCategory, default: 'feature' })
  @IsOptional()
  @IsEnum(ChangelogCategory)
  category?: ChangelogCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  published_at?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_global?: boolean;
}
