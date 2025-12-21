import { IsString, IsBoolean, IsOptional, IsArray, IsUUID, IsEnum } from 'class-validator';
import { ReferenceDataTable } from './import-reference-data.dto';

export class PublishReferenceDataDto {
  @IsEnum(ReferenceDataTable)
  table: ReferenceDataTable;

  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];

  @IsBoolean()
  @IsOptional()
  unpublish?: boolean;
}

export class PublishResultDto {
  success: boolean;
  publishedCount: number;
  unpublishedCount: number;
  errors: Array<{ id: string; error: string }>;
}
