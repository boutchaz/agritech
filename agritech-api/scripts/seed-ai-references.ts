#!/usr/bin/env ts-node

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

import type {
  AgrumesReference,
  AvocatierReference,
  CropType,
  OlivierReference,
  PalmierDattierReference,
} from '../../project/src/types/ai-references';

type RawCropAIReference =
  | Omit<OlivierReference, 'crop_type'>
  | Omit<AgrumesReference, 'crop_type'>
  | Omit<AvocatierReference, 'crop_type'>
  | Omit<PalmierDattierReference, 'crop_type'>;

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

interface JsonObject {
  [key: string]: JsonValue;
}

interface CropFileConfig {
  readonly cropType: CropType;
  readonly fileName: string;
}

interface CropAIReferenceRow {
  readonly crop_type: CropType;
  readonly version: string;
  readonly reference_data: RawCropAIReference;
}

interface DryRunRowPreview {
  readonly crop_type: CropType;
  readonly version: string;
  readonly metadata: RawCropAIReference['metadata'];
  readonly reference_data_keys: string[];
}

const isDryRun = process.argv.includes('--dry-run');

const cropFiles: readonly CropFileConfig[] = [
  { cropType: 'olivier', fileName: 'DATA_OLIVIER.json' },
  { cropType: 'agrumes', fileName: 'DATA_AGRUMES.json' },
  { cropType: 'avocatier', fileName: 'DATA_AVOCATIER.json' },
  { cropType: 'palmier_dattier', fileName: 'DATA_PALMIER_DATTIER.json' },
];

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRawCropAIReference(value: unknown): value is RawCropAIReference {
  if (!isJsonObject(value)) {
    return false;
  }

  const metadata = value.metadata;

  return (
    isJsonObject(metadata) &&
    typeof metadata.version === 'string' &&
    typeof metadata.culture === 'string'
  );
}

function resolveCropFilePath(fileName: string): string {
  return path.resolve(__dirname, `../../${fileName}`);
}

function loadEnvFile(): void {
  const envPath = path.resolve(__dirname, '../.env');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const envContents = fs.readFileSync(envPath, 'utf-8');
  const lines = envContents.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();

    if (!key || process.env[key] !== undefined) {
      continue;
    }

    const rawValue = line.slice(separatorIndex + 1).trim();
    const quotedWithDouble = rawValue.startsWith('"') && rawValue.endsWith('"');
    const quotedWithSingle = rawValue.startsWith("'") && rawValue.endsWith("'");
    const value = quotedWithDouble || quotedWithSingle
      ? rawValue.slice(1, -1)
      : rawValue;

    process.env[key] = value;
  }
}

function extractVersion(referenceData: RawCropAIReference): string {
  const metadataVersion = referenceData.metadata.version?.trim();

  if (metadataVersion) {
    return metadataVersion;
  }

  const rootVersion = isJsonObject(referenceData)
    ? referenceData.version
    : undefined;

  if (typeof rootVersion === 'string' && rootVersion.trim()) {
    return rootVersion.trim();
  }

  throw new Error('Unable to determine version from metadata.version or root version');
}

function readCropReference(config: CropFileConfig): CropAIReferenceRow {
  const filePath = resolveCropFilePath(config.fileName);
  const fileContents = fs.readFileSync(filePath, 'utf-8');
  const parsed: unknown = JSON.parse(fileContents);

  if (!isRawCropAIReference(parsed)) {
    throw new Error(`Invalid crop reference payload in ${config.fileName}`);
  }

  const declaredCropType = parsed.metadata.culture;

  if (declaredCropType !== config.cropType) {
    throw new Error(
      `Crop type mismatch for ${config.fileName}: expected ${config.cropType}, received ${declaredCropType}`,
    );
  }

  return {
    crop_type: config.cropType,
    version: extractVersion(parsed),
    reference_data: parsed,
  };
}

function getAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables',
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function upsertReference(
  client: SupabaseClient,
  row: CropAIReferenceRow,
): Promise<void> {
  const { error } = await client
    .from('crop_ai_references')
    .upsert(row, { onConflict: 'crop_type' });

  if (error) {
    throw error;
  }
}

async function main(): Promise<void> {
  loadEnvFile();

  const dryRunRows: DryRunRowPreview[] = [];
  const client = isDryRun ? null : getAdminClient();
  let hasFailure = false;

  for (const cropFile of cropFiles) {
    try {
      const row = readCropReference(cropFile);

      if (isDryRun) {
        dryRunRows.push({
          crop_type: row.crop_type,
          version: row.version,
          metadata: row.reference_data.metadata,
          reference_data_keys: Object.keys(row.reference_data),
        });
        console.log(`DRY RUN ${row.crop_type}: would upsert version ${row.version}`);
        continue;
      }

      if (!client) {
        throw new Error('Supabase admin client not initialized');
      }

      await upsertReference(client, row);
      console.log(`SUCCESS ${row.crop_type}: upserted version ${row.version}`);
    } catch (error) {
      hasFailure = true;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`FAILURE ${cropFile.cropType}: ${message}`);
    }
  }

  if (isDryRun) {
    console.log('Dry run enabled. The following rows would be upserted into crop_ai_references:');
    console.log(JSON.stringify(dryRunRows, null, 2));
  }

  if (hasFailure) {
    throw new Error('One or more crop AI references failed to upsert');
  }

  if (!isDryRun) {
    console.log(`Completed upsert for ${cropFiles.length} crop AI references.`);
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Seed failed: ${message}`);
    process.exit(1);
  });
