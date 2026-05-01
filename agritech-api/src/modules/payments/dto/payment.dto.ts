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
    IsInt,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum PaymentType {
    RECEIVE = 'receive',
    PAY = 'pay',
    BANK_FEE = 'bank_fee',
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

export enum PartyType {
    CUSTOMER = 'customer',
    SUPPLIER = 'supplier',
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

    @ApiPropertyOptional({ description: 'Party type', enum: PartyType, example: PartyType.CUSTOMER })
    @IsEnum(PartyType)
    @IsOptional()
    party_type?: PartyType;

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

    @ApiPropertyOptional({ description: 'Notes (alias for remarks)' })
    @IsString()
    @IsOptional()
    notes?: string;
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

export enum SortDirection {
    ASC = 'asc',
    DESC = 'desc',
}

export class PaginatedPaymentQueryDto {
    @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1, minimum: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Items per page', default: 10, minimum: 1, maximum: 100 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    pageSize?: number = 10;

    @ApiPropertyOptional({ description: 'Sort by field', example: 'payment_date' })
    @IsOptional()
    @IsString()
    sortBy?: string = 'payment_date';

    @ApiPropertyOptional({ description: 'Sort direction', enum: SortDirection, default: SortDirection.DESC })
    @IsOptional()
    @IsEnum(SortDirection)
    sortDir?: SortDirection = SortDirection.DESC;

    @ApiPropertyOptional({ description: 'Search term (payment number, party name)' })
    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim())
    search?: string;

    @ApiPropertyOptional({ description: 'Filter by payment type', enum: PaymentType })
    @IsOptional()
    @IsEnum(PaymentType)
    payment_type?: PaymentType;

    @ApiPropertyOptional({ description: 'Filter by status', enum: PaymentStatus })
    @IsOptional()
    @IsEnum(PaymentStatus)
    status?: PaymentStatus;

    @ApiPropertyOptional({ description: 'Filter from date (inclusive)', example: '2024-01-01' })
    @IsOptional()
    @IsDateString()
    dateFrom?: string;

    @ApiPropertyOptional({ description: 'Filter to date (inclusive)', example: '2024-12-31' })
    @IsOptional()
    @IsDateString()
    dateTo?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
