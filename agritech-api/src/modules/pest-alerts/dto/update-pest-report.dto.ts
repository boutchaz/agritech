import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum PestReportStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  TREATED = 'treated',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

export class UpdatePestReportDto {
  @ApiProperty({ enum: PestReportStatus, description: 'Report status' })
  @IsEnum(PestReportStatus)
  status: PestReportStatus;

  @ApiPropertyOptional({ description: 'Treatment applied' })
  @IsOptional()
  @IsString()
  treatment_applied?: string;
}
