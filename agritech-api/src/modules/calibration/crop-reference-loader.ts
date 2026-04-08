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

function loadAll(): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
  const dir = discoverReferentialsDir();

  if (!dir) {
    logger.warn(
      `No referentials/ directory found. Searched: ${REFERENTIALS_SEARCH_PATHS.join(', ')}`,
    );
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
      logger.log(`Loaded reference for "${cropType}" from ${file}`);
    } catch (err) {
      logger.error(`Failed to parse ${file}: ${(err as Error).message}`);
    }
  }

  logger.log(`Loaded ${map.size} crop reference(s) from ${dir}`);
  return map;
}

export function getLocalCropReference(
  cropType: string,
): Record<string, unknown> | null {
  if (!cache) {
    cache = loadAll();
  }
  return cache.get(cropType.toLowerCase()) ?? null;
}

export function reloadCropReferences(): void {
  cache = null;
}

/**
 * Load and cache MOTEUR_CONFIG.json — culture-agnostic engine configuration.
 * Contains: gouvernance rules, phases_age, scoring formulas, index interpretation per culture.
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
