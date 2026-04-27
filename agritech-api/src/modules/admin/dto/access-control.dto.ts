import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAccessControlRoleDto {
  @ApiProperty({
    description:
      'Snake-case role identifier. Reserved: internal_admin, system_admin, organization_admin, farm_manager, farm_worker, day_laborer, viewer.',
    example: 'agronomist',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'name must be snake_case (lowercase letters, digits, underscores)',
  })
  name!: string;

  @ApiProperty({ example: 'Agronomist' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  display_name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 79,
    default: 50,
    description: 'Hierarchy level. Custom roles must stay below organization_admin (80).',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(79)
  level?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateAccessControlRoleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  display_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 79 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(79)
  level?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class ReplaceRolePermissionsDto {
  @ApiProperty({ type: [String], description: 'Permission UUIDs to assign to the role' })
  @IsArray()
  @IsUUID('4', { each: true })
  permission_ids!: string[];
}
