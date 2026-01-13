import { IsOptional, IsString, IsBoolean, IsEmail, Matches } from 'class-validator';
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
    description: 'Organization email address',
    example: 'contact@example.com'
  })
  @IsOptional()
  @IsString()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email?: string;
}
