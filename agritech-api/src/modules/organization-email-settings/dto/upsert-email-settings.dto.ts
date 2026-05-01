import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertEmailSettingsDto {
  @ApiProperty({ example: 'smtp.gmail.com' })
  @IsString()
  host!: string;

  @ApiProperty({ example: 587 })
  @IsInt()
  @Min(1)
  @Max(65535)
  port!: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  secure!: boolean;

  @ApiProperty({ example: 'invoices@yourdomain.com' })
  @IsString()
  username!: string;

  @ApiPropertyOptional({
    description:
      'SMTP password. Send only when changing it. Omit to keep the existing password.',
  })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ example: 'invoices@yourdomain.com' })
  @IsEmail()
  from_email!: string;

  @ApiPropertyOptional({ example: 'Acme Sarl' })
  @IsOptional()
  @IsString()
  from_name?: string;

  @ApiPropertyOptional({ example: 'billing@yourdomain.com' })
  @IsOptional()
  @IsEmail()
  reply_to?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
