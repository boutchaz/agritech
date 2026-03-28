import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsUUID, IsNotEmpty } from 'class-validator';

export enum EvidenceType {
  DOCUMENT = 'document',
  PHOTO = 'photo',
  VIDEO = 'video',
  INSPECTION_REPORT = 'inspection_report',
  TEST_RESULT = 'test_result',
  RECORD = 'record',
  CERTIFICATE = 'certificate',
  OTHER = 'other',
}

export class CreateEvidenceDto {
  @ApiProperty({ description: 'Compliance check ID this evidence supports' })
  @IsUUID()
  compliance_check_id: string;

  @ApiProperty({
    enum: EvidenceType,
    description: 'Type of evidence',
  })
  @IsEnum(EvidenceType)
  evidence_type: EvidenceType;

  @ApiProperty({ description: 'URL to the evidence file in cloud storage' })
  @IsString()
  @IsNotEmpty()
  file_url: string;

  @ApiPropertyOptional({ description: 'Description of what the evidence shows' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'User ID who uploaded the evidence (set server-side from JWT)' })
  @IsOptional()
  @IsUUID()
  uploaded_by?: string;
}
