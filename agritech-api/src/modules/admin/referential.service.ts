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

export interface ValidationError {
  path: string;
  message: string;
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

  // =============================================
  // Schema validation
  // =============================================

  /**
   * Validate that `newVal` matches the structure of `original`.
   * Rules:
   *  - Same keys (no additions, no removals)
   *  - Leaf values keep the same type (number→number, string→string, etc.)
   *  - null is accepted for any nullable original value
   *  - Arrays must keep the same item structure (checked against first element)
   */
  private validateStructure(
    original: unknown,
    newVal: unknown,
    currentPath: string,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // null handling — if original was null, any value is fine (we can't infer type)
    if (original === null || original === undefined) {
      return errors;
    }

    // Allow null for any field
    if (newVal === null || newVal === undefined) {
      return errors;
    }

    const origType = Array.isArray(original) ? 'array' : typeof original;
    const newType = Array.isArray(newVal) ? 'array' : typeof newVal;

    // Type mismatch
    if (origType !== newType) {
      errors.push({
        path: currentPath,
        message: `Type mismatch: expected ${origType}, got ${newType}`,
      });
      return errors;
    }

    // Leaf types — no deeper validation needed
    if (origType === 'string' || origType === 'number' || origType === 'boolean') {
      return errors;
    }

    // Array validation
    if (origType === 'array') {
      const origArr = original as unknown[];
      const newArr = newVal as unknown[];

      // If original array has items, validate structure of new items against first original item
      if (origArr.length > 0 && newArr.length > 0) {
        const template = origArr[0];
        // Only validate object items (not primitive arrays)
        if (template && typeof template === 'object' && !Array.isArray(template)) {
          for (let i = 0; i < newArr.length; i++) {
            errors.push(
              ...this.validateStructure(template, newArr[i], `${currentPath}[${i}]`),
            );
          }
        }
      }
      return errors;
    }

    // Object validation — check keys match
    if (origType === 'object') {
      const origObj = original as Record<string, unknown>;
      const newObj = newVal as Record<string, unknown>;
      const origKeys = new Set(Object.keys(origObj));
      const newKeys = new Set(Object.keys(newObj));

      // Missing keys
      for (const key of origKeys) {
        if (!newKeys.has(key)) {
          errors.push({
            path: `${currentPath}.${key}`,
            message: `Missing key "${key}"`,
          });
        }
      }

      // Extra keys
      for (const key of newKeys) {
        if (!origKeys.has(key)) {
          errors.push({
            path: `${currentPath}.${key}`,
            message: `Unexpected key "${key}"`,
          });
        }
      }

      // Recurse into shared keys
      for (const key of origKeys) {
        if (newKeys.has(key)) {
          errors.push(
            ...this.validateStructure(origObj[key], newObj[key], `${currentPath}.${key}`),
          );
        }
      }
    }

    return errors;
  }

  // =============================================
  // CRUD
  // =============================================

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

  validateSection(
    crop: string,
    section: string,
    value: unknown,
  ): { valid: boolean; errors: ValidationError[] } {
    const data = this.getOne(crop);

    if (!(section in data)) {
      return {
        valid: false,
        errors: [{ path: section, message: `Section "${section}" does not exist` }],
      };
    }

    const original = data[section];
    const errors = this.validateStructure(original, value, section);
    return { valid: errors.length === 0, errors };
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

    if (!(section in data)) {
      throw new NotFoundException(`Section "${section}" not found`);
    }

    // Validate structure before writing
    const original = data[section];
    const errors = this.validateStructure(original, value, section);
    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Schema validation failed',
        errors,
      });
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

  /**
   * Get the structural schema (keys + types) of a crop referential.
   * Useful for the admin UI to understand expected structure.
   */
  getSchema(crop: string): Record<string, unknown> {
    const data = this.getOne(crop);
    return this.extractSchema(data) as Record<string, unknown>;
  }

  private extractSchema(value: unknown): unknown {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';

    if (Array.isArray(value)) {
      if (value.length === 0) return { _type: 'array', _items: 'unknown' };
      return { _type: 'array', _items: this.extractSchema(value[0]), _count: value.length };
    }

    if (typeof value === 'object') {
      const schema: Record<string, unknown> = { _type: 'object' };
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        schema[key] = this.extractSchema(val);
      }
      return schema;
    }

    return typeof value;
  }

  create(
    crop: string,
    templateCrop?: string,
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

    let data: Record<string, unknown>;

    if (templateCrop) {
      // Clone from existing referential with empty/default values
      const templateData = this.getOne(templateCrop);
      data = this.createEmptyFromTemplate(templateData);
    } else {
      // Minimal structure
      data = {};
    }

    // Set metadata
    data.metadata = {
      version: '1.0',
      date: new Date().toISOString().slice(0, 7),
      culture: normalized,
      pays: 'Maroc',
      usage: 'LLM_direct_read — no parser needed',
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    this.logger.log(`Created referential ${fileName}${templateCrop ? ` from template ${templateCrop}` : ''}`);

    return { success: true, crop: normalized, fileName };
  }

  private createEmptyFromTemplate(template: unknown): any {
    if (template === null || template === undefined) return null;
    if (typeof template === 'string') return '';
    if (typeof template === 'number') return 0;
    if (typeof template === 'boolean') return false;

    if (Array.isArray(template)) {
      // Keep one empty item as template
      if (template.length > 0 && typeof template[0] === 'object') {
        return [this.createEmptyFromTemplate(template[0])];
      }
      return [];
    }

    if (typeof template === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(template as Record<string, unknown>)) {
        result[key] = this.createEmptyFromTemplate(val);
      }
      return result;
    }

    return null;
  }
}
