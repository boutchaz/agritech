import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WhatsAppSettingsResponseDto {
  @ApiProperty()
  configured!: boolean;

  @ApiProperty()
  enabled!: boolean;

  @ApiPropertyOptional()
  phone_number_id?: string;

  @ApiPropertyOptional({ description: 'Masked access token for display only' })
  masked_access_token?: string;

  @ApiPropertyOptional()
  business_account_id?: string;

  @ApiPropertyOptional()
  display_phone_number?: string;

  @ApiPropertyOptional()
  last_tested_at?: string;

  @ApiPropertyOptional({ enum: ['success', 'failed'] })
  last_test_status?: 'success' | 'failed';

  @ApiPropertyOptional()
  last_test_error?: string;

  @ApiPropertyOptional()
  updated_at?: string;
}
