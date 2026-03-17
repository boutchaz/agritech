import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { HealthService, DeepHealthResult } from './health.service';
import { HealthCronService } from './health-cron.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly healthCronService: HealthCronService,
  ) {}

  @Get('deep')
  @Public()
  @ApiOperation({ summary: 'Deep health check — probes all external dependencies' })
  @ApiResponse({ status: 200, description: 'All services healthy' })
  @ApiResponse({ status: 503, description: 'One or more services are down' })
  async deepCheck(): Promise<DeepHealthResult> {
    return this.healthService.checkAll();
  }

  @Get('status')
  @Public()
  @ApiOperation({ summary: 'Last known service states from background probe' })
  @ApiResponse({ status: 200, description: 'Current service states' })
  getStatus(): Record<string, unknown> {
    return {
      timestamp: new Date().toISOString(),
      services: this.healthCronService.getServiceStates(),
    };
  }
}
