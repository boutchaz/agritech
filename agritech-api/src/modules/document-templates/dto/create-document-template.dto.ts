import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsBoolean, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum DocumentType {
  INVOICE = 'invoice',
  QUOTE = 'quote',
  SALES_ORDER = 'sales_order',
  PURCHASE_ORDER = 'purchase_order',
  REPORT = 'report',
  GENERAL = 'general',
}

export class CreateDocumentTemplateDto {
  @ApiProperty({ description: 'Template name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Document type', enum: DocumentType })
  @IsNotEmpty()
  @IsEnum(DocumentType)
  document_type: DocumentType;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'HTML template content' })
  @IsOptional()
  @IsString()
  html_content?: string;

  @ApiPropertyOptional({ description: 'CSS styles' })
  @IsOptional()
  @IsString()
  css_styles?: string;

  @ApiPropertyOptional({ description: 'Header HTML content' })
  @IsOptional()
  @IsString()
  header_html?: string;

  @ApiPropertyOptional({ description: 'Footer HTML content' })
  @IsOptional()
  @IsString()
  footer_html?: string;

  @ApiPropertyOptional({ description: 'Set as default template' })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @ApiPropertyOptional({ description: 'Template is active' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  // Header configuration
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  header_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(200)
  header_height?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  header_logo_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['left', 'center', 'right'])
  header_logo_position?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(200)
  header_logo_width?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(200)
  header_logo_height?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  header_company_name?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  header_company_info?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  header_custom_text?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  header_background_color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  header_text_color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  header_border_bottom?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  header_border_color?: string;

  // Footer configuration
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  footer_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(200)
  footer_height?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  footer_text?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['left', 'center', 'right'])
  footer_position?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  footer_include_company_info?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  footer_custom_text?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  footer_background_color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  footer_text_color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  footer_border_top?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  footer_border_color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(6)
  @Max(24)
  footer_font_size?: number;

  // Page margins
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  page_margin_top?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  page_margin_bottom?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  page_margin_left?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  page_margin_right?: number;

  // Document styling
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accent_color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secondary_color?: string;

  // Typography
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  font_family?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(8)
  @Max(48)
  title_font_size?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(8)
  @Max(36)
  heading_font_size?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(6)
  @Max(24)
  body_font_size?: number;

  // Table styling
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  table_header_bg_color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  table_header_text_color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  table_row_alt_color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  table_border_color?: string;

  // Content display options
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  show_tax_id?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  show_terms?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  show_notes?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  show_payment_info?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  show_bank_details?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  show_qr_code?: boolean;

  // Custom sections
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  terms_content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payment_terms_content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bank_details_content?: string;

  // Watermark
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  watermark_enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  watermark_text?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  watermark_opacity?: number;
}
