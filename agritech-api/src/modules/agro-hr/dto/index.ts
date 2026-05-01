import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

// ── Seasonal Campaigns ─────────────────────────────────────────────

const SEASON_TYPES = ['planting', 'harvest', 'pruning', 'treatment', 'other'] as const;
const CAMPAIGN_STATUSES = ['planning', 'recruiting', 'active', 'completed', 'cancelled'] as const;

export class CreateSeasonalCampaignDto {
  @ApiProperty() @IsUUID() farm_id!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty({ enum: SEASON_TYPES })
  @IsIn(SEASON_TYPES as unknown as string[])
  season_type!: typeof SEASON_TYPES[number];
  @ApiPropertyOptional() @IsOptional() @IsString() crop_type?: string;
  @ApiProperty() @IsDateString() start_date!: string;
  @ApiProperty() @IsDateString() end_date!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) target_worker_count?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() estimated_labor_budget?: number;
  @ApiPropertyOptional({ enum: CAMPAIGN_STATUSES })
  @IsOptional()
  @IsIn(CAMPAIGN_STATUSES as unknown as string[])
  status?: typeof CAMPAIGN_STATUSES[number];
}

export class UpdateSeasonalCampaignDto extends PartialType(CreateSeasonalCampaignDto) {
  @ApiPropertyOptional() @IsOptional() @IsNumber() actual_labor_cost?: number;
}

// ── Worker Qualifications ──────────────────────────────────────────

const QUALIFICATION_TYPES = [
  'tractor_operation', 'pesticide_handling', 'first_aid', 'forklift',
  'irrigation_system', 'pruning', 'harvesting_technique', 'food_safety',
  'fire_safety', 'electrical', 'other',
] as const;

export class CreateWorkerQualificationDto {
  @ApiProperty() @IsUUID() worker_id!: string;
  @ApiProperty({ enum: QUALIFICATION_TYPES })
  @IsIn(QUALIFICATION_TYPES as unknown as string[])
  qualification_type!: typeof QUALIFICATION_TYPES[number];
  @ApiProperty() @IsString() qualification_name!: string;
  @ApiProperty() @IsDateString() issued_date!: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiry_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() issuing_authority?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() certificate_url?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateWorkerQualificationDto extends PartialType(CreateWorkerQualificationDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() is_valid?: boolean;
}

// ── Safety Incidents ───────────────────────────────────────────────

const INCIDENT_TYPES = [
  'injury', 'near_miss', 'chemical_exposure', 'equipment_damage', 'fire', 'environmental', 'other',
] as const;
const SEVERITIES = ['minor', 'moderate', 'serious', 'fatal'] as const;
const INCIDENT_STATUSES = ['reported', 'investigating', 'resolved', 'closed'] as const;

export class CreateSafetyIncidentDto {
  @ApiProperty() @IsUUID() farm_id!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() parcel_id?: string;
  @ApiProperty() @IsDateString() incident_date!: string;
  @ApiProperty({ enum: INCIDENT_TYPES })
  @IsIn(INCIDENT_TYPES as unknown as string[])
  incident_type!: typeof INCIDENT_TYPES[number];
  @ApiProperty({ enum: SEVERITIES })
  @IsIn(SEVERITIES as unknown as string[])
  severity!: typeof SEVERITIES[number];
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  worker_ids!: string[];
  @ApiPropertyOptional() @IsOptional() @IsUUID() supervisor_id?: string;
  @ApiProperty() @IsString() description!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location_description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() root_cause?: string;
  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  corrective_actions?: unknown[];
  @ApiPropertyOptional() @IsOptional() @IsString() preventive_measures?: string;
}

export class UpdateSafetyIncidentDto extends PartialType(CreateSafetyIncidentDto) {
  @ApiPropertyOptional({ enum: INCIDENT_STATUSES })
  @IsOptional()
  @IsIn(INCIDENT_STATUSES as unknown as string[])
  status?: typeof INCIDENT_STATUSES[number];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() cnss_declaration?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsDateString() cnss_declaration_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cnss_declaration_reference?: string;
}

// ── Worker Transport ───────────────────────────────────────────────

export class CreateWorkerTransportDto {
  @ApiProperty() @IsUUID() farm_id!: string;
  @ApiProperty() @IsDateString() date!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vehicle_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() driver_worker_id?: string;
  @ApiProperty() @IsString() pickup_location!: string;
  @ApiProperty({ example: '06:30' })
  @Matches(/^[0-2]\d:[0-5]\d(:[0-5]\d)?$/, { message: 'pickup_time must be HH:MM[:SS]' })
  pickup_time!: string;
  @ApiProperty() @IsString() destination!: string;
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  worker_ids!: string[];
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) capacity?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) actual_count?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateWorkerTransportDto extends PartialType(CreateWorkerTransportDto) {}

// silence unused class-transformer / IsObject imports to avoid lint
void IsObject;
