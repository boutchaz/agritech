import { IsIn, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmTargetYieldDto {
  @ApiProperty({ example: 4.38, description: 'Target yield in t/ha. Must fall within the validation envelope returned by GET target-yield-suggestion.' })
  @IsNumber()
  @Min(0)
  target_yield_t_ha!: number;

  @ApiProperty({ enum: ['suggested', 'user_override'] })
  @IsIn(['suggested', 'user_override'])
  source!: 'suggested' | 'user_override';
}
