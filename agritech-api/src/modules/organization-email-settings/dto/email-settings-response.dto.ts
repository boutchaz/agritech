import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EmailSettingsResponseDto {
  @ApiProperty()
  configured!: boolean;

  @ApiProperty()
  enabled!: boolean;

  @ApiPropertyOptional()
  host?: string;

  @ApiPropertyOptional()
  port?: number;

  @ApiPropertyOptional()
  secure?: boolean;

  @ApiPropertyOptional()
  username?: string;

  @ApiPropertyOptional({ description: 'Masked password for display only' })
  masked_password?: string;

  @ApiPropertyOptional()
  from_email?: string;

  @ApiPropertyOptional()
  from_name?: string;

  @ApiPropertyOptional()
  reply_to?: string;

  @ApiPropertyOptional()
  last_tested_at?: string;

  @ApiPropertyOptional({ enum: ['success', 'failed'] })
  last_test_status?: 'success' | 'failed';

  @ApiPropertyOptional()
  last_test_error?: string;

  @ApiPropertyOptional()
  updated_at?: string;
}
