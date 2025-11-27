import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsObject } from 'class-validator';

export class UpdateModuleDto {
  @ApiPropertyOptional({ description: 'Module activation status' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ description: 'Module-specific settings as JSON', type: 'object' })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}
