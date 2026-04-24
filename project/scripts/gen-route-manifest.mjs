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
const INPUT = path.join(ROOT, 'src/routeTree.gen.ts');
const OUTPUT = path.join(ROOT, 'src/generated/route-manifest.json');

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

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(payload, null, 2) + '\n');

  console.log(`[gen-route-manifest] wrote ${normalized.length} routes → ${path.relative(ROOT, OUTPUT)}`);
}

try {
  main();
} catch (err) {
  console.error('[gen-route-manifest] failed:', err.message);
  process.exit(1);
}
