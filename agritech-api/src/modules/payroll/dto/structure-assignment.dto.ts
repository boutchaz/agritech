import {
  IsDateString,
  IsNumber,
  IsObject,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStructureAssignmentDto {
  @ApiProperty() @IsUUID() worker_id!: string;
  @ApiProperty() @IsUUID() salary_structure_id!: string;
  @ApiProperty() @IsNumber() @Min(0) base_amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) variable_amount?: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() cost_center_farm_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() cost_center_split?: Record<string, unknown>;
  @ApiProperty() @IsDateString() effective_from!: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() effective_to?: string;
}
