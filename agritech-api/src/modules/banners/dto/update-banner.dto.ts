import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateBannerDto } from './create-banner.dto';

export class UpdateBannerDto extends PartialType(
  OmitType(CreateBannerDto, [] as const),
) {}
