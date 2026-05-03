import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { DatabaseService } from '../database/database.service';
import { ShareResourceDto } from './dto';
import { ShareService } from './share.service';

@ApiTags('share')
@ApiBearerAuth()
@Controller('share')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class ShareController {
  constructor(
    private readonly shareService: ShareService,
    private readonly databaseService: DatabaseService,
  ) {}

  @Get('resource-types')
  @ApiOperation({
    summary: 'List shareable resource types supported by the server',
  })
  list() {
    return { types: this.shareService.listResolvers() };
  }

  @Post()
  @ApiOperation({
    summary: 'Share a resource (invoice, quote, …) via email or WhatsApp',
  })
  @ApiResponse({
    status: 200,
    description: 'Share result. success=false includes error.',
  })
  async share(
    @Headers('x-organization-id') organizationId: string,
    @Req() req: any,
    @Body() dto: ShareResourceDto,
  ) {
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    return this.shareService.share(organizationId, req.user?.id ?? null, dto);
  }

  @Get('history')
  @ApiOperation({
    summary: 'List recent share attempts for the organization or a resource',
  })
  @ApiQuery({ name: 'resource_type', required: false })
  @ApiQuery({ name: 'resource_id', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async history(
    @Headers('x-organization-id') organizationId: string,
    @Query('resource_type') resourceType?: string,
    @Query('resource_id') resourceId?: string,
    @Query('limit') limit?: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    const supabase = this.databaseService.getAdminClient();
    let query = supabase
      .from('share_log')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(Math.min(parseInt(limit ?? '50', 10) || 50, 200));

    if (resourceType) query = query.eq('resource_type', resourceType);
    if (resourceId) query = query.eq('resource_id', resourceId);

    const { data, error } = await query;
    if (error) {
      throw new BadRequestException(error.message);
    }
    return { data: data ?? [] };
  }
}
