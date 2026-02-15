import { IsString, IsNumber, IsOptional, IsUUID, Min, Max } from 'class-validator';

export class CreateReviewDto {
  @IsUUID()
  reviewee_organization_id: string;

  @IsUUID()
  order_id: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsOptional()
  comment?: string;
}
