import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class HeroStatDto {
  @IsString()
  @MaxLength(40)
  value!: string;

  @IsString()
  @MaxLength(80)
  label!: string;
}

export class PartnerDto {
  @IsString()
  @MaxLength(80)
  name!: string;
}

export class UpdateLandingSettingsDto {
  @ApiPropertyOptional({ type: [HeroStatDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => HeroStatDto)
  hero_stats?: HeroStatDto[];

  @ApiPropertyOptional({ type: [PartnerDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(24)
  @ValidateNested({ each: true })
  @Type(() => PartnerDto)
  partners?: PartnerDto[];
}
