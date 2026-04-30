import { IsOptional, IsUUID, IsInt, IsISO8601, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Optional fields supplied by offline-first clients to support idempotency
 * and optimistic locking. Mix into create/update DTOs by spreading or
 * declaring the fields. Backend interceptor copies Idempotency-Key /
 * If-Match / X-Client-Created-At headers into these body fields.
 */
export class OfflineMixinDto {
  @ApiPropertyOptional({ description: 'Client-generated UUID for idempotent replay' })
  @IsOptional()
  @IsUUID()
  client_id?: string;

  @ApiPropertyOptional({ description: 'Row version for optimistic concurrency (used on update)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;

  @ApiPropertyOptional({ description: 'Client wall-clock at action time (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  client_created_at?: string;
}
