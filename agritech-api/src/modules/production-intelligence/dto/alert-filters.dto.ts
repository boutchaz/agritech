import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsString, IsEnum } from 'class-validator';

export class AlertFiltersDto {
  @ApiPropertyOptional({ description: 'Filter by farm ID' })
  @IsOptional()
  @IsUUID()
  farm_id?: string;

  @ApiPropertyOptional({ description: 'Filter by parcel ID' })
  @IsOptional()
  @IsUUID()
  parcel_id?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by status',
    enum: ['active', 'acknowledged', 'resolved']
  })
  @IsOptional()
  @IsEnum(['active', 'acknowledged', 'resolved'])
  status?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by severity',
    enum: ['info', 'warning', 'critical']
  })
  @IsOptional()
  @IsEnum(['info', 'warning', 'critical'])
  severity?: string;

  @ApiPropertyOptional({ description: 'Filter by alert type' })
  @IsOptional()
  @IsString()
  alert_type?: string;
}
