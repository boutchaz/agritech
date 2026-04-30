import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginatedQueryDto } from '../../../common/dto/paginated-query.dto';
import { DeliveryNoteStatus } from './delivery-note-status.enum';

export class DeliveryNoteFiltersDto extends PaginatedQueryDto {
  @ApiPropertyOptional({ description: 'Filter by delivery note status', enum: DeliveryNoteStatus })
  @IsEnum(DeliveryNoteStatus)
  @IsOptional()
  status?: DeliveryNoteStatus;

  @ApiPropertyOptional({ description: 'Search by delivery note or customer' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter from date', example: '2026-04-01' })
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter to date', example: '2026-04-30' })
  @IsDateString()
  @IsOptional()
  dateTo?: string;
}
