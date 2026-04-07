import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNotEmpty,
  IsObject,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum CertificationType {
  GLOBALGAP = 'GlobalGAP',
  HACCP = 'HACCP',
  ISO9001 = 'ISO9001',
  ISO14001 = 'ISO14001',
  ISO22000 = 'ISO22000',
  ORGANIC = 'Organic',
  FAIRTRADE = 'FairTrade',
  RAINFOREST = 'Rainforest',
  USDA_ORGANIC = 'USDA_Organic',
  MAROC_LABEL = 'Maroc_Label',
  BRC_FOOD_SAFETY = 'BRC_Food_Safety',
  IFS_FOOD = 'IFS_Food',
}

export enum CertificationStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  PENDING_RENEWAL = 'pending_renewal',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

export class DocumentDto {
  @ApiProperty({ description: 'Document URL' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty({ description: 'Document type' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ description: 'Upload timestamp' })
  @IsDateString()
  uploaded_at: string;
}

export class AuditScheduleDto {
  @ApiPropertyOptional({ description: 'Next audit date' })
  @IsOptional()
  @IsDateString()
  next_audit_date?: string;

  @ApiPropertyOptional({ description: 'Audit frequency (e.g., Annual, Biannual)' })
  @IsOptional()
  @IsString()
  audit_frequency?: string;

  @ApiPropertyOptional({ description: 'Auditor name' })
  @IsOptional()
  @IsString()
  auditor_name?: string;
}

export class CreateCertificationDto {
  @ApiProperty({
    enum: CertificationType,
    description: 'Type of certification',
  })
  @IsEnum(CertificationType)
  certification_type: CertificationType;

  @ApiProperty({ description: 'Unique certification number/code' })
  @IsString()
  @IsNotEmpty()
  certification_number: string;

  @ApiProperty({ description: 'Date certification was issued (ISO 8601)' })
  @IsDateString()
  issued_date: string;

  @ApiProperty({ description: 'Date certification expires (ISO 8601)' })
  @IsDateString()
  expiry_date: string;

  @ApiProperty({
    enum: CertificationStatus,
    description: 'Current status of certification',
    default: CertificationStatus.ACTIVE,
  })
  @IsEnum(CertificationStatus)
  status: CertificationStatus;

  @ApiProperty({ description: 'Organization that issued the certification' })
  @IsString()
  @IsNotEmpty()
  issuing_body: string;

  @ApiPropertyOptional({
    description: 'Scope of certification (e.g., specific farms, products, processes)',
  })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiPropertyOptional({
    description: 'Array of document references',
    type: [DocumentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentDto)
  documents?: DocumentDto[];

  @ApiPropertyOptional({
    description: 'Audit schedule information',
    type: AuditScheduleDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AuditScheduleDto)
  audit_schedule?: AuditScheduleDto;
}
