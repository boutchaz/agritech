import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCropCycleDto } from './create-crop-cycle.dto';

export class UpdateCropCycleDto extends PartialType(
  OmitType(CreateCropCycleDto, ['farm_id'] as const)
) {}
