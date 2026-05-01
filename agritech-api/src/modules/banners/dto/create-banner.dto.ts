import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsDateString,
  IsUrl,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BannerSeverity, BannerAudience } from './banner-severity.enum';

export class CreateBannerDto {
  @ApiPropertyOptional({ description: 'Target organization ID (null = global banner for all orgs)' })
  @IsOptional()
  @IsUUID()
  organization_id?: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiPropertyOptional({ enum: BannerSeverity, default: 'info' })
  @IsOptional()
  @IsEnum(BannerSeverity)
  severity?: BannerSeverity;

  @ApiPropertyOptional({ enum: BannerAudience, default: 'all' })
  @IsOptional()
  @IsEnum(BannerAudience)
  audience?: BannerAudience;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  dismissible?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cta_label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'cta_url must be a valid URL' })
  cta_url?: string;

  @ApiPropertyOptional({ default: 0, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  start_at?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  end_at?: string;
}
