import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class DeleteParcelDto {
  @ApiProperty({
    description: 'Parcel ID to archive',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  parcel_id: string;
}

export class DeleteParcelResponseDto {
  @ApiProperty({ description: 'Whether archiving was successful' })
  success: boolean;

  @ApiProperty({ description: 'Archived parcel details', required: false })
  archived_parcel?: {
    id: string;
    name: string;
  };

  @ApiProperty({ description: 'Success or info message', required: false })
  message?: string;
}
