import {
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateExpenseCategoryDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}
export class UpdateExpenseCategoryDto extends PartialType(CreateExpenseCategoryDto) {}

const STATUSES = [
  'pending', 'approved', 'partially_approved', 'rejected', 'paid', 'cancelled',
] as const;

export class CreateExpenseClaimDto {
  @ApiProperty() @IsUUID() worker_id!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() farm_id?: string;
  @ApiProperty() @IsString() title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsDateString() expense_date!: string;
  @ApiProperty({ type: [Object] })
  @IsArray()
  items!: Array<Record<string, unknown>>;
  @ApiProperty() @IsNumber() @Min(0) total_amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) total_tax?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) grand_total?: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() advance_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() advance_amount_allocated?: number;
}

export class UpdateExpenseClaimDto extends PartialType(CreateExpenseClaimDto) {
  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES as unknown as string[])
  status?: typeof STATUSES[number];
}

export class ApproveClaimDto {
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
export class RejectClaimDto {
  @ApiProperty() @IsString() rejection_reason!: string;
}
