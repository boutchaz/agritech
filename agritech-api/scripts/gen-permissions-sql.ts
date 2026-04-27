/// <reference types="node" />
/**
 * Codegen: rewrite the v_resources TEXT[] inside schema.sql from the RESOURCES
 * single source of truth (src/modules/casl/resources.ts).
 *
 * Run via: pnpm --filter agritech-api gen:perms
 *
 * The schema.sql segment is delimited by these markers:
 *   -- BEGIN GENERATED PERMISSION RESOURCES (do not edit by hand)
 *   ...
 *   -- END GENERATED PERMISSION RESOURCES
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { RESOURCES } from '../src/modules/casl/resources';

const SCHEMA_PATH = resolve(
  __dirname,
  '../../project/supabase/migrations/00000000000000_schema.sql',
);
const BEGIN = '-- BEGIN GENERATED PERMISSION RESOURCES (do not edit by hand)';
const END = '-- END GENERATED PERMISSION RESOURCES';

function chunk<T>(arr: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size) as T[]);
  return out;
}

function buildSqlBlock(): string {
  const keys = RESOURCES.map((r) => r.key);
  const lines = chunk(keys, 4).map(
    (group) => '    ' + group.map((k) => `'${k}'`).join(','),
  );
  return [
    BEGIN,
    `  -- ${RESOURCES.length} resources × 5 actions = ${RESOURCES.length * 5} permission rows`,
    `  v_resources TEXT[] := ARRAY[`,
    lines.join(',\n'),
    `  ];`,
    END,
  ].join('\n');
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const schema = readFileSync(SCHEMA_PATH, 'utf8');
  const beginIdx = schema.indexOf(BEGIN);
  const endIdx = schema.indexOf(END);

  if (beginIdx === -1 || endIdx === -1) {
    throw new Error(
      `Markers not found in ${SCHEMA_PATH}. Add this block once:\n\n${BEGIN}\n  v_resources TEXT[] := ARRAY[...];\n${END}`,
    );
  }

  const before = schema.slice(0, beginIdx);
  const after = schema.slice(endIdx + END.length);
  const next = before + buildSqlBlock() + after;

  if (next === schema) {
    console.log(`[gen:perms] up to date (${RESOURCES.length} resources)`);
    return;
  }

  if (checkOnly) {
    console.error(
      `[gen:perms] DRIFT: schema.sql is stale.\n` +
        `Run \`pnpm --filter agritech-api gen:perms\` and commit the result.`,
    );
    process.exit(1);
  }

  writeFileSync(SCHEMA_PATH, next, 'utf8');
  console.log(
    `[gen:perms] wrote ${RESOURCES.length} resources / ${RESOURCES.length * 5} perms to schema.sql`,
  );
}

main();
