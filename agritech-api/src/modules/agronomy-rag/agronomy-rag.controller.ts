import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/action.enum';
import { AppAbility } from '../casl/casl-ability.factory';
import { AgronomyRagService } from './agronomy-rag.service';
import { SourcesService } from './sources.service';
import { RetrievedChunk } from './agronomy-rag.schemas';
import { RetrievalQueryDto } from './dto/retrieval-query.dto';
import { CreateAgronomySourceDto } from './dto/create-agronomy-source.dto';

@ApiTags('agronomy-rag')
@ApiBearerAuth()
@Controller('agronomy')
@UseGuards(JwtAuthGuard, OrganizationGuard, PoliciesGuard)
export class AgronomyRagController {
  constructor(
    private readonly agronomyRagService: AgronomyRagService,
    private readonly sourcesService: SourcesService,
  ) {}

  @Get('search')
  @ApiOperation({ summary: 'Search agronomy knowledge chunks' })
  @ApiQuery({ name: 'query', required: true, type: String, description: 'Search query' })
  @ApiQuery({ name: 'crop_type', required: false, type: String })
  @ApiQuery({ name: 'region', required: false, type: String, description: 'Comma-separated regions' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Retrieval results returned successfully' })
  async search(@Req() req: Request, @Query() dto: RetrievalQueryDto): Promise<RetrievedChunk[]> {
    const organizationId = req.headers['x-organization-id'] as string;
    const query = dto.query.trim();

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    if (!query) {
      throw new BadRequestException('Query is required');
    }

    return this.agronomyRagService.retrieve(
      {
        query,
        crop_type: dto.crop_type,
        region: dto.region,
        limit: dto.limit ?? 8,
      },
      organizationId,
    );
  }

  @Get('sources')
  @ApiOperation({ summary: 'List agronomy corpus sources' })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Manage, 'AgronomySource'))
  async listSources(@Req() req: Request) {
    const organizationId = (req.headers['x-organization-id'] as string) || null;
    return this.sourcesService.findAllWithStatus(organizationId);
  }

  @Post('sources')
  @ApiOperation({
    summary: 'Create an agronomy source and trigger synchronous ingestion',
  })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Manage, 'AgronomySource'))
  async createSource(
    @Req() req: Request,
    @Body() dto: CreateAgronomySourceDto,
  ) {
    const userId = (req as unknown as { user?: { id?: string } }).user?.id ?? null;

    return this.sourcesService.createAndIngest(
      {
        title: dto.title,
        author: dto.author ?? null,
        publisher: dto.publisher ?? null,
        doc_type: dto.doc_type ?? null,
        language: dto.language ?? null,
        region: dto.region ?? null,
        crop_type: dto.crop_type ?? null,
        season: dto.season ?? null,
        published_at: dto.published_at ?? null,
        source_url: dto.source_url ?? null,
        storage_path: dto.storage_path ?? null,
        chunk_size: dto.chunk_size,
        chunk_overlap: dto.chunk_overlap,
      },
      // v1: public corpus only regardless of caller org
      null,
      userId,
    );
  }

  @Delete('sources/:id')
  @ApiOperation({ summary: 'Delete an agronomy source (cascades chunks + citations)' })
  @ApiParam({ name: 'id' })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Manage, 'AgronomySource'))
  async deleteSource(@Param('id') id: string) {
    // v1 public-only: always delete from public corpus
    return this.sourcesService.remove(id, null);
  }
}
