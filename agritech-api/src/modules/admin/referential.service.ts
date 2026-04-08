import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface ReferentialSummary {
  crop: string;
  fileName: string;
  version: string;
  date: string;
  sections: string[];
}

const REFERENTIALS_SEARCH_PATHS = [
  // Production Docker image
  path.resolve(__dirname, '..', '..', '..', 'referentials'),
  // Dev: agritech-api/referentials/
  path.resolve(__dirname, '..', '..', '..', '..', 'referentials'),
  // cwd-based
  path.resolve(process.cwd(), 'referentials'),
];

@Injectable()
export class ReferentialService {
  private readonly logger = new Logger(ReferentialService.name);

  private discoverDir(): string | null {
    for (const candidate of REFERENTIALS_SEARCH_PATHS) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
        return candidate;
      }
    }
    return null;
  }

  private getFilePath(crop: string): string {
    const dir = this.discoverDir();
    if (!dir) {
      throw new NotFoundException('Referentials directory not found');
    }
    const fileName = `DATA_${crop.toUpperCase()}.json`;
    const filePath = path.join(dir, fileName);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`Referential file not found: ${fileName}`);
    }
    return filePath;
  }

  private readJson(filePath: string): Record<string, unknown> {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  }

  listAll(): ReferentialSummary[] {
    const dir = this.discoverDir();
    if (!dir) return [];

    const pattern = /^DATA_(.+)\.json$/i;
    const results: ReferentialSummary[] = [];

    for (const file of fs.readdirSync(dir)) {
      const match = pattern.exec(file);
      if (!match) continue;

      const crop = match[1].toLowerCase();
      try {
        const data = this.readJson(path.join(dir, file));
        const metadata = data.metadata as Record<string, string> | undefined;
        results.push({
          crop,
          fileName: file,
          version: metadata?.version ?? 'unknown',
          date: metadata?.date ?? 'unknown',
          sections: Object.keys(data).filter((k) => k !== 'metadata'),
        });
      } catch (err) {
        this.logger.error(`Failed to read ${file}: ${(err as Error).message}`);
      }
    }

    return results.sort((a, b) => a.crop.localeCompare(b.crop));
  }

  getOne(crop: string): Record<string, unknown> {
    const filePath = this.getFilePath(crop);
    return this.readJson(filePath);
  }

  getSection(crop: string, section: string): unknown {
    const data = this.getOne(crop);
    if (!(section in data)) {
      throw new NotFoundException(
        `Section "${section}" not found in ${crop}. Available: ${Object.keys(data).join(', ')}`,
      );
    }
    return data[section];
  }

  updateSection(
    crop: string,
    section: string,
    value: unknown,
  ): { success: boolean; crop: string; section: string } {
    const filePath = this.getFilePath(crop);
    const data = this.readJson(filePath);

    if (section === 'metadata') {
      throw new BadRequestException('Cannot overwrite metadata section');
    }

    data[section] = value;

    // Update metadata date
    if (data.metadata && typeof data.metadata === 'object') {
      (data.metadata as Record<string, unknown>).last_modified = new Date()
        .toISOString()
        .slice(0, 10);
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    this.logger.log(`Updated section "${section}" in ${crop}`);

    // Clear the crop-reference-loader cache so NestJS picks up changes
    try {
      const { reloadCropReferences } = require('../calibration/crop-reference-loader');
      reloadCropReferences();
    } catch {
      // loader may not be available in all contexts
    }

    return { success: true, crop, section };
  }

  create(
    crop: string,
    data: Record<string, unknown>,
  ): { success: boolean; crop: string; fileName: string } {
    const dir = this.discoverDir();
    if (!dir) {
      throw new NotFoundException('Referentials directory not found');
    }

    const normalized = crop.toLowerCase().replace(/\s+/g, '_');
    const fileName = `DATA_${normalized.toUpperCase()}.json`;
    const filePath = path.join(dir, fileName);

    if (fs.existsSync(filePath)) {
      throw new BadRequestException(`Referential already exists: ${fileName}`);
    }

    // Ensure metadata
    if (!data.metadata || typeof data.metadata !== 'object') {
      data.metadata = {};
    }
    const meta = data.metadata as Record<string, unknown>;
    meta.version = meta.version ?? '1.0';
    meta.date = meta.date ?? new Date().toISOString().slice(0, 7);
    meta.culture = normalized;
    meta.pays = meta.pays ?? 'Maroc';

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    this.logger.log(`Created referential ${fileName}`);

    return { success: true, crop: normalized, fileName };
  }
}
