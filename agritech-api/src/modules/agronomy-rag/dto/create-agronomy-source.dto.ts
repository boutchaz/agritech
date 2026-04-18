import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

const DOC_TYPES = ['fiche_technique', 'publication', 'bulletin', 'db_calibration', 'playbook'] as const;
const LANGUAGES = ['fr', 'ar', 'en'] as const;

function splitCsv({ value }: { value: unknown }): string[] | undefined {
  if (value == null) return undefined;
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value.split(',').map((v) => v.trim()).filter(Boolean);
  }
  return undefined;
}

export class CreateAgronomySourceDto {
  @ApiProperty({ description: 'Source title' })
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  author?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  publisher?: string;

  @ApiPropertyOptional({ enum: DOC_TYPES })
  @IsOptional()
  @IsIn([...DOC_TYPES])
  doc_type?: (typeof DOC_TYPES)[number];

  @ApiPropertyOptional({ enum: LANGUAGES })
  @IsOptional()
  @IsIn([...LANGUAGES])
  language?: (typeof LANGUAGES)[number];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(splitCsv)
  region?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(splitCsv)
  crop_type?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(splitCsv)
  season?: string[];

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  published_at?: string;

  @ApiPropertyOptional({
    description: 'Fully-qualified public URL to a PDF from an allowlisted domain',
  })
  @ValidateIf((o) => !o.storage_path)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  source_url?: string;

  @ApiPropertyOptional({
    description: 'Supabase Storage path, e.g. "agronomy-corpus/<uuid>/file.pdf"',
  })
  @ValidateIf((o) => !o.source_url)
  @IsString()
  storage_path?: string;

  @ApiPropertyOptional({ default: 600, minimum: 100, maximum: 4000 })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(4000)
  @Type(() => Number)
  chunk_size?: number;

  @ApiPropertyOptional({ default: 80, minimum: 0, maximum: 1000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  @Type(() => Number)
  chunk_overlap?: number;
}
