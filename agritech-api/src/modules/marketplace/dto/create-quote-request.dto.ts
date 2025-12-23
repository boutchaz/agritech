import { IsString, IsOptional, IsNumber, IsUUID, IsEmail, Min } from 'class-validator';

export class CreateQuoteRequestDto {
  @IsUUID()
  @IsOptional()
  item_id?: string;

  @IsUUID()
  @IsOptional()
  listing_id?: string;

  @IsString()
  product_title: string;

  @IsString()
  @IsOptional()
  product_description?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  requested_quantity?: number;

  @IsString()
  @IsOptional()
  unit_of_measure?: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsString()
  @IsOptional()
  buyer_contact_name?: string;

  @IsEmail()
  @IsOptional()
  buyer_contact_email?: string;

  @IsString()
  @IsOptional()
  buyer_contact_phone?: string;

  @IsUUID()
  seller_organization_id: string;
}
