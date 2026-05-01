import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AttendanceType {
  CHECK_IN = 'check_in',
  CHECK_OUT = 'check_out',
}

export enum AttendanceSource {
  MOBILE = 'mobile',
  MANUAL = 'manual',
  ADMIN = 'admin',
  BIOMETRIC = 'biometric',
}

export class CreateAttendanceDto {
  @ApiProperty()
  @IsUUID()
  worker_id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  farm_id?: string;

  @ApiProperty({ enum: AttendanceType })
  @IsEnum(AttendanceType)
  type!: AttendanceType;

  @ApiPropertyOptional({ description: 'ISO timestamp; defaults to now' })
  @IsOptional()
  @IsString()
  occurred_at?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @ApiPropertyOptional({ description: 'GPS accuracy in metres' })
  @IsOptional()
  @IsNumber()
  accuracy_m?: number;

  @ApiPropertyOptional({ enum: AttendanceSource, default: AttendanceSource.MOBILE })
  @IsOptional()
  @IsEnum(AttendanceSource)
  source?: AttendanceSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
