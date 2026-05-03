import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSupportSettingsDto {
  @ApiPropertyOptional({ example: 'support@agrogina.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+212 600 000 000' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ example: '+212 600 000 001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  whatsapp?: string | null;

  @ApiPropertyOptional({ example: '123 rue Mohammed V, Casablanca' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string | null;

  @ApiPropertyOptional({ example: 'Lun-Ven 9h-18h' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  hours?: string | null;

  @ApiPropertyOptional({ example: 'contact@agrogina.com' })
  @IsOptional()
  @IsEmail()
  contact_email?: string;
}
