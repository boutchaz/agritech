import { PartialType } from '@nestjs/swagger';
import { CreateAnalysisDto } from './create-analysis.dto';
import { OmitType } from '@nestjs/swagger';

export class UpdateAnalysisDto extends PartialType(
  OmitType(CreateAnalysisDto, ['parcel_id'] as const)
) {}
