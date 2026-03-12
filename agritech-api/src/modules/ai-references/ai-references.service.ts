import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

const VALID_CROP_TYPES = [
  'olivier',
  'agrumes',
  'avocatier',
  'palmier_dattier',
] as const;

type CropType = (typeof VALID_CROP_TYPES)[number];
type ReferenceData = Record<string, unknown>;

@Injectable()
export class AiReferencesService {
  private readonly logger = new Logger(AiReferencesService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async findByCropType(cropType: string): Promise<ReferenceData> {
    const validatedCropType = this.validateCropType(cropType);
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('crop_ai_references')
      .select('reference_data')
      .eq('crop_type', validatedCropType)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to fetch AI references for ${validatedCropType}: ${error.message}`);
      throw new BadRequestException(`Failed to fetch AI references: ${error.message}`);
    }

    if (!this.hasReferenceData(data)) {
      throw new NotFoundException(`AI references not found for crop type: ${validatedCropType}`);
    }

    return data.reference_data;
  }

  async findVarieties(cropType: string): Promise<unknown[]> {
    const referenceData = await this.findByCropType(cropType);
    const varieties = this.getArrayField(referenceData, ['varietes', 'especes']);

    if (!varieties) {
      throw new NotFoundException(`Varieties not found for crop type: ${cropType}`);
    }

    return varieties;
  }

  async findBbchStages(cropType: string): Promise<unknown> {
    const referenceData = await this.findByCropType(cropType);
    return this.getField(referenceData, 'stades_bbch', cropType, 'BBCH stages');
  }

  async findAlerts(cropType: string): Promise<unknown> {
    const referenceData = await this.findByCropType(cropType);
    return this.getField(referenceData, 'alertes', cropType, 'alerts');
  }

  async findNpkFormulas(cropType: string): Promise<unknown> {
    const referenceData = await this.findByCropType(cropType);
    return this.getField(referenceData, 'fertilisation', cropType, 'NPK formulas');
  }

  private getField(
    referenceData: ReferenceData,
    field: string,
    cropType: string,
    label: string,
  ): unknown {
    const value = referenceData[field];

    if (value === undefined || value === null) {
      throw new NotFoundException(`${label} not found for crop type: ${cropType}`);
    }

    return value;
  }

  private getArrayField(referenceData: ReferenceData, fields: string[]): unknown[] | null {
    for (const field of fields) {
      const value = referenceData[field];
      if (Array.isArray(value)) {
        return value;
      }
    }

    return null;
  }

  private hasReferenceData(data: unknown): data is { reference_data: ReferenceData } {
    if (!data || typeof data !== 'object' || !('reference_data' in data)) {
      return false;
    }

    const referenceData = data.reference_data;
    return !!referenceData && typeof referenceData === 'object' && !Array.isArray(referenceData);
  }

  private validateCropType(cropType: string): CropType {
    if (!this.isValidCropType(cropType)) {
      throw new BadRequestException(
        `Invalid crop type: ${cropType}. Valid crop types are: ${VALID_CROP_TYPES.join(', ')}`,
      );
    }

    return cropType;
  }

  private isValidCropType(cropType: string): cropType is CropType {
    return VALID_CROP_TYPES.includes(cropType as CropType);
  }
}
