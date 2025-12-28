import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateTreeDto {
  @ApiProperty({ description: 'Category ID' })
  @IsNotEmpty()
  @IsUUID()
  category_id: string;

  @ApiProperty({ description: 'Tree name' })
  @IsNotEmpty()
  @IsString()
  name: string;
}
