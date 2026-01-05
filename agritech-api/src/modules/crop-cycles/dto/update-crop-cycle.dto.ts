import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCropCycleDto } from './create-crop-cycle.dto';

export class UpdateCropCycleDto extends PartialType(
  OmitType(CreateCropCycleDto, ['organization_id', 'farm_id'] as const)
) {}
