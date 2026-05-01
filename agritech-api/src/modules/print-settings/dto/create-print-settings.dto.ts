import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreatePrintSettingsDto {
  @ApiPropertyOptional({ description: 'Paper size' })
  @IsOptional()
  @IsString()
  paper_size?: string;

  @ApiPropertyOptional({ description: 'Use compact tables in PDFs' })
  @IsOptional()
  @IsBoolean()
  compact_tables?: boolean;

  @ApiPropertyOptional({ description: 'Repeat header and footer on every page' })
  @IsOptional()
  @IsBoolean()
  repeat_header_footer?: boolean;
}
