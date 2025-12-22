import { IsString, IsOptional, IsObject, ValidateNested, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ShippingDetailsDto {
    @IsString()
    name: string;

    @IsString()
    phone: string;

    @IsOptional()
    @IsString()
    email?: string;

    @IsString()
    address: string;

    @IsString()
    city: string;

    @IsOptional()
    @IsString()
    postal_code?: string;
}

export class CreateOrderDto {
    @IsObject()
    @ValidateNested()
    @Type(() => ShippingDetailsDto)
    shipping_details: ShippingDetailsDto;

    @IsEnum(['cod', 'online'])
    payment_method: 'cod' | 'online';

    @IsOptional()
    @IsString()
    notes?: string;
}

export class UpdateOrderStatusDto {
    @IsEnum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'disputed'])
    status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'disputed';
}
