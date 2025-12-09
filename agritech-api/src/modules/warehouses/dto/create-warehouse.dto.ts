import { IsString, IsOptional, IsBoolean, IsNumber, IsNotEmpty } from 'class-validator';

export class CreateWarehouseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  postal_code?: string;

  @IsOptional()
  @IsNumber()
  capacity?: number;

  @IsOptional()
  @IsString()
  capacity_unit?: string;

  @IsOptional()
  @IsBoolean()
  temperature_controlled?: boolean;

  @IsOptional()
  @IsBoolean()
  humidity_controlled?: boolean;

  @IsOptional()
  @IsString()
  security_level?: string;

  @IsOptional()
  @IsString()
  manager_name?: string;

  @IsOptional()
  @IsString()
  manager_phone?: string;

  @IsOptional()
  @IsString()
  farm_id?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
