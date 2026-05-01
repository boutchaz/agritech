import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InternalAdminGuard } from '../admin/guards/internal-admin.guard';
import { AgronomyRagService } from './agronomy-rag.service';
import { SourcesService } from './sources.service';
import { RetrievedChunk } from './agronomy-rag.schemas';
import { CreateAgronomySourceDto } from './dto/create-agronomy-source.dto';
import { RetrievalQueryDto } from './dto/retrieval-query.dto';

@ApiTags('admin-agronomy-rag')
@ApiBearerAuth()
@Controller('admin/agronomy')
@UseGuards(JwtAuthGuard, InternalAdminGuard)
export class AgronomyRagAdminController {
  constructor(
    private readonly agronomyRagService: AgronomyRagService,
    private readonly sourcesService: SourcesService,
  ) {}

  @Get('sources')
  @ApiOperation({ summary: 'List agronomy corpus sources (admin, public corpus)' })
  async listSources() {
    return this.sourcesService.findAllWithStatus(null);
  }

  @Post('sources')
  @ApiOperation({ summary: 'Create an agronomy source and ingest it (admin, public corpus)' })
  async createSource(@Req() req: Request, @Body() dto: CreateAgronomySourceDto) {
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
      null,
      userId,
    );
  }

  @Delete('sources/:id')
  @ApiOperation({ summary: 'Delete an agronomy source (admin, public corpus)' })
  @ApiParam({ name: 'id' })
  async deleteSource(@Param('id') id: string) {
    return this.sourcesService.remove(id, null);
  }

  @Post('test-chat')
  @ApiOperation({
    summary: 'Run a retrieval test against the public agronomy corpus. Returns ranked chunks.',
  })
  @ApiResponse({ status: 200, description: 'Retrieved chunks returned successfully' })
  async testChat(@Body() dto: RetrievalQueryDto): Promise<{ chunks: RetrievedChunk[] }> {
    const query = dto.query?.trim();
    if (!query) {
      throw new BadRequestException('Query is required');
    }

    const chunks = await this.agronomyRagService.retrieve(
      {
        query,
        crop_type: dto.crop_type,
        region: dto.region,
        limit: dto.limit ?? 8,
      },
      undefined,
    );

    return { chunks };
  }
}
