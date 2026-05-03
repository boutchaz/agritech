import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeaveBlockDateDto {
  @ApiProperty() @IsDateString() block_date!: string;
  @ApiProperty() @IsString() reason!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() leave_type_id?: string;
}

export class UpdateLeaveBlockDateDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() block_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() leave_type_id?: string | null;
}
