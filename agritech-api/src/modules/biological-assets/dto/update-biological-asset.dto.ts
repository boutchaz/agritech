import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateBiologicalAssetDto } from './create-biological-asset.dto';

export class UpdateBiologicalAssetDto extends PartialType(
  OmitType(CreateBiologicalAssetDto, ['organization_id', 'farm_id'] as const)
) {}
