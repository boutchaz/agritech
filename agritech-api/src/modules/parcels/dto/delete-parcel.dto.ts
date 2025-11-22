import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class DeleteParcelDto {
  @ApiProperty({
    description: 'Parcel ID to delete',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  parcel_id: string;
}

export class DeleteParcelResponseDto {
  @ApiProperty({ description: 'Whether deletion was successful' })
  success: boolean;

  @ApiProperty({ description: 'Deleted parcel details', required: false })
  deleted_parcel?: {
    id: string;
    name: string;
  };

  @ApiProperty({ description: 'Success or info message', required: false })
  message?: string;
}
