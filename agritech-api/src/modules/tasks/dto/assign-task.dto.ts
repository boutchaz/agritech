import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignTaskDto {
  @ApiProperty({ description: 'Worker ID to assign the task to' })
  @IsUUID()
  worker_id: string;
}
