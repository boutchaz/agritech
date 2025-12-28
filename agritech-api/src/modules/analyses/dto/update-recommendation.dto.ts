import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateRecommendationDto } from './create-recommendation.dto';

export class UpdateRecommendationDto extends PartialType(
  OmitType(CreateRecommendationDto, ['analysis_id'] as const),
) {}
