import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { SyncService } from './sync.service';
import {
  SyncFlushRequestDto,
  SyncFlushResponseDto,
} from './dto/sync-flush.dto';

@ApiTags('sync')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganizationGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('flush')
  @ApiOperation({
    summary: 'Drain a batch of offline outbox items',
    description:
      'Re-issues each item as an in-process HTTP request so existing controllers, ' +
      'guards, and the offline interceptor (idempotency / optimistic-lock) handle them. ' +
      'Items are processed in topological order over `deps`. One bad item does not abort the batch.',
  })
  async flush(
    @Body() body: SyncFlushRequestDto,
    @Req() req: ExpressRequest,
  ): Promise<SyncFlushResponseDto> {
    const headers: Record<string, string> = {};
    const auth = req.headers.authorization;
    if (auth) headers['Authorization'] = auth;
    const orgId = req.headers['x-organization-id'];
    if (typeof orgId === 'string') headers['X-Organization-Id'] = orgId;
    const cookie = req.headers.cookie;
    if (cookie) headers['Cookie'] = cookie;

    const proto = (req.headers['x-forwarded-proto'] as string) || (req.protocol ?? 'http');
    const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost';
    const baseUrl = `${proto}://${host}`;

    return this.syncService.flush(body, headers, baseUrl);
  }
}
