import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateHolidayListDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsInt() @Min(1900) year!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

export class HolidayItemDto {
  @ApiProperty() @IsDateString() date!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name_fr?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() name_ar?: string;
  @ApiPropertyOptional({ enum: ['public', 'optional', 'weekly_off'] })
  @IsOptional()
  @IsIn(['public', 'optional', 'weekly_off'])
  holiday_type?: 'public' | 'optional' | 'weekly_off';
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

export class AddHolidaysDto {
  @ApiProperty({ type: [HolidayItemDto] })
  @IsArray()
  @ArrayNotEmpty()
  holidays!: HolidayItemDto[];
}
