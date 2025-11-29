import { IsUUID, IsOptional, IsBoolean } from 'class-validator';

export class CreateOrganizationUserDto {
  @IsUUID()
  user_id: string;

  @IsUUID()
  role_id: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  // Set by controller
  organization_id?: string;
  created_by?: string;
}
