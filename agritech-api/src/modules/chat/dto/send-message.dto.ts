import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({
    description: 'User question or query',
    example: 'What is the status of my current crop cycles?',
  })
  @IsNotEmpty()
  @IsString()
  query: string;

  @ApiPropertyOptional({
    description: 'Response language',
    enum: ['en', 'fr', 'ar'],
    default: 'en',
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    description: 'Save conversation history',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  save_history?: boolean;
}
