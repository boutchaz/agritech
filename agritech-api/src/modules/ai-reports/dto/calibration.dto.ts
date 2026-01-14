import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsArray, IsString } from 'class-validator';

export class CalibrationStatusDto {
  @ApiProperty({ description: 'Overall calibration status' })
  status: 'ready' | 'warning' | 'blocked';

  @ApiProperty({ description: 'Data accuracy score (0-100)' })
  accuracy: number;

  @ApiProperty({ description: 'List of missing data sources' })
  missingData: string[];

  @ApiProperty({ description: 'Recommendations for improving data quality' })
  recommendations: string[];

  @ApiProperty({ description: 'Last validation timestamp' })
  lastValidated: string;

  @ApiProperty({ description: 'Next auto-refresh timestamp' })
  nextAutoRefresh?: string;

  @ApiProperty({ description: 'Satellite data status' })
  satellite: {
    status: 'available' | 'stale' | 'missing';
    imageCount: number;
    latestDate: string | null;
    ageDays: number | null;
    cloudCoverage: number | null;
    isValid: boolean;
  };

  @ApiProperty({ description: 'Weather data status' })
  weather: {
    status: 'available' | 'incomplete' | 'missing';
    completeness: number;
    latestDate: string | null;
    ageHours: number | null;
    isValid: boolean;
  };

  @ApiProperty({ description: 'Soil analysis status' })
  soil: {
    present: boolean;
    latestDate: string | null;
    ageDays: number | null;
    isValid: boolean;
  };

  @ApiProperty({ description: 'Water analysis status' })
  water: {
    present: boolean;
    latestDate: string | null;
    ageDays: number | null;
    isValid: boolean;
  };

  @ApiProperty({ description: 'Plant analysis status' })
  plant: {
    present: boolean;
    latestDate: string | null;
    ageDays: number | null;
    isValid: boolean;
  };
}

export class CalibrateRequestDto {
  @ApiPropertyOptional({ description: 'Force refresh all data' })
  @IsOptional()
  @IsBoolean()
  forceRefetch?: boolean;

  @ApiPropertyOptional({ description: 'Auto-fetch missing data' })
  @IsOptional()
  @IsBoolean()
  autoFetch?: boolean;

  @ApiPropertyOptional({ description: 'Start date for data range' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for data range' })
  @IsOptional()
  @IsString()
  endDate?: string;
}

export class FetchDataRequestDto {
  @ApiProperty({ description: 'Data sources to fetch', type: [String] })
  @IsArray()
  dataSources: ('satellite' | 'weather')[];
}
