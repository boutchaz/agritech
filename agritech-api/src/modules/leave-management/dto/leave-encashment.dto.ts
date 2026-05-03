import { IsDateString, IsNumber, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeaveEncashmentDto {
  @ApiProperty() @IsUUID() worker_id!: string;
  @ApiProperty() @IsUUID() leave_type_id!: string;
  @ApiProperty() @IsUUID() leave_allocation_id!: string;
  @ApiProperty() @IsNumber() days_encashed!: number;
  @ApiProperty() @IsNumber() amount_per_day!: number;
}
