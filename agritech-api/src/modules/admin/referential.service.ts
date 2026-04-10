import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface ReferentialSummary {
  crop: string;
  version: string;
  date: string;
  sections: string[];
}

export interface ValidationError {
  path: string;
  message: string;
}

interface CropAiReferenceRow {
  id: string;
  crop_type: string;
  version: string;
  reference_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class ReferentialService {
  private readonly logger = new Logger(ReferentialService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  private get supabase() {
    return this.databaseService.getAdminClient();
  }

  // =============================================
  // CRUD — DB as single source of truth
  // =============================================

  async listAll(): Promise<ReferentialSummary[]> {
    const { data, error } = await this.supabase
      .from('crop_ai_references')
      .select('crop_type, version, reference_data, updated_at')
      .order('crop_type');

    if (error) {
      throw new BadRequestException(`Failed to list referentials: ${error.message}`);
    }

    return (data ?? []).map((row: CropAiReferenceRow) => {
      const refData = row.reference_data ?? {};
      const metadata = refData.metadata as Record<string, string> | undefined;
      return {
        crop: row.crop_type,
        version: row.version,
        date: metadata?.date ?? row.updated_at?.slice(0, 10) ?? 'unknown',
        sections: Object.keys(refData).filter((k) => k !== 'metadata'),
      };
    });
  }

  async getOne(crop: string): Promise<Record<string, unknown>> {
    const { data, error } = await this.supabase
      .from('crop_ai_references')
      .select('reference_data')
      .eq('crop_type', crop.toLowerCase())
      .maybeSingle();

    if (error) {
      throw new BadRequestException(`Failed to fetch referential: ${error.message}`);
    }

    if (!data?.reference_data) {
      throw new NotFoundException(
        `Référentiel non trouvé pour "${crop}". Créez-le depuis l'application d'administration.`,
      );
    }

    return data.reference_data as Record<string, unknown>;
  }

  async getSection(crop: string, section: string): Promise<unknown> {
    const data = await this.getOne(crop);
    if (!(section in data)) {
      throw new NotFoundException(
        `Section "${section}" non trouvée dans ${crop}. Sections disponibles : ${Object.keys(data).join(', ')}`,
      );
    }
    return data[section];
  }

  async validateSection(
    crop: string,
    section: string,
    value: unknown,
  ): Promise<{ valid: boolean; errors: ValidationError[] }> {
    const data = await this.getOne(crop);

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

  async updateSection(
    crop: string,
    section: string,
    value: unknown,
  ): Promise<{ success: boolean; crop: string; section: string }> {
    const data = await this.getOne(crop);

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
      throw new BadRequestException({ message: 'Schema validation failed', errors });
    }

    data[section] = value;

    // Update metadata date
    if (data.metadata && typeof data.metadata === 'object') {
      (data.metadata as Record<string, unknown>).last_modified = new Date()
        .toISOString()
        .slice(0, 10);
    }

    const metadata = data.metadata as Record<string, string> | undefined;
    const version = metadata?.version ?? 'unknown';

    const { error } = await this.supabase
      .from('crop_ai_references')
      .update({ reference_data: data, version, updated_at: new Date().toISOString() })
      .eq('crop_type', crop.toLowerCase());

    if (error) {
      throw new BadRequestException(`Failed to update referential: ${error.message}`);
    }

    this.logger.log(`Updated section "${section}" in ${crop}`);

    // Clear the crop-reference-loader in-memory cache
    try {
      const { reloadCropReferences } = require('../calibration/crop-reference-loader');
      reloadCropReferences();
    } catch {
      // loader may not be available in all contexts
    }

    return { success: true, crop, section };
  }

  async create(
    crop: string,
    templateCrop?: string,
  ): Promise<{ success: boolean; crop: string }> {
    const normalized = crop.toLowerCase().replace(/\s+/g, '_');

    // Check if already exists
    const { data: existing } = await this.supabase
      .from('crop_ai_references')
      .select('id')
      .eq('crop_type', normalized)
      .maybeSingle();

    if (existing) {
      throw new BadRequestException(`Le référentiel "${normalized}" existe déjà.`);
    }

    let refData: Record<string, unknown>;

    if (templateCrop) {
      const templateData = await this.getOne(templateCrop);
      refData = this.createEmptyFromTemplate(templateData) as Record<string, unknown>;
    } else {
      refData = {};
    }

    refData.metadata = {
      version: '1.0',
      date: new Date().toISOString().slice(0, 7),
      culture: normalized,
      pays: 'Maroc',
      usage: 'LLM_direct_read — no parser needed',
    };

    const { error } = await this.supabase
      .from('crop_ai_references')
      .insert({
        crop_type: normalized,
        version: '1.0',
        reference_data: refData,
      });

    if (error) {
      throw new BadRequestException(`Failed to create referential: ${error.message}`);
    }

    this.logger.log(`Created referential "${normalized}"${templateCrop ? ` from template ${templateCrop}` : ''}`);
    return { success: true, crop: normalized };
  }

  async getSchema(crop: string): Promise<Record<string, unknown>> {
    const data = await this.getOne(crop);
    return this.extractSchema(data) as Record<string, unknown>;
  }

  // =============================================
  // Schema validation (unchanged — pure logic)
  // =============================================

  private validateStructure(
    original: unknown,
    newVal: unknown,
    currentPath: string,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (original === null || original === undefined) return errors;
    if (newVal === null || newVal === undefined) return errors;

    const origType = Array.isArray(original) ? 'array' : typeof original;
    const newType = Array.isArray(newVal) ? 'array' : typeof newVal;

    if (origType !== newType) {
      errors.push({ path: currentPath, message: `Type mismatch: expected ${origType}, got ${newType}` });
      return errors;
    }

    if (origType === 'string' || origType === 'number' || origType === 'boolean') {
      return errors;
    }

    if (origType === 'array') {
      const origArr = original as unknown[];
      const newArr = newVal as unknown[];
      if (origArr.length > 0 && newArr.length > 0) {
        const template = origArr[0];
        if (template && typeof template === 'object' && !Array.isArray(template)) {
          for (let i = 0; i < newArr.length; i++) {
            errors.push(...this.validateStructure(template, newArr[i], `${currentPath}[${i}]`));
          }
        }
      }
      return errors;
    }

    if (origType === 'object') {
      const origObj = original as Record<string, unknown>;
      const newObj = newVal as Record<string, unknown>;
      const origKeys = new Set(Object.keys(origObj));
      const newKeys = new Set(Object.keys(newObj));

      for (const key of origKeys) {
        if (!newKeys.has(key)) {
          errors.push({ path: `${currentPath}.${key}`, message: `Missing key "${key}"` });
        }
      }
      for (const key of newKeys) {
        if (!origKeys.has(key)) {
          errors.push({ path: `${currentPath}.${key}`, message: `Unexpected key "${key}"` });
        }
      }
      for (const key of origKeys) {
        if (newKeys.has(key)) {
          errors.push(...this.validateStructure(origObj[key], newObj[key], `${currentPath}.${key}`));
        }
      }
    }

    return errors;
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

  private createEmptyFromTemplate(template: unknown): unknown {
    if (template === null || template === undefined) return null;
    if (typeof template === 'string') return '';
    if (typeof template === 'number') return 0;
    if (typeof template === 'boolean') return false;

    if (Array.isArray(template)) {
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
