import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrganizationDto {
  @ApiPropertyOptional({ description: 'Organization name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Organization description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Currency code', example: 'MAD' })
  @IsOptional()
  @IsString()
  currency_code?: string;

  @ApiPropertyOptional({ description: 'Timezone', example: 'Africa/Casablanca' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Organization active status' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
