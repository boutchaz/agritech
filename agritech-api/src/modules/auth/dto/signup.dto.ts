import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'SecurePassword123!', minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({ example: '+212612345678' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: "John's Farm" })
  @IsString()
  @IsOptional()
  organizationName?: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Organization ID if user was invited',
  })
  @IsUUID()
  @IsOptional()
  invitedToOrganization?: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Role ID if user was invited with specific role',
  })
  @IsUUID()
  @IsOptional()
  invitedWithRole?: string;
}

export class SignupResponseDto {
  @ApiProperty()
  user: {
    id: string;
    email: string;
    fullName: string;
  };

  @ApiProperty()
  organization: {
    id: string;
    name: string;
    slug: string;
  };

  @ApiProperty()
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}
