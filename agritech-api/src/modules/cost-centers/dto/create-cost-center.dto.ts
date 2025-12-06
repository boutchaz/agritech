import { IsString, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateCostCenterDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  parent_id?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  // Set by controller
  @IsUUID()
  @IsOptional()
  organization_id?: string;

  @IsUUID()
  @IsOptional()
  created_by?: string;
}
