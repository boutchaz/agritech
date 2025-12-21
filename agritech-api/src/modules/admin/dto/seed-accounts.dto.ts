import { IsString, IsUUID, IsOptional, IsEnum } from 'class-validator';

export enum ChartOfAccountsType {
  MOROCCAN = 'moroccan',
  IFRS = 'ifrs',
  US_GAAP = 'us_gaap',
  CUSTOM = 'custom',
}

export class SeedAccountsDto {
  @IsUUID('4')
  organizationId: string;

  @IsEnum(ChartOfAccountsType)
  chartType: ChartOfAccountsType;

  @IsString()
  @IsOptional()
  version?: string;
}

export class SeedAccountsResultDto {
  success: boolean;
  organizationId: string;
  chartType: string;
  accountsCreated: number;
  message: string;
  jobId?: string;
}
