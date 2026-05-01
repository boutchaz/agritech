import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export type SyncMethod = 'POST' | 'PATCH' | 'PUT' | 'DELETE';
export type SyncResource =
  | 'task'
  | 'task-comment'
  | 'stock-entry'
  | 'harvest'
  | 'pest-report'
  | 'work-record';

export class SyncItemDto {
  @ApiProperty({ description: 'Client-generated UUID for idempotency' })
  @IsUUID()
  client_id: string;

  @ApiProperty({ description: 'Resource type' })
  @IsIn(['task', 'task-comment', 'stock-entry', 'harvest', 'pest-report', 'work-record'])
  resource: SyncResource;

  @ApiProperty({ description: 'HTTP method' })
  @IsIn(['POST', 'PATCH', 'PUT', 'DELETE'])
  method: SyncMethod;

  @ApiProperty({ description: 'Absolute API path (with leading slash)' })
  @IsString()
  url: string;

  @ApiPropertyOptional({ description: 'Optimistic-lock version (PATCH/PUT)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;

  @ApiPropertyOptional({ description: 'Client wall-clock at action time' })
  @IsOptional()
  @IsISO8601()
  client_created_at?: string;

  @ApiPropertyOptional({ description: 'Dependency client_ids that must process first' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  deps?: string[];

  @ApiProperty({ description: 'Request body' })
  payload: unknown;
}

export class SyncFlushRequestDto {
  @ApiProperty({ type: [SyncItemDto], maxItems: 500 })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => SyncItemDto)
  items: SyncItemDto[];
}

export type SyncStatus = 'ok' | 'conflict' | 'error';

export interface SyncResultItem {
  client_id: string;
  status: SyncStatus;
  http_status: number;
  body?: unknown;
  error?: string;
}

export class SyncFlushResponseDto {
  @ApiProperty({ description: 'Per-item results, indexed by client_id' })
  results: SyncResultItem[];
}
