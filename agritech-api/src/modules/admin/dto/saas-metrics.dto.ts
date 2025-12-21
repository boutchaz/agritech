import { IsOptional, IsString, IsDateString } from 'class-validator';

export class SaasMetricsQueryDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}

export class SaasMetricsDto {
  totalOrganizations: number;
  activeOrganizations7d: number;
  activeOrganizations30d: number;
  newOrganizations7d: number;
  newOrganizations30d: number;
  totalUsers: number;
  dau: number;
  wau: number;
  mau: number;
  totalMrr: number;
  totalArr: number;
  arpu: number;
  churnRate: number;
  activationRate: number;
  planBreakdown: {
    planType: string;
    count: number;
    mrr: number;
  }[];
}

export class OrgUsageDto {
  id: string;
  name: string;
  countryCode: string;
  createdAt: string;
  isActive: boolean;
  planType: string;
  subscriptionStatus: string;
  mrr: number;
  arr: number;
  farmsCount: number;
  parcelsCount: number;
  usersCount: number;
  storageUsedMb: number;
  lastActivityAt: string;
  events7d: number;
  events30d: number;
}

export class OrgUsageQueryDto {
  @IsString()
  @IsOptional()
  planType?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @IsString()
  @IsOptional()
  limit?: string;

  @IsString()
  @IsOptional()
  offset?: string;
}
