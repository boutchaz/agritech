import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class DeleteFarmDto {
  @ApiProperty({
    description: 'Farm ID to delete',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  farm_id: string;
}

export class DeleteFarmResponseDto {
  @ApiProperty({ description: 'Whether deletion was successful' })
  success: boolean;

  @ApiProperty({ description: 'Deleted farm details', required: false })
  deleted_farm?: {
    id: string;
    name: string;
  };

  @ApiProperty({ description: 'Success or info message', required: false })
  message?: string;
}
