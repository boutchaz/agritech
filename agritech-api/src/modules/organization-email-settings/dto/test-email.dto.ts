import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TestEmailDto {
  @ApiProperty({ example: 'me@example.com' })
  @IsEmail()
  to!: string;
}
