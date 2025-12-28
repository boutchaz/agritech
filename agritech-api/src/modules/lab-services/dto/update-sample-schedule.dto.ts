import { PartialType } from '@nestjs/swagger';
import { CreateSampleScheduleDto } from './create-sample-schedule.dto';

export class UpdateSampleScheduleDto extends PartialType(CreateSampleScheduleDto) {}
