import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AgronomySource, AgronomySourceSchema, normalizeStringList, serializeJsonb } from './agronomy-rag.schemas';
import { AgronomyRagService } from './agronomy-rag.service';

export interface CreateAgronomySourceInput {
  title: string;
  author?: string | null;
  publisher?: string | null;
  doc_type?: string | null;
  language?: string | null;
  region?: string[] | string | null;
  crop_type?: string[] | string | null;
  season?: string[] | string | null;
  published_at?: string | null;
  source_url?: string | null;
  storage_path?: string | null;
}

export interface CreateAndIngestInput extends CreateAgronomySourceInput {
  chunk_size?: number;
  chunk_overlap?: number;
}

export interface AgronomySourceWithStatus extends AgronomySource {
  ingestion_status: 'pending' | 'running' | 'ready' | 'failed';
  ingestion_error: string | null;
  chunk_count: number;
}

interface AgronomySourceRow {
  id: string;
  title: string;
  author: string | null;
  publisher: string | null;
  doc_type: string | null;
  language: string | null;
  region: unknown;
  crop_type: unknown;
  season: unknown;
  published_at: string | null;
  source_url: string | null;
  storage_path: string | null;
}

interface AgronomySourceRowWithStatus extends AgronomySourceRow {
  ingestion_status: 'pending' | 'running' | 'ready' | 'failed';
  ingestion_error: string | null;
  chunk_count: number;
}

@Injectable()
export class SourcesService {
  private readonly logger = new Logger(SourcesService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly agronomyRagService: AgronomyRagService,
  ) {}

