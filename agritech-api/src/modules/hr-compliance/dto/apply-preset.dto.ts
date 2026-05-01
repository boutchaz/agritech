import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class ApplyPresetDto {
  @ApiProperty({ enum: ['morocco_standard', 'morocco_basic', 'morocco_none', 'custom'] })
  @IsIn(['morocco_standard', 'morocco_basic', 'morocco_none', 'custom'])
  preset!: 'morocco_standard' | 'morocco_basic' | 'morocco_none' | 'custom';
}
