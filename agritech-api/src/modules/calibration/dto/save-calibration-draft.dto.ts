import { IsInt, IsObject, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SaveCalibrationDraftDto {
  @ApiProperty({ description: 'Current wizard step (1-8)', example: 3 })
  @IsInt()
  @Min(1)
  @Max(8)
  current_step: number;

  @ApiProperty({ description: 'Form data as JSON object', example: {} })
  @IsObject()
  form_data: Record<string, unknown>;
}
