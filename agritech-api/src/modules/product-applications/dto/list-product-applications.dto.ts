import { ApiProperty } from '@nestjs/swagger';

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
