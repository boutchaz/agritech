import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsUUID, IsNumber, IsOptional, Min } from "class-validator";

export class ConsumedItemDto {
  @ApiProperty({ description: "Product/Item ID from inventory" })
  @IsUUID()
  product_id: string;

  @ApiPropertyOptional({ description: "Product variant ID (e.g. 1L, 5L format)" })
  @IsOptional()
  @IsUUID()
  variant_id?: string;

  @ApiProperty({ description: "Quantity to consume" })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiPropertyOptional({
    description: "Area treated in hectares (for applications)",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  area_treated?: number;
}
