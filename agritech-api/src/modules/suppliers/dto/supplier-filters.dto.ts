import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginatedQueryDto } from '../../../common/dto/paginated-query.dto';

export class SupplierFiltersDto extends PaginatedQueryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  supplier_code?: string;

  @IsOptional()
  @IsString()
  supplier_type?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  assigned_to?: string;
}
