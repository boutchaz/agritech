import { IsEmail, IsUUID, IsOptional, IsString } from 'class-validator';

export class InviteOrganizationUserDto {
  @IsEmail()
  email: string;

  @IsUUID()
  role_id: string;

  @IsOptional()
  @IsString()
  organization_id?: string;

  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;
}
