import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { Action } from '../casl/action.enum';
import { Subject } from '../casl/subject.enum';
import { RequirePermission } from '../casl/permissions.decorator';
import { WorkerDocumentsService } from './worker-documents.service';
import {
  CreateWorkerDocumentDto,
  UpdateWorkerDocumentDto,
} from './dto/create-worker-document.dto';

@ApiTags('HR - Worker Documents')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, OrganizationGuard, PoliciesGuard)
@Controller('organizations/:organizationId/worker-documents')
export class WorkerDocumentsController {
  constructor(private readonly service: WorkerDocumentsService) {}

  @Get()
  @RequirePermission(Action.Read, Subject.WORKER_DOCUMENT)
  list(
    @Param('organizationId') organizationId: string,
    @Query('worker_id') workerId?: string,
    @Query('document_type') documentType?: string,
    @Query('expiring_within_days') expiringWithinDays?: string,
  ) {
    return this.service.list(organizationId, {
      worker_id: workerId,
      document_type: documentType,
      expiring_within_days: expiringWithinDays ? parseInt(expiringWithinDays, 10) : undefined,
    });
  }

  @Get(':id')
  @RequirePermission(Action.Read, Subject.WORKER_DOCUMENT)
  getOne(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.getOne(organizationId, id);
  }

  @Post()
  @RequirePermission(Action.Create, Subject.WORKER_DOCUMENT)
  @ApiOperation({ summary: 'Create or replace a worker document (one per type per worker)' })
  create(
    @Request() req: any,
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateWorkerDocumentDto,
  ) {
    return this.service.create(organizationId, req.user?.id ?? null, dto);
  }

  @Put(':id')
  @RequirePermission(Action.Update, Subject.WORKER_DOCUMENT)
  update(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWorkerDocumentDto,
  ) {
    return this.service.update(organizationId, id, dto);
  }

  @Put(':id/verify')
  @RequirePermission(Action.Update, Subject.WORKER_DOCUMENT)
  verify(
    @Request() req: any,
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.verify(organizationId, req.user?.id ?? null, id);
  }

  @Delete(':id')
  @RequirePermission(Action.Delete, Subject.WORKER_DOCUMENT)
  remove(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(organizationId, id);
  }
}
