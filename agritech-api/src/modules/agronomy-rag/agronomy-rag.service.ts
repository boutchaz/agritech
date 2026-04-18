import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { DatabaseService } from '../database/database.service';
import {
  AgronomySource,
  AgronomySourceSchema,
  CitationMarker,
  RetrievedChunk,
  RetrievedChunkSchema,
  RetrievalQuery,
  RetrievalQuerySchema,
  normalizeStringList,
  parseJsonb,
  serializeJsonb,
} from './agronomy-rag.schemas';

const EmbedResponseSchema = z.object({
  embeddings: z.array(z.array(z.number())),
});

const RerankItemSchema = z.object({
  text: z.string(),
  score: z.number(),
});

const RerankResponseSchema = z.object({
  ranked: z.array(RerankItemSchema),
});

const IngestChunkSchema = z.object({
  id: z.string().optional(),
  chunk_index: z.number().int(),
  page: z.number().int().nullable().optional(),
  text: z.string(),
  embedding: z.array(z.number()),
});

const IngestResponseSchema = z.object({
  chunks: z.array(IngestChunkSchema),
});

interface DenseSearchRow {
  id: string;
  source_id: string;
  text: string;
  page: number | null;
  dense_score: number | null;
}

interface Bm25SearchRow {
  id: string;
  source_id: string;
  text: string;
  page: number | null;
  bm25_score: number | null;
}

interface SourceRow {
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

interface RankedChunkCandidate {
  id: string;
  source_id: string;
  text: string;
  page: number | null;
  dense_score: number | null;
  bm25_score: number | null;
  rrf_score: number;
}

export interface IngestResult {
  source_id: string;
  inserted_chunks: number;
}

@Injectable()
export class AgronomyRagService {
  private readonly logger = new Logger(AgronomyRagService.name);
  private readonly satelliteBaseUrl: string;
  private readonly internalServiceToken: string;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {
    const url = this.configService.get<string>('SATELLITE_SERVICE_URL') || 'http://localhost:8001';
    this.satelliteBaseUrl = url.replace(/\/+$/, '');
    this.internalServiceToken = (this.configService.get<string>('INTERNAL_SERVICE_TOKEN') ?? '').trim();
    this.logger.log(`Agronomy RAG targeting: ${this.satelliteBaseUrl}`);
  }

  async retrieve(query: RetrievalQuery, organizationId?: string): Promise<RetrievedChunk[]> {
    const normalizedQuery = serializeJsonb(
      RetrievalQuerySchema,
      {
        ...query,
        query: query.query,
        limit: query.limit ?? 8,
      },
      'agronomy-rag.retrieve.query',
    );

    return this.retrieveInternal(normalizedQuery, organizationId ?? null, normalizedQuery.limit, 50);
  }

  async retrieveWithRerank(query: RetrievalQuery, organizationId?: string): Promise<RetrievedChunk[]> {
    const normalizedQuery = serializeJsonb(
      RetrievalQuerySchema,
      {
        ...query,
        query: query.query,
        limit: query.limit ?? 8,
      },
      'agronomy-rag.retrieveWithRerank.query',
    );

    const candidates = await this.retrieveInternal(normalizedQuery, organizationId ?? null, 50, 50);
    if (candidates.length === 0) {
      return [];
    }

    const rerankResponse = await this.callFastApi('/agronomy/rerank', {
      query: normalizedQuery.query,
      candidates: candidates.map((candidate) => candidate.text),
    });

    const parsed = RerankResponseSchema.parse(rerankResponse);

    const textScoreMap = new Map<string, number>();
    for (const item of parsed.ranked) {
      textScoreMap.set(item.text, item.score);
    }

    const reranked = candidates
      .map((candidate) => ({
        ...candidate,
        rerank_score: textScoreMap.get(candidate.text) ?? null,
      }))
      .sort((left, right) => {
        const leftScore = left.rerank_score ?? Number.NEGATIVE_INFINITY;
        const rightScore = right.rerank_score ?? Number.NEGATIVE_INFINITY;
        if (leftScore === rightScore) {
          return right.rrf_score - left.rrf_score;
        }
        return rightScore - leftScore;
      })
      .slice(0, normalizedQuery.limit);

    return reranked.map((chunk) =>
      serializeJsonb(
        RetrievedChunkSchema,
        {
          ...chunk,
          rerank_score: chunk.rerank_score,
          source: chunk.source,
        },
        `agronomy-rag.reranked:${chunk.id}`,
      ),
    );
  }

  buildSourceContext(chunks: RetrievedChunk[]): string {
    if (chunks.length === 0) {
      return '<sources></sources>';
    }

    const lines = chunks.map((chunk, index) => {
      const marker = `[S${index + 1}]`;
      const title = chunk.source.title;
      const publisher = chunk.source.publisher ? `${chunk.source.publisher}` : 'Unknown publisher';
      const pagePart = chunk.page != null ? `, p.${chunk.page}` : '';
      const excerpt = chunk.text.replace(/\s+/g, ' ').trim().substring(0, 400);
      return `${marker} ${title} (${publisher}${pagePart}): "${excerpt}"`;
    });

    return `<sources>\n${lines.join('\n')}\n</sources>`;
  }

