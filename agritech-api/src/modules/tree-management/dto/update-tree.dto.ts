import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateTreeDto {
  @ApiProperty({ description: 'Tree name' })
  @IsNotEmpty()
  @IsString()
  name: string;
}
