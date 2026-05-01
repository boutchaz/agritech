import { Logger } from '@nestjs/common';
import { z } from 'zod';

const logger = new Logger('AgronomyRagSchemas');

const StringListValueSchema = z.union([z.string(), z.array(z.string())]).nullable().optional();

export const RetrievalQuerySchema = z.object({
  query: z.string().trim().min(1),
  crop_type: z.string().trim().min(1).optional(),
  region: z.array(z.string().trim().min(1)).optional(),
  limit: z.number().int().min(1).max(50).default(8),
});

export const AgronomySourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string().nullable().optional(),
  publisher: z.string().nullable().optional(),
  doc_type: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  region: z.array(z.string()).optional(),
  crop_type: z.array(z.string()).optional(),
  season: z.array(z.string()).optional(),
  published_at: z.string().nullable().optional(),
  source_url: z.string().nullable().optional(),
  storage_path: z.string().nullable().optional(),
});

export const RetrievedChunkSchema = z.object({
  id: z.string(),
  source_id: z.string(),
  text: z.string(),
  page: z.number().int().nullable().optional(),
  dense_score: z.number().nullable().optional(),
  bm25_score: z.number().nullable().optional(),
  rrf_score: z.number(),
  rerank_score: z.number().nullable().optional(),
  source: AgronomySourceSchema,
});

export const CitationMarkerSchema = z.object({
  marker: z.string().regex(/^\[S\d+\]$/),
  ordinal: z.number().int().min(1),
});

export type RetrievalQuery = z.infer<typeof RetrievalQuerySchema>;
export type RetrievedChunk = z.infer<typeof RetrievedChunkSchema>;
export type CitationMarker = z.infer<typeof CitationMarkerSchema>;
export type AgronomySource = z.infer<typeof AgronomySourceSchema>;
export type StringListValue = z.infer<typeof StringListValueSchema>;

export function parseJsonb<T>(
  schema: z.ZodType<T>,
  raw: unknown,
  context: string,
  fallback: T | null = null,
): T | null {
  if (raw == null) return fallback;
  const result = schema.safeParse(raw);
  if (result.success) return result.data;
  logger.warn(
    `parseJsonb failed for ${context}: ${result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`,
  );
  return fallback;
}

export function serializeJsonb<T>(schema: z.ZodType<T>, value: T, context: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(
      `serializeJsonb failed for ${context}: ${result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ')}`,
    );
  }
  return result.data;
}

export function normalizeStringList(raw: unknown, context: string): string[] {
  const parsed = parseJsonb(StringListValueSchema, raw, context, null);
  if (!parsed) return [];
  const values = Array.isArray(parsed) ? parsed : [parsed];
  return values.map((value) => value.trim()).filter(Boolean);
}
