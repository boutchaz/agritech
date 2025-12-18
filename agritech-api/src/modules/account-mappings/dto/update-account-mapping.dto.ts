import { PartialType } from '@nestjs/mapped-types';
import { CreateAccountMappingDto } from './create-account-mapping.dto';

export class UpdateAccountMappingDto extends PartialType(CreateAccountMappingDto) {}
