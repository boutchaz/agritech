import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDate, IsUUID, IsOptional, IsEnum, IsNotEmpty, IsNumber, Min, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export enum CampaignType {
  PLANTING = 'planting',
  HARVEST = 'harvest',
  MAINTENANCE = 'maintenance',
  IRRIGATION = 'irrigation',
  FERTILIZATION = 'fertilization',
  PEST_CONTROL = 'pest_control',
  OTHER = 'other',
}

export enum CampaignStatus {
  PLANNED = 'planned',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class CreateCampaignDto {
  @ApiProperty({ description: 'Organization ID' })
  @IsUUID()
  @IsNotEmpty()
  organization_id: string;

  @ApiProperty({ description: 'Campaign name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Campaign type', enum: CampaignType })
  @IsEnum(CampaignType)
  @IsNotEmpty()
  type: CampaignType;

  @ApiProperty({ description: 'Campaign description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Start date' })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  start_date: Date;

  @ApiProperty({ description: 'End date' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  end_date?: Date;

  @ApiProperty({ description: 'Budget amount' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  budget?: number;

  @ApiProperty({ description: 'Currency code' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ description: 'Farm IDs involved in campaign' })
  @IsArray()
  @IsUUID('4', { each: true, message: 'Each farm ID must be a valid UUID' })
  @IsOptional()
  farm_ids?: string[];

  @ApiProperty({ description: 'Parcel IDs involved in campaign' })
  @IsArray()
  @IsUUID('4', { each: true, message: 'Each parcel ID must be a valid UUID' })
  @IsOptional()
  parcel_ids?: string[];

  @ApiProperty({ description: 'Campaign status', enum: CampaignStatus })
  @IsEnum(CampaignStatus)
  @IsOptional()
  status?: CampaignStatus;

  @ApiProperty({ description: 'Priority level (1-5)' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  priority?: number;

  @ApiProperty({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
