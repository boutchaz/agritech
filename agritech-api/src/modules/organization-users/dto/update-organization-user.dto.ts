import { IsUUID, IsOptional, IsBoolean } from 'class-validator';

export class UpdateOrganizationUserDto {
  @IsOptional()
  @IsUUID()
  role_id?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
