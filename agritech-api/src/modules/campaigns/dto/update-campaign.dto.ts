import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCampaignDto } from './create-campaign.dto';

export class UpdateCampaignDto extends PartialType(
  OmitType(CreateCampaignDto, ['organization_id'] as const)
) {}
