import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum AdvancePartyKind {
  CUSTOMER = 'customer',
  SUPPLIER = 'supplier',
}

export enum AdvancePaymentMethod {
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  CHECK = 'check',
  CARD = 'card',
}

export class CreateAdvanceDto {
  @ApiProperty({
    enum: AdvancePartyKind,
    description: 'customer = prepayment received; supplier = advance paid',
  })
  @IsEnum(AdvancePartyKind)
  party_kind: AdvancePartyKind;

  @ApiProperty()
  @IsUUID()
  party_id: string;

  @ApiProperty()
  @IsString()
  party_name: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ default: 'MAD' })
  @IsOptional()
  @IsString()
  currency_code?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  exchange_rate?: number;

  @ApiPropertyOptional({ description: 'ISO date; defaults to today' })
  @IsOptional()
  @IsString()
  payment_date?: string;

  @ApiPropertyOptional({ enum: AdvancePaymentMethod, default: AdvancePaymentMethod.BANK_TRANSFER })
  @IsOptional()
  @IsEnum(AdvancePaymentMethod)
  payment_method?: AdvancePaymentMethod;

  @ApiPropertyOptional({ description: 'Bank account this advance hits' })
  @IsOptional()
  @IsUUID()
  bank_account_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference_number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AdvanceAllocationDto {
  @ApiProperty()
  @IsUUID()
  invoice_id: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amount: number;
}

export class ApplyAdvanceDto {
  @ApiProperty({ type: [AdvanceAllocationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdvanceAllocationDto)
  allocations: AdvanceAllocationDto[];

  @ApiPropertyOptional({ description: 'ISO date for the allocation JE; defaults to today' })
  @IsOptional()
  @IsString()
  posting_date?: string;
}
