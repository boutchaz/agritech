import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsDateString, IsEnum } from 'class-validator';
import { PieceWorkPaymentStatus } from './update-piece-work.dto';
import { PaginatedQueryDto } from '../../../common/dto/paginated-query.dto';

export class PieceWorkFiltersDto extends PaginatedQueryDto {
  @ApiPropertyOptional({ description: 'Filter by worker ID' })
  @IsOptional()
  @IsUUID()
  worker_id?: string;

  @ApiPropertyOptional({ description: 'Filter by task ID' })
  @IsOptional()
  @IsUUID()
  task_id?: string;

  @ApiPropertyOptional({ description: 'Filter by parcel ID' })
  @IsOptional()
  @IsUUID()
  parcel_id?: string;

  @ApiPropertyOptional({ description: 'Filter by farm ID' })
  @IsOptional()
  @IsUUID()
  farm_id?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO format)', example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ description: 'End date (ISO format)', example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({ description: 'Filter by payment status', enum: PieceWorkPaymentStatus })
  @IsOptional()
  @IsEnum(PieceWorkPaymentStatus)
  payment_status?: PieceWorkPaymentStatus;

}
