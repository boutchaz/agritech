import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { OrganizationGroupsService } from './organization-groups.service';
import {
  CreateOrganizationGroupDto,
  UpdateOrganizationGroupDto,
  AddGroupMemberDto,
} from './dto/create-organization-group.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { ModuleEntitlementGuard } from '../../common/guards/module-entitlement.guard';
import { RequireModule } from '../../common/decorators/require-module.decorator';

@ApiTags('organization-groups')
@Controller('organization-groups')
@RequireModule('accounting')
@UseGuards(JwtAuthGuard, OrganizationGuard, ModuleEntitlementGuard)
@ApiBearerAuth()
export class OrganizationGroupsController {
  constructor(private readonly service: OrganizationGroupsService) {}

  @Get()
  @ApiOperation({ summary: 'List organization groups owned by the current org' })
  @ApiResponse({ status: 200 })
  async findAll(@Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    return this.service.findAll(organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create an organization group (Group Company)' })
  @ApiResponse({ status: 201 })
  async create(@Req() req: any, @Body() dto: CreateOrganizationGroupDto) {
    const organizationId = req.headers['x-organization-id'];
    return this.service.create(organizationId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single organization group' })
  @ApiParam({ name: 'id' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.service.findOne(id, organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an organization group' })
  @ApiParam({ name: 'id' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationGroupDto,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.service.update(id, organizationId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an organization group' })
  @ApiParam({ name: 'id' })
  async remove(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    await this.service.remove(id, organizationId);
    return { success: true };
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List member organizations of a group' })
  @ApiParam({ name: 'id' })
  async listMembers(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.service.listMembers(id, organizationId);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add an organization to a group' })
  @ApiParam({ name: 'id' })
  async addMember(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: AddGroupMemberDto,
  ) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user?.id || req.user?.sub;
    return this.service.addMember(id, organizationId, dto.organization_id, userId);
  }

  @Delete(':id/members/:orgId')
  @ApiOperation({ summary: 'Remove an organization from a group' })
  @ApiParam({ name: 'id' })
  @ApiParam({ name: 'orgId' })
  async removeMember(
    @Req() req: any,
    @Param('id') id: string,
    @Param('orgId') orgId: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    await this.service.removeMember(id, organizationId, orgId);
    return { success: true };
  }
}
