import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum, IsArray } from 'class-validator';
import { EmailTemplateCategory } from './create-email-template.dto';

export class UpdateEmailTemplateDto {
  @ApiPropertyOptional({ description: 'Template name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Template type identifier' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Template category',
    enum: EmailTemplateCategory,
  })
  @IsOptional()
  @IsEnum(EmailTemplateCategory)
  category?: EmailTemplateCategory;

  @ApiPropertyOptional({ description: 'Email subject line' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ description: 'HTML email body' })
  @IsOptional()
  @IsString()
  html_body?: string;

  @ApiPropertyOptional({ description: 'Plain text email body fallback' })
  @IsOptional()
  @IsString()
  text_body?: string;

  @ApiPropertyOptional({ description: 'List of template variable names' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiPropertyOptional({ description: 'Template is active' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
