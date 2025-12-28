import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';

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

  @ApiProperty({ 
    description: 'Document type',
    enum: DocumentType
  })
  @IsNotEmpty()
  @IsEnum(DocumentType)
  document_type: DocumentType;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'HTML template content' })
  @IsNotEmpty()
  @IsString()
  html_content: string;

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

  @ApiPropertyOptional({ description: 'Set as default template for this document type' })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @ApiPropertyOptional({ description: 'Template is active' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
