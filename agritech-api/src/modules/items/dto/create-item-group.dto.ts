import { IsUUID, IsString, IsBoolean, IsNumber, IsOptional } from 'class-validator';

export class CreateItemGroupDto {
  @IsUUID()
  @IsOptional()
  organization_id?: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  parent_group_id?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsNumber()
  @IsOptional()
  sort_order?: number;

  @IsUUID()
  @IsOptional()
  created_by?: string;
}

export class UpdateItemGroupDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  parent_group_id?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsNumber()
  @IsOptional()
  sort_order?: number;
}
