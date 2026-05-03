import { IsOptional, IsString, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TestWhatsAppDto {
  @ApiProperty({
    example: '+212612345678',
    description: 'Recipient phone in E.164 format (with +country code)',
  })
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, {
    message: 'to must be E.164 format (e.g. +212612345678)',
  })
  to!: string;

  @ApiPropertyOptional({
    example: 'hello_world',
    description: 'Approved Meta template name. Defaults to hello_world.',
  })
  @IsOptional()
  @IsString()
  template?: string;

  @ApiPropertyOptional({ example: 'en_US' })
  @IsOptional()
  @IsString()
  language?: string;
}
