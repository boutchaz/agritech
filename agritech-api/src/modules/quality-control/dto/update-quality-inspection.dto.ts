import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateQualityInspectionDto } from './create-quality-inspection.dto';

export class UpdateQualityInspectionDto extends PartialType(
  OmitType(CreateQualityInspectionDto, ['organization_id', 'farm_id'] as const)
) {}
