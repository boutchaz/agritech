import { Controller, Get, Post, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InternalAdminGuard } from './guards/internal-admin.guard';
import { CronRegistryService } from './cron-registry.service';

@ApiTags('admin/cron-jobs')
@ApiBearerAuth()
@Controller('admin/cron-jobs')
@UseGuards(JwtAuthGuard, InternalAdminGuard)
export class CronJobsController {
  constructor(private readonly cronRegistry: CronRegistryService) {}

  @Get()
  @ApiOperation({ summary: 'List all registered cron jobs with status' })
  list() {
    return this.cronRegistry.listAll();
  }

  @Post(':name/trigger')
  @ApiOperation({ summary: 'Manually trigger a cron job by name' })
  trigger(@Param('name') name: string) {
    const success = this.cronRegistry.triggerJob(name);
    if (!success) {
      throw new BadRequestException(`Cron job "${name}" not found or failed to trigger`);
    }
    return { message: `Cron job "${name}" triggered` };
  }

  @Post(':name/stop')
  @ApiOperation({ summary: 'Stop a cron job' })
  stop(@Param('name') name: string) {
    const success = this.cronRegistry.stopJob(name);
    if (!success) {
      throw new BadRequestException(`Cron job "${name}" not found or failed to stop`);
    }
    return { message: `Cron job "${name}" stopped` };
  }

  @Post(':name/start')
  @ApiOperation({ summary: 'Start a stopped cron job' })
  start(@Param('name') name: string) {
    const success = this.cronRegistry.startJob(name);
    if (!success) {
      throw new BadRequestException(`Cron job "${name}" not found or failed to start`);
    }
    return { message: `Cron job "${name}" started` };
  }
}
