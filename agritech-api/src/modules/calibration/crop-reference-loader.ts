import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '@nestjs/common';

const logger = new Logger('CropReferenceLoader');

let cache: Map<string, Record<string, unknown>> | null = null;
let moteurConfigCache: Record<string, unknown> | null = null;

const REFERENTIALS_SEARCH_PATHS = [
  // Production Docker image: copied next to dist/
  path.resolve(__dirname, '..', '..', '..', 'referentials'),
  // Dev: agritech-api/referentials/ (from src/modules/calibration/)
  path.resolve(__dirname, '..', '..', '..', '..', 'referentials'),
  // Fallback: cwd-based (agritech-api/)
  path.resolve(process.cwd(), 'referentials'),
];

function discoverReferentialsDir(): string | null {
  for (const candidate of REFERENTIALS_SEARCH_PATHS) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }
  return null;
}

function loadAllFromDisk(): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
  const dir = discoverReferentialsDir();

  if (!dir) {
    return map;
  }

  const pattern = /^DATA_(.+)\.json$/i;

  for (const file of fs.readdirSync(dir)) {
    const match = pattern.exec(file);
    if (!match) continue;

    const cropType = match[1].toLowerCase();
    try {
      const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      map.set(cropType, parsed);
    } catch (err) {
      logger.error(`Failed to parse ${file}: ${(err as Error).message}`);
    }
  }

  if (map.size > 0) {
    logger.log(`Loaded ${map.size} crop reference(s) from disk: ${dir}`);
  }

  return map;
}

/**
 * Load all crop references from DB (crop_ai_references table).
 * Used as fallback when disk files are not available (e.g. Docker without mounted referentials).
 */
async function loadAllFromDb(
  supabaseAdmin: { from: (table: string) => any },
): Promise<Map<string, Record<string, unknown>>> {
  const map = new Map<string, Record<string, unknown>>();

  try {
    const { data, error } = await supabaseAdmin
      .from('crop_ai_references')
      .select('crop_type, reference_data');

    if (error) {
      logger.warn(`Failed to load crop references from DB: ${error.message}`);
      return map;
    }

    for (const row of data ?? []) {
      if (row.crop_type && row.reference_data) {
        map.set(row.crop_type, row.reference_data);
      }
    }

    if (map.size > 0) {
      logger.log(`Loaded ${map.size} crop reference(s) from DB`);
    }
  } catch (err) {
    logger.warn(`DB crop reference load failed: ${(err as Error).message}`);
  }

  return map;
}

/**
 * Get a crop reference by type. Tries in-memory cache first, then disk, then DB.
 * For synchronous callers that can't await, use getLocalCropReference (disk-only).
 */
export function getLocalCropReference(
  cropType: string,
): Record<string, unknown> | null {
  if (!cache) {
    cache = loadAllFromDisk();
  }
  return cache.get(cropType.toLowerCase()) ?? null;
}

/**
 * Get a crop reference, falling back to DB if not found on disk.
 * Async version for callers that have a Supabase client available.
 */
export async function getCropReference(
  cropType: string,
  supabaseAdmin: { from: (table: string) => any },
): Promise<Record<string, unknown> | null> {
  // Try in-memory cache / disk first
  const local = getLocalCropReference(cropType);
  if (local) return local;

  // Fall back to DB
  const dbMap = await loadAllFromDb(supabaseAdmin);
  // Merge DB results into cache so subsequent sync calls hit cache
  for (const [key, value] of dbMap) {
    cache?.set(key, value);
  }

  return cache?.get(cropType.toLowerCase()) ?? null;
}

export function reloadCropReferences(): void {
  cache = null;
}

/**
 * Load and cache MOTEUR_CONFIG.json — culture-agnostic engine configuration.
 */
export function getMoteurConfig(): Record<string, unknown> | null {
  if (moteurConfigCache) {
    return moteurConfigCache;
  }

  const dir = discoverReferentialsDir();
  if (!dir) {
    logger.warn('No referentials/ directory found for MOTEUR_CONFIG.json');
    return null;
  }

  const configPath = path.join(dir, 'MOTEUR_CONFIG.json');
  if (!fs.existsSync(configPath)) {
    logger.warn(`MOTEUR_CONFIG.json not found at ${configPath}`);
    return null;
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    moteurConfigCache = JSON.parse(raw) as Record<string, unknown>;
    logger.log('Loaded MOTEUR_CONFIG.json');
    return moteurConfigCache;
  } catch (err) {
    logger.error(`Failed to parse MOTEUR_CONFIG.json: ${(err as Error).message}`);
    return null;
  }
}

export function reloadMoteurConfig(): void {
  moteurConfigCache = null;
}

export async function getMineralExportsFromDb(
  supabase: { from: (table: string) => any },
  cropType: string,
  productType?: string,
): Promise<Record<string, unknown> | null> {
  let query = supabase
    .from('crop_mineral_exports')
    .select('*')
    .eq('crop_type_name', cropType);

  if (productType) {
    query = query.eq('product_type', productType);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    logger.warn(
      `Failed to fetch mineral exports from DB for ${cropType}: ${error.message}`,
    );
    return null;
  }

  return data as Record<string, unknown> | null;
}
