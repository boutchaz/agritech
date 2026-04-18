import { IsIn, IsString } from 'class-validator';

export class ConfirmNutritionOptionDto {
  @IsString()
  @IsIn(['A', 'B', 'C'])
  option!: 'A' | 'B' | 'C';
}