  parseCitationMarkers(llmOutput: string): CitationMarker[] {
    const matches = llmOutput.matchAll(/\[(S\d+)\]/g);
    const seen = new Set<number>();
    return Array.from(matches).map((match) => {
      const marker = `[${match[1]}]`;
      const ordinal = Number.parseInt(match[1].slice(1), 10);
      return { marker, ordinal } as const;
    }).filter((item) => {
      if (seen.has(item.ordinal)) return false;
      seen.add(item.ordinal);
      return true;
    }).map((item) =>
      serializeJsonb(
        z.object({
          marker: z.string().regex(/^\[S\d+\]$/),
          ordinal: z.number().int().min(1),
        }),
        { marker: item.marker, ordinal: item.ordinal },
        `agronomy-rag.citation:${item.marker}`,
      ),
    );
  }

  async ingestIntoSource(
    sourceId: string,
    input: { storage_path?: string; source_url?: string; chunk_size?: number; chunk_overlap?: number },
    organizationId?: string,
  ): Promise<IngestResult> {
    if (!input.storage_path && !input.source_url) {
      throw new Error('ingestIntoSource requires storage_path or source_url');
    }

    const ingestionResponse = await this.callFastApi(
      '/agronomy/ingest',
      {
        storage_path: input.storage_path,
        source_url: input.source_url,
        chunk_size: input.chunk_size ?? 600,
        chunk_overlap: input.chunk_overlap ?? 80,
      },
      organizationId ?? null,
      300_000,
    );
    const parsed = IngestResponseSchema.parse(ingestionResponse);

    return this.databaseService.executeInPgTransaction(async (client) => {
      await client.query('DELETE FROM agronomy_chunks WHERE source_id = $1', [sourceId]);

      for (const chunk of parsed.chunks) {
        await client.query(
          `INSERT INTO agronomy_chunks (id, source_id, chunk_index, page, text, embedding)
           VALUES ($1, $2, $3, $4, $5, $6::vector)`,
          [
            chunk.id ?? randomUUID(),
            sourceId,
            chunk.chunk_index,
            chunk.page ?? null,
            chunk.text,
            this.toPgVector(chunk.embedding),
          ],
        );
      }

      return {
        source_id: sourceId,
        inserted_chunks: parsed.chunks.length,
      };
    });
  }

  private async retrieveInternal(
    query: RetrievalQuery,
    organizationId: string | null,
    finalLimit: number,
    candidateLimit: number,
  ): Promise<RetrievedChunk[]> {
    const embedResponse = await this.callFastApi('/agronomy/embed', { texts: [query.query], input_type: 'query' }, organizationId);
    const parsedEmbedding = EmbedResponseSchema.parse(embedResponse);
    const embeddingVector = this.toPgVector(parsedEmbedding.embeddings[0]);
    const pool = this.databaseService.getPgPool();

    const sourceFilter = this.buildSourceFilter(query, organizationId);

    const densePromise = pool.query<DenseSearchRow>(
      `SELECT id, source_id, text, page, 1 - (embedding <=> $1::vector) AS dense_score
       FROM agronomy_chunks
       WHERE source_id IN (
         SELECT id
         FROM agronomy_sources
         WHERE (organization_id IS NULL OR organization_id = $2)
           ${sourceFilter.sql}
       )
       ORDER BY embedding <=> $1::vector
       LIMIT ${candidateLimit}`,
      [embeddingVector, organizationId, ...sourceFilter.params],
    );

    const bm25Promise = pool.query<Bm25SearchRow>(
      `SELECT id, source_id, text, page, ts_rank(tsv, plainto_tsquery('french', $1)) AS bm25_score
       FROM agronomy_chunks
       WHERE tsv @@ plainto_tsquery('french', $1)
         AND source_id IN (
           SELECT id
           FROM agronomy_sources
           WHERE (organization_id IS NULL OR organization_id = $2)
             ${sourceFilter.sql}
         )
       ORDER BY bm25_score DESC
       LIMIT ${candidateLimit}`,
      [query.query, organizationId, ...sourceFilter.params],
    );

    const [denseRows, bm25Rows] = await Promise.all([densePromise, bm25Promise]);
    const fusedCandidates = this.fuseByRrf(denseRows.rows, bm25Rows.rows);
    if (fusedCandidates.length === 0) {
      return [];
    }

    const sourceIds = Array.from(new Set(fusedCandidates.map((candidate) => candidate.source_id)));
    const sources = await this.fetchSources(sourceIds, pool);

    const filtered = fusedCandidates
      .map((candidate) => {
        const source = sources.get(candidate.source_id);
        if (!source) return null;
        return serializeJsonb(
          RetrievedChunkSchema,
          {
            ...candidate,
            source,
          },
          `agronomy-rag.retrieved:${candidate.id}`,
        );
      })
      .filter((candidate): candidate is RetrievedChunk => Boolean(candidate))
      .slice(0, finalLimit);

    return filtered;
  }

