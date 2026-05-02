import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginatedQueryDto } from '../../../common/dto/paginated-query.dto';

export class ListWorkersDto extends PaginatedQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by worker type',
    enum: ['fixed_salary', 'daily_worker', 'metayage'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['fixed_salary', 'daily_worker', 'metayage'])
  workerType?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by farm ID' })
  @IsOptional()
  @IsString()
  farmId?: string;

  @ApiPropertyOptional({
    description: 'Filter by platform access',
    enum: ['with', 'without'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['with', 'without'])
  platformAccess?: 'with' | 'without';
}
