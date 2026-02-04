import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductApplicationDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  product_id: string;

  @ApiProperty()
  application_date: string;

  @ApiProperty()
  quantity_used: number;

  @ApiProperty()
  area_treated: number;

  @ApiProperty()
  notes: string;

  @ApiPropertyOptional()
  cost?: number;

  @ApiPropertyOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Optional: Task ID if this application was planned' })
  task_id?: string;

  @ApiPropertyOptional({ description: 'Parcel ID' })
  parcel_id?: string;

  @ApiProperty()
  created_at: string;

  @ApiProperty({ description: 'Inventory item details' })
  inventory: {
    name: string;
    unit: string;
  };
}

export class ListProductApplicationsResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ type: [ProductApplicationDto] })
  applications: ProductApplicationDto[];

  @ApiProperty()
  total: number;
}
