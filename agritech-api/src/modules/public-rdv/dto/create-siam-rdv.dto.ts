import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateSiamRdvDto {
  @ApiProperty({ example: 'Ahmed Benali' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nom: string;

  @ApiPropertyOptional({ example: 'Domaine Al Waha' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  entreprise?: string;

  @ApiProperty({ example: '+212612345678' })
  @IsString()
  @MinLength(8)
  @MaxLength(30)
  @Matches(/^\+?[0-9\s\-()]{8,30}$/, { message: 'Phone number must contain only digits, spaces, dashes, or parentheses' })
  tel: string;

  @ApiPropertyOptional({ example: 'ahmed@domaine.ma' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '50 - 150 ha' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  surface?: string;

  @ApiPropertyOptional({ example: 'Meknes-Fes' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  region?: string;

  @ApiPropertyOptional({ example: ['Olivier', 'Agrumes'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  culture?: string[];

  @ApiPropertyOptional({ example: 'Fruits rouges' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  culture_autre?: string;

  @ApiProperty({ example: '20/04-14:00' })
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  creneau: string;

  @ApiPropertyOptional({ example: 'siam-2026' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  source?: string;
}
