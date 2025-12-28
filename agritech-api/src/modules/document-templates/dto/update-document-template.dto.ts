import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { DocumentType } from './create-document-template.dto';

export class UpdateDocumentTemplateDto {
  @ApiPropertyOptional({ description: 'Template name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ 
    description: 'Document type',
    enum: DocumentType
  })
  @IsOptional()
  @IsEnum(DocumentType)
  document_type?: DocumentType;

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

  @ApiPropertyOptional({ description: 'Set as default template for this document type' })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @ApiPropertyOptional({ description: 'Template is active' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
