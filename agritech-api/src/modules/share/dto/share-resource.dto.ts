import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ShareChannel, ShareableResourceType } from '../types';

const RESOURCE_TYPES: ShareableResourceType[] = [
  'invoice',
  'quote',
  'sales_order',
  'purchase_order',
  'delivery',
  'payment',
];
const CHANNELS: ShareChannel[] = ['email', 'whatsapp'];

export class ShareResourceDto {
  @ApiProperty({ enum: RESOURCE_TYPES })
  @IsIn(RESOURCE_TYPES)
  resource_type!: ShareableResourceType;

  @ApiProperty()
  @IsUUID()
  resource_id!: string;

  @ApiProperty({ enum: CHANNELS })
  @IsIn(CHANNELS)
  channel!: ShareChannel;

  @ApiPropertyOptional({
    description:
      'Override recipient. Email for channel=email, E.164 phone for channel=whatsapp. If omitted, the party email/phone on the resource is used.',
  })
  @IsOptional()
  @IsString()
  recipient?: string;

  @ApiPropertyOptional({ description: 'Email-only. Overrides the default subject.' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({
    description:
      'Custom message body. For email = body text. For whatsapp text mode = message content.',
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({
    description:
      'WhatsApp only. Approved Meta template name. When provided, the message is sent as a template (works for cold contacts).',
  })
  @IsOptional()
  @IsString()
  whatsapp_template?: string;

  @ApiPropertyOptional({ example: 'fr', description: 'WhatsApp template language code' })
  @IsOptional()
  @IsString()
  whatsapp_language?: string;

  @ApiPropertyOptional({
    description:
      'WhatsApp template body parameters (positional). Required if the template has variables.',
    type: [String],
  })
  @IsOptional()
  whatsapp_template_params?: string[];

  @ApiPropertyOptional({
    description: 'Arbitrary metadata persisted on the share log row.',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      'Email-only. When true, attempt to attach the resource as PDF (when supported by the resolver).',
  })
  @IsOptional()
  @IsBoolean()
  attach_pdf?: boolean;
}