  private fuseByRrf(denseRows: DenseSearchRow[], bm25Rows: Bm25SearchRow[]): RankedChunkCandidate[] {
    const k = 60;
    const ranked = new Map<string, RankedChunkCandidate>();

    denseRows.forEach((row, index) => {
      const existing = ranked.get(row.id) ?? {
        id: row.id,
        source_id: row.source_id,
        text: row.text,
        page: row.page,
        dense_score: null,
        bm25_score: null,
        rrf_score: 0,
      };

      existing.dense_score = row.dense_score;
      existing.rrf_score += 1 / (k + index + 1);
      ranked.set(row.id, existing);
    });

    bm25Rows.forEach((row, index) => {
      const existing = ranked.get(row.id) ?? {
        id: row.id,
        source_id: row.source_id,
        text: row.text,
        page: row.page,
        dense_score: null,
        bm25_score: null,
        rrf_score: 0,
      };

      existing.bm25_score = row.bm25_score;
      existing.rrf_score += 1 / (k + index + 1);
      ranked.set(row.id, existing);
    });

    return Array.from(ranked.values()).sort((left, right) => right.rrf_score - left.rrf_score);
  }

  private async fetchSources(sourceIds: string[], client: { query: <T>(queryText: string, params?: unknown[]) => Promise<{ rows: T[] }> }): Promise<Map<string, AgronomySource>> {
    const result = await client.query<SourceRow>(
      `SELECT id, title, author, publisher, doc_type, language, region, crop_type, season, published_at, source_url, storage_path
       FROM agronomy_sources
       WHERE id = ANY($1::uuid[])`,
      [sourceIds],
    );

    return new Map(
      result.rows.map((row) => [
        row.id,
        serializeJsonb(
          AgronomySourceSchema,
          {
            id: row.id,
            title: row.title,
            author: row.author,
            publisher: row.publisher,
            doc_type: row.doc_type,
            language: row.language,
            region: this.parseSourceList(row.region, 'region', row.id),
            crop_type: this.parseSourceList(row.crop_type, 'crop_type', row.id),
            season: this.parseSourceList(row.season, 'season', row.id),
            published_at: row.published_at,
            source_url: row.source_url,
            storage_path: row.storage_path,
          },
          `agronomy_sources:${row.id}`,
        ),
      ]),
    );
  }

  private parseSourceList(raw: unknown, field: 'region' | 'crop_type' | 'season', sourceId: string): string[] {
    const parsed = parseJsonb(
      z.union([z.string(), z.array(z.string())]),
      raw,
      `agronomy_sources.${field}:${sourceId}`,
      null,
    );

    return normalizeStringList(parsed, `agronomy_sources.${field}:${sourceId}`);
  }

  private buildSourceFilter(query: RetrievalQuery, _organizationId: string | null): { sql: string; params: unknown[] } {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 3;

    if (query.crop_type) {
      conditions.push(`(crop_type IS NULL OR crop_type ?| array[${paramIdx}])`);
      params.push(query.crop_type);
      paramIdx++;
    }

    if (query.region && query.region.length > 0) {
      conditions.push(`(region IS NULL OR region ?| $${paramIdx}::text[])`);
      params.push(query.region);
      paramIdx++;
    }

    return {
      sql: conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '',
      params,
    };
  }

  private toPgVector(values: number[]): string {
    return `[${values.join(',')}]`;
  }

  private authHeaders(): Record<string, string> {
    if (!this.internalServiceToken) {
      return {};
    }
    return { authorization: `Bearer ${this.internalServiceToken}` };
  }

  private async callFastApi(
    path: string,
    body: unknown,
    organizationId?: string | null,
    timeout: number = 120_000,
  ): Promise<unknown> {
    const url = `${this.satelliteBaseUrl}/api${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.authHeaders(),
    };

    if (organizationId) {
      headers['x-organization-id'] = organizationId;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(`[AgronomyRag] POST ${url} → ${response.status}: ${errorText.slice(0, 500)}`);
        throw new HttpException(
          errorText || `Agronomy service error: ${response.statusText}`,
          response.status >= 500 ? HttpStatus.BAD_GATEWAY : response.status,
        );
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new InternalServerErrorException(`Expected JSON response from ${path}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timer);

      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new HttpException('Agronomy service request timed out', HttpStatus.GATEWAY_TIMEOUT);
      }

      this.logger.error(`[AgronomyRag] POST ${url} failed`, error instanceof Error ? error.stack : undefined);
      throw new HttpException('Agronomy service unavailable', HttpStatus.BAD_GATEWAY);
    }
  }
}
