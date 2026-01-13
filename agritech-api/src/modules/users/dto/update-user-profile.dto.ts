import { IsOptional, IsString, IsEmail, IsIn, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserProfileDto {
  @ApiPropertyOptional({ description: 'User full name' })
  @IsOptional()
  @IsString()
  full_name?: string;

  @ApiPropertyOptional({ description: 'User first name' })
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional({ description: 'User last name' })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional({ description: 'User email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'User phone number (international format)',
    example: '+212 6 12 34 56 78'
  })
  @IsOptional()
  @Matches(/^[\+]?[0-9()\s\-.]{8,20}$/, {
    message: 'Phone number must be in valid international format (8-20 characters, can include +, digits, spaces, parentheses, hyphens, dots)'
  })
  phone?: string;

  @ApiPropertyOptional({ description: 'User avatar URL' })
  @IsOptional()
  @IsString()
  avatar_url?: string;

  @ApiPropertyOptional({ description: 'User timezone', example: 'Africa/Casablanca' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'User language', enum: ['fr', 'en', 'ar', 'es'] })
  @IsOptional()
  @IsIn(['fr', 'en', 'ar', 'es'])
  language?: string;
}
