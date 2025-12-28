import { PartialType } from '@nestjs/swagger';
import { CreateLabServiceOrderDto } from './create-lab-service-order.dto';

export class UpdateLabServiceOrderDto extends PartialType(CreateLabServiceOrderDto) {}
