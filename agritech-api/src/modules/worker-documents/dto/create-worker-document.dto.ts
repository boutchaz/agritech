import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export const DOCUMENT_TYPES = [
  'cin', 'passport', 'work_permit', 'contract', 'cnss_card', 'medical_certificate',
  'driving_license', 'pesticide_certification', 'training_certificate',
  'bank_details', 'tax_document', 'photo', 'other',
] as const;

export class CreateWorkerDocumentDto {
  @ApiProperty() @IsUUID() worker_id!: string;

  @ApiProperty({ enum: DOCUMENT_TYPES })
  @IsIn(DOCUMENT_TYPES as unknown as string[])
  document_type!: typeof DOCUMENT_TYPES[number];

  @ApiProperty() @IsString() document_name!: string;
  @ApiProperty() @IsString() file_url!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) file_size?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() mime_type?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiry_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_verified?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateWorkerDocumentDto extends PartialType(CreateWorkerDocumentDto) {}
