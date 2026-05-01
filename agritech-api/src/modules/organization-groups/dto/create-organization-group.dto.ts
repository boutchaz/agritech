import { IsString, IsOptional, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrganizationGroupDto {
  @ApiProperty({ description: 'Group name', maxLength: 255 })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Base currency (ISO 4217 3-letter code)', example: 'MAD' })
  @IsString()
  @Length(3, 3)
  base_currency: string;
}

export class UpdateOrganizationGroupDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(3, 3)
  base_currency?: string;
}

export class AddGroupMemberDto {
  @ApiProperty({ description: 'Organization ID to add to the group' })
  @IsString()
  organization_id: string;
}
