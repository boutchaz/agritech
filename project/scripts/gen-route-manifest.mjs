#!/usr/bin/env node
// Parse the TanStack-generated `routeTree.gen.ts` and emit a flat JSON
// manifest of runtime route paths. Used by the admin-app module picker
// (autocomplete) and by the backend `navigation_items` validator.
//
// Output: project/src/generated/route-manifest.json
//
// Re-run via `npm run gen:manifest`. Should be part of the build step
// and committed so backend + admin-app can read it without a build.

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(ROOT, '..');
const INPUT = path.join(ROOT, 'src/routeTree.gen.ts');
// The manifest is consumed by two places:
//   1. project/ frontend (kept as the canonical source for the monorepo
//      build)
//   2. agritech-api backend (validates POST/PATCH /admin/modules
//      navigation_items and serves GET /admin/route-manifest for the
//      admin-app picker). Its Docker image ships agritech-api/ only,
//      so a copy must live under src/data/ to be bundled by nest-cli.
const OUTPUTS = [
  path.join(ROOT, 'src/generated/route-manifest.json'),
  path.join(REPO_ROOT, 'agritech-api/src/data/route-manifest.json'),
];

function main() {
  if (!fs.existsSync(INPUT)) {
    throw new Error(`routeTree.gen.ts not found at ${INPUT}`);
  }
  const source = fs.readFileSync(INPUT, 'utf8');

  const blockMatch = source.match(
    /export interface FileRoutesByFullPath \{([\s\S]*?)\n\}/,
  );
  if (!blockMatch) {
    throw new Error('FileRoutesByFullPath interface not found in routeTree.gen.ts');
  }
  const body = blockMatch[1];

  const entryRegex = /^\s*'([^']+)':\s*typeof/gm;
  const rawRoutes = [];
  let m;
  while ((m = entryRegex.exec(body)) !== null) {
    rawRoutes.push(m[1]);
  }

  // Normalize: strip trailing slashes except root '/'. De-dupe.
  const normalized = Array.from(
    new Set(
      rawRoutes.map((p) => (p === '/' ? '/' : p.replace(/\/+$/, ''))),
    ),
  );
  normalized.sort();

  const payload = {
    generated_at: new Date().toISOString(),
    count: normalized.length,
    routes: normalized,
  };
  const json = JSON.stringify(payload, null, 2) + '\n';

  for (const out of OUTPUTS) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, json);
    console.log(`[gen-route-manifest] wrote ${normalized.length} routes → ${path.relative(REPO_ROOT, out)}`);
  }
}

try {
  main();
} catch (err) {
  console.error('[gen-route-manifest] failed:', err.message);
  process.exit(1);
}
