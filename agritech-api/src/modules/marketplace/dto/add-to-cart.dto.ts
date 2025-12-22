import { IsString, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class AddToCartDto {
    @IsOptional()
    @IsUUID()
    listing_id?: string;

    @IsOptional()
    @IsUUID()
    item_id?: string;

    @IsNumber()
    @Min(0.01)
    quantity: number;
}

export class UpdateCartItemDto {
    @IsNumber()
    @Min(0.01)
    quantity: number;
}
