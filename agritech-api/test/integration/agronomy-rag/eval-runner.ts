import { readFileSync } from 'fs';
import { join } from 'path';

interface EvalRow {
  query: string;
  crop_context: string;
  expected_source_ids: string[];
  expected_keywords: string[];
}

interface EvalMetrics {
  retrieval_at_1: number;
  retrieval_at_3: number;
  retrieval_at_8: number;
  mean_reciprocal_rank: number;
  keyword_coverage: number;
  latency_p50_ms: number;
  latency_p95_ms: number;
  total_rows: number;
  evaluated_at: string;
}

interface RetrievalResult {
  id: string;
  source_id: string;
  text: string;
  score: number;
}

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api/v1';
const API_KEY = process.env.EVAL_API_KEY || '';
const ORGANIZATION_ID = process.env.EVAL_ORGANIZATION_ID || '';

function parseCsv(filePath: string): EvalRow[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const header = lines[0].split(',');
  const rows: EvalRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length < 4) continue;

    rows.push({
      query: values[0].replace(/^"|"$/g, ''),
      crop_context: values[1].replace(/^"|"$/g, ''),
      expected_source_ids: values[2] ? values[2].replace(/^"|"$/g, '').split(';').filter(Boolean) : [],
      expected_keywords: values[3] ? values[3].replace(/^"|"$/g, '').split(';').filter(Boolean) : [],
    });
  }

  return rows;
}

async function runRetrieval(query: string, limit: number = 8): Promise<{ results: RetrievalResult[]; latencyMs: number }> {
  const start = performance.now();

  const response = await fetch(
    `${API_BASE_URL}/agronomy/search?query=${encodeURIComponent(query)}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'x-organization-id': ORGANIZATION_ID,
      },
    },
  );

  const latencyMs = performance.now() - start;

  if (!response.ok) {
    throw new Error(`Retrieval request failed: ${response.status} ${await response.text()}`);
  }

  const results = await response.json() as RetrievalResult[];
  return { results, latencyMs };
}

function computeRetrievalAtK(results: RetrievalResult[], expectedIds: string[], k: number): number | null {
  if (expectedIds.length === 0) return null;
  const topK = results.slice(0, k);
  return topK.some((r) => expectedIds.includes(r.source_id)) ? 1 : 0;
}

function computeReciprocalRank(results: RetrievalResult[], expectedIds: string[]): number | null {
  if (expectedIds.length === 0) return null;
  for (let i = 0; i < results.length; i++) {
    if (expectedIds.includes(results[i].source_id)) {
      return 1 / (i + 1);
    }
  }
  return 0;
}

function computeKeywordCoverage(results: RetrievalResult[], keywords: string[]): number | null {
  if (keywords.length === 0) return null;
  const combinedText = results.map((r) => r.text.toLowerCase()).join(' ');
  const matched = keywords.filter((kw) => combinedText.includes(kw.toLowerCase()));
  return matched.length / keywords.length;
}

function percentile(sorted: number[], p: number): number {
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

async function main() {
  const datasetPath = join(__dirname, 'eval-dataset.csv');
  const rows = parseCsv(datasetPath);

  console.log(`Loaded ${rows.length} eval rows`);

  const metrics: EvalMetrics = {
    retrieval_at_1: 0,
    retrieval_at_3: 0,
    retrieval_at_8: 0,
    mean_reciprocal_rank: 0,
    keyword_coverage: 0,
    latency_p50_ms: 0,
    latency_p95_ms: 0,
    total_rows: rows.length,
    evaluated_at: new Date().toISOString(),
  };

  const latencies: number[] = [];
  let sumReciprocalRank = 0;
  let sumRetrievalAt1 = 0;
  let sumRetrievalAt3 = 0;
  let sumRetrievalAt8 = 0;
  let sumKeywordCoverage = 0;

  let scoredRows = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    process.stdout.write(`\r[${i + 1}/${rows.length}] "${row.query.substring(0, 40)}..."`);

    try {
      const { results, latencyMs } = await runRetrieval(row.query);
      latencies.push(latencyMs);

      const hasGroundTruth = row.expected_source_ids.length > 0;
      if (hasGroundTruth) {
        const r1 = computeRetrievalAtK(results, row.expected_source_ids, 1);
        const r3 = computeRetrievalAtK(results, row.expected_source_ids, 3);
        const r8 = computeRetrievalAtK(results, row.expected_source_ids, 8);
        const rr = computeReciprocalRank(results, row.expected_source_ids);
        sumRetrievalAt1 += r1 ?? 0;
        sumRetrievalAt3 += r3 ?? 0;
        sumRetrievalAt8 += r8 ?? 0;
        sumReciprocalRank += rr ?? 0;
        scoredRows++;
      }

      const kw = computeKeywordCoverage(results, row.expected_keywords);
      sumKeywordCoverage += kw ?? 0;
    } catch (error) {
      console.error(`\nFailed on row ${i + 1}: ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log('\n');

  const denominator = scoredRows || rows.length;
  metrics.retrieval_at_1 = sumRetrievalAt1 / denominator;
  metrics.retrieval_at_3 = sumRetrievalAt3 / denominator;
  metrics.retrieval_at_8 = sumRetrievalAt8 / denominator;
  metrics.mean_reciprocal_rank = sumReciprocalRank / denominator;
  metrics.keyword_coverage = rows.length > 0 ? sumKeywordCoverage / rows.length : 0;

  if (latencies.length > 0) {
    latencies.sort((a, b) => a - b);
    metrics.latency_p50_ms = Math.round(percentile(latencies, 50));
    metrics.latency_p95_ms = Math.round(percentile(latencies, 95));
  }

  console.log('=== Agronomy RAG Eval Report ===');
  console.log(`Evaluated at: ${metrics.evaluated_at}`);
  console.log(`Total rows: ${metrics.total_rows}`);
  console.log(`Retrieval@1:  ${(metrics.retrieval_at_1 * 100).toFixed(1)}%`);
  console.log(`Retrieval@3:  ${(metrics.retrieval_at_3 * 100).toFixed(1)}%`);
  console.log(`Retrieval@8:  ${(metrics.retrieval_at_8 * 100).toFixed(1)}%`);
  console.log(`MRR:          ${(metrics.mean_reciprocal_rank).toFixed(3)}`);
  console.log(`Keyword cov:  ${(metrics.keyword_coverage * 100).toFixed(1)}%`);
  console.log(`Latency p50:  ${metrics.latency_p50_ms}ms`);
  console.log(`Latency p95:  ${metrics.latency_p95_ms}ms`);

  const outputPath = join(__dirname, 'eval-report.json');
  const fs = await import('fs/promises');
  await fs.writeFile(outputPath, JSON.stringify(metrics, null, 2));
  console.log(`\nReport written to ${outputPath}`);
}

main().catch((error) => {
  console.error('Eval runner failed:', error);
  process.exit(1);
});
