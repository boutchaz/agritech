import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsBoolean, IsEnum, IsArray } from 'class-validator';

export enum EmailTemplateCategory {
  MARKETPLACE = 'marketplace',
  INVOICE = 'invoice',
  QUOTE = 'quote',
  ORDER = 'order',
  TASK = 'task',
  REMINDER = 'reminder',
  GENERAL = 'general',
}

export class CreateEmailTemplateDto {
  @ApiProperty({ description: 'Template name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Template type identifier (e.g. order_confirmed, quote_request)' })
  @IsNotEmpty()
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Template category',
    enum: EmailTemplateCategory,
  })
  @IsNotEmpty()
  @IsEnum(EmailTemplateCategory)
  category: EmailTemplateCategory;

  @ApiProperty({ description: 'Email subject line (supports {{variables}})' })
  @IsNotEmpty()
  @IsString()
  subject: string;

  @ApiProperty({ description: 'HTML email body (supports {{variables}})' })
  @IsNotEmpty()
  @IsString()
  html_body: string;

  @ApiPropertyOptional({ description: 'Plain text email body fallback' })
  @IsOptional()
  @IsString()
  text_body?: string;

  @ApiPropertyOptional({ description: 'List of template variable names', example: ['buyerName', 'orderId'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiPropertyOptional({ description: 'Template is active' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
