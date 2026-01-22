import { IsOptional, IsString, IsBoolean, IsEmail, Matches, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrganizationDto {
  @ApiPropertyOptional({ description: 'Organization name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Organization description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Currency code', example: 'MAD' })
  @IsOptional()
  @IsString()
  currency_code?: string;

  @ApiPropertyOptional({ description: 'Timezone', example: 'Africa/Casablanca' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Organization active status' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  // Contact fields
  @ApiPropertyOptional({
    description: 'Organization email address',
    example: 'contact@example.com'
  })
  @IsOptional()
  @IsString()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Organization phone number (international format)',
    example: '+212 6 12 34 56 78'
  })
  @IsOptional()
  @IsString()
  @Matches(/^[\+]?[0-9()\s\-.]{8,20}$/, {
    message: 'Phone number must be in valid international format (8-20 characters, can include +, digits, spaces, parentheses, hyphens, dots)'
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Primary contact person name',
    example: 'John Doe'
  })
  @IsOptional()
  @IsString()
  contact_person?: string;

  @ApiPropertyOptional({
    description: 'Organization website URL',
    example: 'https://example.com'
  })
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Website must be a valid URL' })
  website?: string;

  // Address fields
  @ApiPropertyOptional({
    description: 'Street address',
    example: '123 Main Street'
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'City',
    example: 'Casablanca'
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'State/Province/Region',
    example: 'Casablanca-Settat'
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    description: 'Postal/ZIP code',
    example: '20250'
  })
  @IsOptional()
  @IsString()
  postal_code?: string;

  @ApiPropertyOptional({
    description: 'Country',
    example: 'Morocco'
  })
  @IsOptional()
  @IsString()
  country?: string;

  // Other fields
  @ApiPropertyOptional({
    description: 'Tax ID / Fiscal number',
    example: '12345678'
  })
  @IsOptional()
  @IsString()
  tax_id?: string;

  @ApiPropertyOptional({
    description: 'Organization logo URL',
    example: 'https://example.com/logo.png'
  })
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Logo URL must be a valid URL' })
  logo_url?: string;
}
