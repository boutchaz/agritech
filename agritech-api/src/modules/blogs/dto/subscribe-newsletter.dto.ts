import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubscribeNewsletterDto {
  @ApiProperty({ description: 'Email address', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Locale (fr, ar, en)', default: 'fr' })
  @IsOptional()
  @IsString()
  locale?: string = 'fr';

  @ApiPropertyOptional({ description: 'Source blog post slug' })
  @IsOptional()
  @IsString()
  source_slug?: string;
}
