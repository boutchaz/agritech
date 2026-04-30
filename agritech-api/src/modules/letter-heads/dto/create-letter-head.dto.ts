import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsBoolean, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLetterHeadDto {
  @ApiProperty({ description: 'Letter head name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Header content (HTML or text)' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Footer content' })
  @IsOptional()
  @IsString()
  footer_content?: string;

  @ApiPropertyOptional({ description: 'Logo URL' })
  @IsOptional()
  @IsString()
  logo_url?: string;

  @ApiPropertyOptional({ description: 'Logo position', enum: ['left', 'center', 'right'] })
  @IsOptional()
  @IsEnum(['left', 'center', 'right'])
  logo_position?: string;

  @ApiPropertyOptional({ description: 'Logo width in mm' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(10)
  @Max(300)
  logo_width?: number;

  @ApiPropertyOptional({ description: 'Logo height in mm' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(10)
  @Max(300)
  logo_height?: number;

  @ApiPropertyOptional({ description: 'Company name' })
  @IsOptional()
  @IsString()
  company_name?: string;

  @ApiPropertyOptional({ description: 'Company info (address, phone, email)' })
  @IsOptional()
  @IsString()
  company_info?: string;

  @ApiPropertyOptional({ description: 'Custom text to display' })
  @IsOptional()
  @IsString()
  custom_text?: string;

  @ApiPropertyOptional({ description: 'Font family' })
  @IsOptional()
  @IsString()
  font_family?: string;

  @ApiPropertyOptional({ description: 'Font size' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(6)
  @Max(36)
  font_size?: number;

  @ApiPropertyOptional({ description: 'Text color (hex)' })
  @IsOptional()
  @IsString()
  text_color?: string;

  @ApiPropertyOptional({ description: 'Accent color (hex)' })
  @IsOptional()
  @IsString()
  accent_color?: string;

  @ApiPropertyOptional({ description: 'Background color (hex)' })
  @IsOptional()
  @IsString()
  background_color?: string;

  @ApiPropertyOptional({ description: 'Disable default header/footer' })
  @IsOptional()
  @IsBoolean()
  disable_default?: boolean;

  @ApiPropertyOptional({ description: 'Set as default letter head' })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @ApiPropertyOptional({ description: 'Letter head is active' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
