import { PartialType } from '@nestjs/swagger';
import { CreatePlantationTypeDto } from './create-plantation-type.dto';

export class UpdatePlantationTypeDto extends PartialType(CreatePlantationTypeDto) {}