  async createAndIngest(
    data: CreateAndIngestInput,
    organizationId: string | null,
    ingestedBy: string | null,
  ): Promise<AgronomySourceWithStatus> {
    if (!data.storage_path && !data.source_url) {
      throw new InternalServerErrorException('storage_path or source_url required');
    }

    const client = this.databaseService.getAdminClient();
    const { data: created, error } = await client
      .from('agronomy_sources')
      .insert({
        organization_id: organizationId,
        title: data.title,
        author: data.author ?? null,
        publisher: data.publisher ?? null,
        doc_type: data.doc_type ?? null,
        language: data.language ?? null,
        region: data.region ?? null,
        crop_type: data.crop_type ?? null,
        season: data.season ?? null,
        published_at: data.published_at ?? null,
        source_url: data.source_url ?? null,
        storage_path: data.storage_path ?? null,
        ingestion_status: 'running',
        ingested_by: ingestedBy,
      })
      .select('id')
      .single();

    if (error || !created) {
      throw new InternalServerErrorException(error?.message || 'Failed to create agronomy source');
    }

    const sourceId = created.id as string;

    try {
      const result = await this.agronomyRagService.ingestIntoSource(
        sourceId,
        {
          storage_path: data.storage_path ?? undefined,
          source_url: data.source_url ?? undefined,
          chunk_size: data.chunk_size,
          chunk_overlap: data.chunk_overlap,
        },
        organizationId ?? undefined,
      );

      await client
        .from('agronomy_sources')
        .update({
          ingestion_status: 'ready',
          ingestion_error: null,
          chunk_count: result.inserted_chunks,
          ingested_at: new Date().toISOString(),
        })
        .eq('id', sourceId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Ingestion failed for source ${sourceId}: ${message}`);
      await client
        .from('agronomy_sources')
        .update({
          ingestion_status: 'failed',
          ingestion_error: message.slice(0, 1000),
        })
        .eq('id', sourceId);
      throw err instanceof Error
        ? err
        : new InternalServerErrorException(`Ingestion failed: ${message}`);
    }

    return this.findOneWithStatus(sourceId, organizationId);
  }

  async findAllWithStatus(organizationId: string | null): Promise<AgronomySourceWithStatus[]> {
    const client = this.databaseService.getAdminClient();
    let query = client
      .from('agronomy_sources')
      .select(
        'id, title, author, publisher, doc_type, language, region, crop_type, season, published_at, source_url, storage_path, ingestion_status, ingestion_error, chunk_count',
      )
      .order('ingested_at', { ascending: false });

    query = organizationId
      ? query.or(`organization_id.is.null,organization_id.eq.${organizationId}`)
      : query.is('organization_id', null);

    const { data, error } = await query;
    if (error) {
      throw new InternalServerErrorException(error.message || 'Failed to fetch agronomy sources');
    }

    return (data || []).map((row) => this.mapSourceRowWithStatus(row as AgronomySourceRowWithStatus));
  }

  async findOneWithStatus(
    id: string,
    organizationId: string | null,
  ): Promise<AgronomySourceWithStatus> {
    const client = this.databaseService.getAdminClient();
    let query = client
      .from('agronomy_sources')
      .select(
        'id, title, author, publisher, doc_type, language, region, crop_type, season, published_at, source_url, storage_path, ingestion_status, ingestion_error, chunk_count',
      )
      .eq('id', id);

    query = organizationId
      ? query.or(`organization_id.is.null,organization_id.eq.${organizationId}`)
      : query.is('organization_id', null);

    const { data, error } = await query.maybeSingle();
    if (error) {
      throw new InternalServerErrorException(error.message || 'Failed to fetch agronomy source');
    }
    if (!data) {
      throw new NotFoundException('Agronomy source not found');
    }
    return this.mapSourceRowWithStatus(data as AgronomySourceRowWithStatus);
  }

  async findAll(organizationId: string): Promise<AgronomySource[]> {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('agronomy_sources')
      .select('id, title, author, publisher, doc_type, language, region, crop_type, season, published_at, source_url, storage_path')
      .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException(error.message || 'Failed to fetch agronomy sources');
    }

    return (data || []).map((row) => this.mapSourceRow(row as AgronomySourceRow));
  }

  async findOne(id: string, organizationId: string): Promise<AgronomySource> {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('agronomy_sources')
      .select('id, title, author, publisher, doc_type, language, region, crop_type, season, published_at, source_url, storage_path, organization_id')
      .eq('id', id)
      .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(error.message || 'Failed to fetch agronomy source');
    }

    if (!data) {
      throw new NotFoundException('Agronomy source not found');
    }

    return this.mapSourceRow(data as AgronomySourceRow);
  }

  async remove(id: string, organizationId: string | null): Promise<{ success: true; id: string }> {
    await this.findOneWithStatus(id, organizationId);

    await this.databaseService.executeInPgTransaction(async (client) => {
      // ON DELETE CASCADE handles chunks + citations
      const result = organizationId
        ? await client.query(
            `DELETE FROM agronomy_sources WHERE id = $1 AND organization_id = $2`,
            [id, organizationId],
          )
        : await client.query(
            `DELETE FROM agronomy_sources WHERE id = $1 AND organization_id IS NULL`,
            [id],
          );

      if ((result.rowCount ?? 0) === 0) {
        throw new NotFoundException('Agronomy source not found or not removable');
      }
    });

    return { success: true, id };
  }

  private mapSourceRow(row: AgronomySourceRow): AgronomySource {
    return serializeJsonb(
      AgronomySourceSchema,
      {
        id: row.id,
        title: row.title,
        author: row.author,
        publisher: row.publisher,
        doc_type: row.doc_type,
        language: row.language,
        region: normalizeStringList(row.region, `agronomy_sources.region:${row.id}`),
        crop_type: normalizeStringList(row.crop_type, `agronomy_sources.crop_type:${row.id}`),
        season: normalizeStringList(row.season, `agronomy_sources.season:${row.id}`),
        published_at: row.published_at,
        source_url: row.source_url,
        storage_path: row.storage_path,
      },
      `agronomy_sources:${row.id}`,
    );
  }

  private mapSourceRowWithStatus(row: AgronomySourceRowWithStatus): AgronomySourceWithStatus {
    const base = this.mapSourceRow(row);
    return {
      ...base,
      ingestion_status: row.ingestion_status,
      ingestion_error: row.ingestion_error,
      chunk_count: row.chunk_count ?? 0,
    };
  }
}
