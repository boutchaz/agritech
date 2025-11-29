import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsNumber,
    IsDateString,
    IsEnum,
    IsOptional,
    IsUUID,
    IsArray,
    ValidateNested,
    Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentType {
    RECEIVE = 'receive',
    PAY = 'pay',
}

export enum PaymentMethod {
    CASH = 'cash',
    BANK_TRANSFER = 'bank_transfer',
    CHECK = 'check',
    CARD = 'card',
    MOBILE_MONEY = 'mobile_money',
}

export enum PaymentStatus {
    DRAFT = 'draft',
    SUBMITTED = 'submitted',
    RECONCILED = 'reconciled',
    CANCELLED = 'cancelled',
}

export class PaymentAllocationDto {
    @ApiProperty({ description: 'Invoice ID to allocate payment to', format: 'uuid' })
    @IsUUID()
    invoice_id: string;

    @ApiProperty({ description: 'Amount to allocate to this invoice', example: 1000.00 })
    @IsNumber()
    @Min(0.01)
    amount: number;
}

export class CreatePaymentDto {
    @ApiProperty({ description: 'Payment type', enum: PaymentType, example: PaymentType.RECEIVE })
    @IsEnum(PaymentType)
    payment_type: PaymentType;

    @ApiProperty({ description: 'Payment method', enum: PaymentMethod, example: PaymentMethod.BANK_TRANSFER })
    @IsEnum(PaymentMethod)
    payment_method: PaymentMethod;

    @ApiProperty({ description: 'Payment date', example: '2024-01-15' })
    @IsDateString()
    payment_date: string;

    @ApiProperty({ description: 'Payment amount', example: 1000.00 })
    @IsNumber()
    @Min(0.01)
    amount: number;

    @ApiProperty({ description: 'Party name (customer or supplier)', example: 'ACME Corp' })
    @IsString()
    party_name: string;

    @ApiPropertyOptional({ description: 'Party ID (customer or supplier)', format: 'uuid' })
    @IsUUID()
    @IsOptional()
    party_id?: string;

    @ApiPropertyOptional({ description: 'Bank account ID', format: 'uuid' })
    @IsUUID()
    @IsOptional()
    bank_account_id?: string;

    @ApiPropertyOptional({ description: 'Reference number' })
    @IsString()
    @IsOptional()
    reference_number?: string;

    @ApiPropertyOptional({ description: 'Currency code', example: 'MAD' })
    @IsString()
    @IsOptional()
    currency_code?: string;

    @ApiPropertyOptional({ description: 'Exchange rate', example: 1.0 })
    @IsNumber()
    @IsOptional()
    exchange_rate?: number;

    @ApiPropertyOptional({ description: 'Remarks' })
    @IsString()
    @IsOptional()
    remarks?: string;
}

export class AllocatePaymentDto {
    @ApiProperty({
        description: 'Payment allocations to invoices',
        type: [PaymentAllocationDto],
        example: [
            { invoice_id: '123e4567-e89b-12d3-a456-426614174000', amount: 500.00 },
            { invoice_id: '123e4567-e89b-12d3-a456-426614174001', amount: 500.00 }
        ]
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PaymentAllocationDto)
    allocations: PaymentAllocationDto[];
}

export class UpdatePaymentStatusDto {
    @ApiProperty({ description: 'New payment status', enum: PaymentStatus })
    @IsEnum(PaymentStatus)
    status: PaymentStatus;

    @ApiPropertyOptional({ description: 'Optional notes about status change' })
    @IsString()
    @IsOptional()
    notes?: string;
}
