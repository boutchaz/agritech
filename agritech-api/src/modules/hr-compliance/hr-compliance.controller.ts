import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { Action } from '../casl/action.enum';
import { Subject } from '../casl/subject.enum';
import { RequirePermission } from '../casl/permissions.decorator';
import { HrComplianceService } from './hr-compliance.service';
import { ApplyPresetDto, UpdateComplianceSettingsDto } from './dto';

@ApiTags('HR - Compliance')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, OrganizationGuard, PoliciesGuard)
@Controller('organizations/:organizationId/hr-compliance')
export class HrComplianceController {
  constructor(private readonly service: HrComplianceService) {}

  @Get()
  @RequirePermission(Action.Read, Subject.HR_COMPLIANCE)
  @ApiOperation({ summary: "Get organization's HR compliance settings" })
  @ApiParam({ name: 'organizationId' })
  async get(@Param('organizationId') organizationId: string) {
    return this.service.get(organizationId);
  }

  @Put()
  @RequirePermission(Action.Update, Subject.HR_COMPLIANCE)
  @ApiOperation({ summary: 'Update HR compliance settings (partial)' })
  async update(
    @Request() req: any,
    @Param('organizationId') organizationId: string,
    @Body() dto: UpdateComplianceSettingsDto,
  ) {
    return this.service.update(organizationId, req.user?.id ?? null, dto);
  }

  @Post('apply-preset')
  @RequirePermission(Action.Update, Subject.HR_COMPLIANCE)
  @ApiOperation({ summary: 'Apply a compliance preset (overwrites related fields)' })
  async applyPreset(
    @Request() req: any,
    @Param('organizationId') organizationId: string,
    @Body() dto: ApplyPresetDto,
  ) {
    return this.service.applyPreset(
      organizationId,
      req.user?.id ?? null,
      dto.preset,
    );
  }

  @Get('presets')
  @RequirePermission(Action.Read, Subject.HR_COMPLIANCE)
  @ApiOperation({ summary: 'List available compliance presets' })
  listPresets() {
    return this.service.listPresets();
  }

  @Get('summary')
  @RequirePermission(Action.Read, Subject.HR_COMPLIANCE)
  @ApiOperation({ summary: 'Human-readable summary of active compliance' })
  async summary(@Param('organizationId') organizationId: string) {
    return this.service.summary(organizationId);
  }
}
