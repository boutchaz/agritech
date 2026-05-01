import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginatedQueryDto } from '../../../common/dto/paginated-query.dto';
import { AttendanceType } from './create-attendance.dto';

export class AttendanceFiltersDto extends PaginatedQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  worker_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  farm_id?: string;

  @ApiPropertyOptional({ enum: AttendanceType })
  @IsOptional()
  @IsEnum(AttendanceType)
  type?: AttendanceType;

  @ApiPropertyOptional({ description: 'ISO date (yyyy-mm-dd) inclusive' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO date (yyyy-mm-dd) inclusive' })
  @IsOptional()
  @IsString()
  to?: string;
}
