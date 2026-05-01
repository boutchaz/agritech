import { PartialType } from '@nestjs/swagger';
import { CreateChangelogDto } from './create-changelog.dto';

export class UpdateChangelogDto extends PartialType(CreateChangelogDto) {}
