import { PartialType } from '@nestjs/swagger';
import { CreateLetterHeadDto } from './create-letter-head.dto';

export class UpdateLetterHeadDto extends PartialType(CreateLetterHeadDto) {}
