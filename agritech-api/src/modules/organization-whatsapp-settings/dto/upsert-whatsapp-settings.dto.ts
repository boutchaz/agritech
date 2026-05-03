import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertWhatsAppSettingsDto {
  @ApiProperty({
    example: '123456789012345',
    description: 'Meta Cloud API phone_number_id (from WhatsApp Business platform)',
  })
  @IsString()
  phone_number_id!: string;

  @ApiPropertyOptional({
    description:
      'Permanent system-user access token. Send only when changing it. Omit to keep existing.',
  })
  @IsOptional()
  @IsString()
  access_token?: string;

  @ApiPropertyOptional({ example: '987654321098765' })
  @IsOptional()
  @IsString()
  business_account_id?: string;

  @ApiPropertyOptional({ example: '+212 6 12 34 56 78' })
  @IsOptional()
  @IsString()
  display_phone_number?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
