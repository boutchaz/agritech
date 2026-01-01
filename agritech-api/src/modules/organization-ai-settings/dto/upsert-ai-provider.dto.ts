import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export enum AIProviderType {
  OPENAI = 'openai',
  GEMINI = 'gemini',
  GROQ = 'groq',
}

export class UpsertAIProviderDto {
  @ApiProperty({
    description: 'AI Provider type',
    enum: AIProviderType,
    example: AIProviderType.OPENAI,
  })
  @IsEnum(AIProviderType)
  @IsNotEmpty()
  provider: AIProviderType;

  @ApiProperty({
    description: 'API Key for the provider (will be encrypted)',
    example: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(20, { message: 'API key seems too short' })
  api_key: string;

  @ApiPropertyOptional({
    description: 'Whether this provider is enabled',
    default: true,
  })
  @IsOptional()
  enabled?: boolean;
}

export class AIProviderSettingsResponseDto {
  @ApiProperty({ description: 'Provider type' })
  provider: AIProviderType;

  @ApiProperty({ description: 'Whether the provider is configured' })
  configured: boolean;

  @ApiProperty({ description: 'Whether the provider is enabled' })
  enabled: boolean;

  @ApiProperty({ description: 'Masked API key for display', example: 'sk-xxxx...xxxx' })
  masked_key?: string;

  @ApiProperty({ description: 'When the key was last updated' })
  updated_at?: string;
}

export class DeleteAIProviderDto {
  @ApiProperty({
    description: 'AI Provider type to delete',
    enum: AIProviderType,
  })
  @IsEnum(AIProviderType)
  @IsNotEmpty()
  provider: AIProviderType;
}
