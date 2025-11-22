import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';

export class BatchDeleteFarmsDto {
  @ApiProperty({
    description: 'Array of farm IDs to delete',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001',
    ],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one farm ID is required' })
  @IsUUID('4', { each: true, message: 'Each farm ID must be a valid UUID' })
  farm_ids: string[];
}

export class BatchDeleteResponseDto {
  @ApiProperty({ description: 'Number of farms successfully deleted' })
  deleted: number;

  @ApiProperty({ description: 'Number of farms that failed to delete' })
  failed: number;

  @ApiProperty({
    description: 'Details of deleted farms',
    type: [Object],
  })
  deleted_farms: Array<{ id: string; name: string }>;

  @ApiProperty({
    description: 'Details of failed deletions',
    type: [Object],
  })
  errors: Array<{ id: string; name: string; error: string }>;

  @ApiProperty({ description: 'Overall success status' })
  success: boolean;
}
