import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, Min } from 'class-validator';

export class CreatePlantationTypeDto {
  @ApiProperty({ description: 'Plantation type name' })
  @IsNotEmpty()
  @IsString()
  type: string;

  @ApiProperty({ description: 'Spacing description (e.g., "6x6m")' })
  @IsNotEmpty()
  @IsString()
  spacing: string;

  @ApiProperty({ description: 'Number of trees per hectare' })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  trees_per_ha: number;
}
