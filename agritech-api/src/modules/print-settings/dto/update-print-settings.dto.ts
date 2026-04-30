import { PartialType } from '@nestjs/swagger';
import { CreatePrintSettingsDto } from './create-print-settings.dto';

export class UpdatePrintSettingsDto extends PartialType(CreatePrintSettingsDto) {}
