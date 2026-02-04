import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ParcelApplicationInventoryDto {
  @ApiProperty({ description: 'Product name from inventory' })
  name: string;

  @ApiProperty({ description: 'Product unit from inventory' })
  unit: string;
}

export class ParcelApplicationDto {
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

  @ApiProperty({ required: false })
  notes?: string;

  @ApiProperty({ required: false })
  cost?: number;

  @ApiProperty({ required: false })
  currency?: string;

  @ApiPropertyOptional({ description: 'Optional: Task ID if this application was planned' })
  task_id?: string;

  @ApiProperty()
  created_at: string;

  @ApiProperty({ description: 'Inventory item details', type: () => ParcelApplicationInventoryDto })
  inventory: ParcelApplicationInventoryDto;
}

export class ListParcelApplicationsResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  parcel_id: string;

  @ApiProperty({ type: [ParcelApplicationDto] })
  applications: ParcelApplicationDto[];

  @ApiProperty()
  total: number;
}
