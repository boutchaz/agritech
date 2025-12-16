import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum UtilityType {
  ELECTRICITY = 'electricity',
  WATER = 'water',
  DIESEL = 'diesel',
  GAS = 'gas',
  INTERNET = 'internet',
  PHONE = 'phone',
  OTHER = 'other',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
}

export enum RecurringFrequency {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

export class CreateUtilityDto {
  @ApiProperty({ description: 'Farm ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  farm_id: string;

  @ApiPropertyOptional({ description: 'Parcel ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsString()
  parcel_id?: string;

  @ApiProperty({ enum: UtilityType, description: 'Type of utility', example: 'electricity' })
  @IsEnum(UtilityType)
  type: UtilityType;

  @ApiPropertyOptional({ description: 'Utility provider name', example: 'STEG' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ description: 'Account number', example: '123456789' })
  @IsOptional()
  @IsString()
  account_number?: string;

  @ApiProperty({ description: 'Amount', example: 250.50 })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ description: 'Consumption value', example: 500 })
  @IsOptional()
  @IsNumber()
  consumption_value?: number;

  @ApiPropertyOptional({ description: 'Consumption unit', example: 'kWh' })
  @IsOptional()
  @IsString()
  consumption_unit?: string;

  @ApiProperty({ description: 'Billing date', example: '2024-01-01' })
  @IsDateString()
  billing_date: string;

  @ApiPropertyOptional({ description: 'Due date', example: '2024-01-15' })
  @IsOptional()
  @IsDateString()
  due_date?: string;

  @ApiPropertyOptional({ enum: PaymentStatus, description: 'Payment status', example: 'pending', default: 'pending' })
  @IsOptional()
  @IsEnum(PaymentStatus)
  payment_status?: PaymentStatus;

  @ApiPropertyOptional({ description: 'Is recurring', example: false })
  @IsOptional()
  @IsBoolean()
  is_recurring?: boolean;

  @ApiPropertyOptional({ enum: RecurringFrequency, description: 'Recurring frequency', example: 'monthly' })
  @IsOptional()
  @IsEnum(RecurringFrequency)
  recurring_frequency?: RecurringFrequency;

  @ApiPropertyOptional({ description: 'Invoice URL', example: 'https://example.com/invoice.pdf' })
  @IsOptional()
  @IsString()
  invoice_url?: string;

  @ApiPropertyOptional({ description: 'Notes', example: 'Monthly electricity bill' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Cost per parcel', example: 50.00 })
  @IsOptional()
  @IsNumber()
  cost_per_parcel?: number;
}
