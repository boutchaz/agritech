#!/usr/bin/env node
/**
 * Prints SQL INSERT ... ON CONFLICT blocks for public.crop_ai_references
 * from agritech-api/referentials/DATA_*.json (same source as agritech-api/scripts/seed-ai-references.ts).
 *
 * When referentials change, regenerate the seed file:
 *   node project/scripts/generate-crop-ai-references-sql.mjs > project/supabase/seed.sql.tmp
 * Then merge into project/supabase/seed.sql (replace existing crop_ai_references block).
 *
 * Seed runs:
 *   - dev: automatically via `npm run db:reset` (Supabase config.toml [db.seed])
 *   - prod: manually via `npm run db:seed:remote` after `npm run db:push`
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const referentialsDir = path.join(repoRoot, 'agritech-api', 'referentials');
const pattern = /^DATA_(.+)\.json$/i;

const files = fs
  .readdirSync(referentialsDir)
  .filter((f) => pattern.test(f) && f.endsWith('.json'))
  .sort((a, b) => a.localeCompare(b));

if (files.length === 0) {
  console.error(`No DATA_*.json in ${referentialsDir}`);
  process.exit(1);
}

console.log(`
-- Seed crop_ai_references from repo referentials (DATA_*.json). Idempotent: upserts on crop_type.
-- Regenerate: node project/scripts/generate-crop-ai-references-sql.mjs
`);

for (const file of files) {
  const cropType = file.match(pattern)[1].toLowerCase();
  const fullPath = path.join(referentialsDir, file);
  const raw = fs.readFileSync(fullPath, 'utf8');
  let j;
  try {
    j = JSON.parse(raw);
  } catch (e) {
    console.error(`Invalid JSON: ${file}`, e);
    process.exit(1);
  }
  const version =
    j?.metadata && typeof j.metadata.version === 'string' && j.metadata.version.trim()
      ? j.metadata.version.trim()
      : typeof j.version === 'string'
        ? j.version.trim()
        : null;
  if (!version) {
    console.error(`No metadata.version in ${file}`);
    process.exit(1);
  }
  if (j?.metadata?.culture !== cropType) {
    console.error(
      `Culture mismatch in ${file}: filename implies ${cropType}, metadata.culture is ${j?.metadata?.culture}`,
    );
    process.exit(1);
  }
  const tag = `crop_ai_ref_${cropType.replace(/[^a-z0-9]/g, '_')}`;
  if (raw.includes(tag)) {
    console.error(`Delimiter ${tag} appears inside ${file}; pick another tag scheme.`);
    process.exit(1);
  }

  const verSql = version.replace(/'/g, "''");
  console.log(`INSERT INTO public.crop_ai_references (crop_type, version, reference_data)
VALUES (
  '${cropType}',
  '${verSql}',
  $${tag}$${raw}$${tag}$::jsonb
)
ON CONFLICT (crop_type) DO UPDATE SET
  version = EXCLUDED.version,
  reference_data = EXCLUDED.reference_data,
  updated_at = NOW();
`);
}
