import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { BarcodeType, CreateBarcodeDto } from './dto/create-barcode.dto';
import { UpdateBarcodeDto } from './dto/update-barcode.dto';

export interface ScanResult {
  item_id?: string;
  item_code?: string;
  item_name?: string;
  variant_id?: string;
  barcode?: string;
  barcode_type?: string | null;
  unit_id?: string | null;
  unit_name?: string | null;
  batch_no?: string;
  warehouse_id?: string;
  warehouse_name?: string;
  has_batch_no?: boolean;
  has_serial_no?: boolean;
}

export interface BarcodeValidationResult {
  isValid: boolean;
  barcode: string;
  barcode_type?: string;
  reason?: string;
}

@Injectable()
export class BarcodeService {
  private readonly logger = new Logger(BarcodeService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async create(dto: CreateBarcodeDto, organizationId: string, userId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();
    const normalizedBarcode = dto.barcode.trim();
    const barcodeType = dto.barcode_type === 'AUTO' ? undefined : (dto.barcode_type || undefined);
    const isVariant = !!dto.variant_id;

    if (isVariant) {
      await this.ensureVariantExists(dto.variant_id!, organizationId);
    } else if (dto.item_id) {
      await this.ensureItemExists(dto.item_id, organizationId);
    } else {
      throw new BadRequestException('Either item_id or variant_id is required');
    }

    await this.ensureBarcodeUnique(normalizedBarcode, organizationId);

    if (barcodeType) {
      this.assertBarcodeIsValid(normalizedBarcode, barcodeType);
    }

    const targetId = isVariant ? dto.variant_id! : dto.item_id!;
    const table = isVariant ? 'variant_barcodes' : 'item_barcodes';
    const fkCol = isVariant ? 'variant_id' : 'item_id';

    if (dto.is_primary) {
      await this.unsetPrimaryBarcodes(targetId, organizationId, isVariant);
    }

    const { data, error } = await supabase
      .from(table)
      .insert({
        organization_id: organizationId,
        [fkCol]: targetId,
        barcode: normalizedBarcode,
        barcode_type: dto.barcode_type === 'AUTO' ? null : (dto.barcode_type || null),
        unit_id: dto.unit_id || null,
        is_primary: dto.is_primary ?? false,
        is_active: true,
        created_by: userId,
        updated_by: userId,
      })
      .select('*')
      .single();

    if (error) {
      this.logger.error(`Failed to create barcode: ${error.message}`);
      throw new BadRequestException(`Failed to create barcode: ${error.message}`);
    }

    return data;
  }

  async findByItem(itemId: string, organizationId: string): Promise<any[]> {
    await this.ensureItemExists(itemId, organizationId);

    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('item_barcodes')
      .select('*, unit:work_units(id, name, code)')
      .eq('organization_id', organizationId)
      .eq('item_id', itemId)
      .is('deleted_at', null)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      this.logger.error(`Failed to fetch item barcodes: ${error.message}`);
      throw new BadRequestException(`Failed to fetch item barcodes: ${error.message}`);
    }

    return data || [];
  }

  async findByVariant(variantId: string, organizationId: string): Promise<any[]> {
    await this.ensureVariantExists(variantId, organizationId);

    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('variant_barcodes')
      .select('*, unit:work_units(id, name, code)')
      .eq('organization_id', organizationId)
      .eq('variant_id', variantId)
      .is('deleted_at', null)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      this.logger.error(`Failed to fetch variant barcodes: ${error.message}`);
      throw new BadRequestException(`Failed to fetch variant barcodes: ${error.message}`);
    }

    return data || [];
  }

  async update(id: string, dto: UpdateBarcodeDto, organizationId: string, userId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();
    const existing = await this.findOneBarcode(id, organizationId);
    const nextBarcode = dto.barcode?.trim() ?? existing.barcode;
    const nextType = (dto.barcode_type === 'AUTO' ? undefined : dto.barcode_type) ?? existing.barcode_type ?? undefined;

    if (dto.barcode && nextBarcode !== existing.barcode) {
      await this.ensureBarcodeUnique(nextBarcode, organizationId, id);
    }

    if (nextType && nextBarcode) {
      this.assertBarcodeIsValid(nextBarcode, nextType);
    }

    if (dto.is_primary === true) {
      const targetId = existing._table === 'variant_barcodes' ? existing.variant_id : existing.item_id;
      await this.unsetPrimaryBarcodes(targetId, organizationId, existing._table, id);
    }

    const table = existing._table || 'item_barcodes';

    const updateData: Record<string, unknown> = {
      updated_by: userId,
    };

    if (dto.barcode !== undefined) updateData.barcode = nextBarcode;
    if (dto.barcode_type !== undefined) updateData.barcode_type = dto.barcode_type === 'AUTO' ? null : (dto.barcode_type || null);
    if (dto.unit_id !== undefined) updateData.unit_id = dto.unit_id || null;
    if (dto.is_primary !== undefined) updateData.is_primary = dto.is_primary;
    if (dto.is_active !== undefined) updateData.is_active = dto.is_active;

    const { data, error } = await supabase
      .from(table)
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .select('*')
      .single();

    if (error) {
      this.logger.error(`Failed to update barcode: ${error.message}`);
      throw new BadRequestException(`Failed to update barcode: ${error.message}`);
    }

    return data;
  }

  async remove(id: string, organizationId: string, userId: string): Promise<{ message: string }> {
    const supabase = this.databaseService.getAdminClient();
    const existing = await this.findOneBarcode(id, organizationId);
    const table = existing._table || 'item_barcodes';

    const { error } = await supabase
      .from(table)
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
        is_primary: false,
        updated_by: userId,
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null);

    if (error) {
      this.logger.error(`Failed to delete barcode: ${error.message}`);
      throw new BadRequestException(`Failed to delete barcode: ${error.message}`);
    }

    return { message: 'Barcode deleted successfully' };
  }

  async scanBarcode(searchValue: string, organizationId: string): Promise<ScanResult> {
    const barcodeValue = searchValue.trim();

    if (!barcodeValue) {
      return {};
    }

    const itemBarcodeMatch = await this.findBarcodeRecord(barcodeValue, organizationId);
    if (itemBarcodeMatch) {
      return this.enrichItemResult({
        item_id: itemBarcodeMatch.item_id,
        barcode: itemBarcodeMatch.barcode,
        barcode_type: itemBarcodeMatch.barcode_type,
        unit_id: itemBarcodeMatch.unit_id,
        unit_name: itemBarcodeMatch.unit?.name || null,
      }, organizationId);
    }

    const variantBarcodeMatch = await this.findVariantBarcodeRecord(barcodeValue, organizationId);
    if (variantBarcodeMatch) {
      return this.enrichItemResult({
        item_id: variantBarcodeMatch.item_id,
        variant_id: variantBarcodeMatch.variant_id,
        barcode: variantBarcodeMatch.barcode,
        barcode_type: variantBarcodeMatch.barcode_type,
        unit_id: variantBarcodeMatch.unit_id,
        unit_name: variantBarcodeMatch.unit?.name || null,
      }, organizationId);
    }

    const itemMatch = await this.findItemBarcodeFallback(barcodeValue, organizationId);
    if (itemMatch) {
      return this.enrichItemResult({ item_id: itemMatch.id }, organizationId);
    }

    const variantMatch = await this.findVariantBarcodeFallback(barcodeValue, organizationId);
    if (variantMatch) {
      return this.enrichItemResult({ item_id: variantMatch.item_id, variant_id: variantMatch.id }, organizationId);
    }

    const batchMatch = await this.findBatchMatch(barcodeValue, organizationId);
    if (batchMatch) {
      return this.enrichItemResult({ item_id: batchMatch.item_id, batch_no: batchMatch.batch_no }, organizationId);
    }

    const warehouseMatch = await this.findWarehouseMatch(barcodeValue, organizationId);
    if (warehouseMatch) {
      return {
        warehouse_id: warehouseMatch.id,
        warehouse_name: warehouseMatch.name,
      };
    }

    return {};
  }

  validateBarcode(barcode: string, barcodeType?: string): BarcodeValidationResult {
    const normalizedBarcode = barcode.trim();

    if (!normalizedBarcode) {
      return {
        isValid: false,
        barcode,
        barcode_type: barcodeType,
        reason: 'Barcode is required',
      };
    }

    if (!barcodeType) {
      return { isValid: true, barcode: normalizedBarcode };
    }

    const validation = this.getValidationResult(normalizedBarcode, barcodeType);
    return {
      isValid: validation.isValid,
      barcode: normalizedBarcode,
      barcode_type: barcodeType,
      reason: validation.reason,
    };
  }

  private async ensureItemExists(itemId: string, organizationId: string): Promise<void> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('items')
      .select('id')
      .eq('id', itemId)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to fetch item: ${error.message}`);
      throw new BadRequestException(`Failed to fetch item: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Item not found');
    }
  }

  private async ensureVariantExists(variantId: string, organizationId: string): Promise<void> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('product_variants')
      .select('id')
      .eq('id', variantId)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to fetch variant: ${error.message}`);
      throw new BadRequestException(`Failed to fetch variant: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Product variant not found');
    }
  }

  private async ensureBarcodeUnique(barcode: string, organizationId: string, excludeId?: string): Promise<void> {
    const supabase = this.databaseService.getAdminClient();

    for (const table of ['item_barcodes', 'variant_barcodes']) {
      let query = supabase
        .from(table)
        .select('id', { head: false })
        .eq('organization_id', organizationId)
        .eq('barcode', barcode)
        .is('deleted_at', null)
        .limit(1);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error(`Failed to check barcode uniqueness in ${table}: ${error.message}`);
        throw new BadRequestException(`Failed to check barcode uniqueness: ${error.message}`);
      }

      if (data && data.length > 0) {
        throw new BadRequestException(`Barcode "${barcode}" already exists in ${table}`);
      }
    }
  }

  private async unsetPrimaryBarcodes(
    targetId: string,
    organizationId: string,
    table: string | boolean = 'item_barcodes',
    excludeId?: string,
  ): Promise<void> {
    const supabase = this.databaseService.getAdminClient();
    const tableName = table === true ? 'variant_barcodes' : (table === 'variant_barcodes' ? 'variant_barcodes' : 'item_barcodes');
    const fkCol = tableName === 'variant_barcodes' ? 'variant_id' : 'item_id';

    let query = supabase
      .from(tableName)
      .update({ is_primary: false })
      .eq('organization_id', organizationId)
      .eq(fkCol, targetId)
      .is('deleted_at', null);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { error } = await query;

    if (error) {
      this.logger.error(`Failed to unset primary barcodes: ${error.message}`);
      throw new BadRequestException(`Failed to unset primary barcodes: ${error.message}`);
    }
  }

  private async findOneBarcode(id: string, organizationId: string): Promise<any> {
    const supabase = this.databaseService.getAdminClient();

    for (const table of ['item_barcodes', 'variant_barcodes']) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) {
        this.logger.error(`Failed to fetch barcode from ${table}: ${error.message}`);
        continue;
      }

      if (data) return { ...data, _table: table };
    }

    throw new NotFoundException('Barcode not found');
  }

  private async findBarcodeRecord(barcode: string, organizationId: string): Promise<any | null> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('item_barcodes')
      .select('item_id, barcode, barcode_type, unit_id, unit:work_units(id, name)')
      .eq('organization_id', organizationId)
      .eq('barcode', barcode)
      .eq('is_active', true)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to scan item_barcodes: ${error.message}`);
      throw new BadRequestException(`Failed to scan item_barcodes: ${error.message}`);
    }

    return data;
  }

  private async findItemBarcodeFallback(barcode: string, organizationId: string): Promise<any | null> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('items')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('barcode', barcode)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to scan items barcode: ${error.message}`);
      throw new BadRequestException(`Failed to scan items barcode: ${error.message}`);
    }

    return data;
  }

  private async findVariantBarcodeFallback(barcode: string, organizationId: string): Promise<any | null> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('product_variants')
      .select('id, item_id')
      .eq('organization_id', organizationId)
      .eq('barcode', barcode)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to scan product variant barcode: ${error.message}`);
      throw new BadRequestException(`Failed to scan product variant barcode: ${error.message}`);
    }

    return data;
  }

  private async findVariantBarcodeRecord(barcode: string, organizationId: string): Promise<any | null> {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('variant_barcodes')
      .select('variant_id, item_id:product_variants(item_id), barcode, barcode_type, unit_id, unit:work_units(id, name)')
      .eq('organization_id', organizationId)
      .eq('barcode', barcode)
      .eq('is_active', true)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to scan variant_barcodes: ${error.message}`);
      throw new BadRequestException(`Failed to scan variant_barcodes: ${error.message}`);
    }

    return data;
  }

  private async findBatchMatch(barcode: string, organizationId: string): Promise<{ item_id: string; batch_no: string } | null> {
    const supabase = this.databaseService.getAdminClient();
    const attempts = [
      async () => supabase
        .from('batches')
        .select('item_id, batch_number')
        .eq('organization_id', organizationId)
        .eq('batch_number', barcode)
        .maybeSingle(),
      async () => supabase
        .from('reception_batches')
        .select('item_id, batch_number')
        .eq('organization_id', organizationId)
        .eq('batch_number', barcode)
        .maybeSingle(),
      async () => supabase
        .from('reception_batches')
        .select('item_id, batch_code')
        .eq('organization_id', organizationId)
        .eq('batch_code', barcode)
        .maybeSingle(),
    ];

    for (const attempt of attempts) {
      try {
        const { data, error } = await attempt();
        if (error) {
          if (this.isMissingRelationOrColumn(error.message)) {
            continue;
          }
          this.logger.error(`Failed to scan batch barcode: ${error.message}`);
          throw new BadRequestException(`Failed to scan batch barcode: ${error.message}`);
        }

        if (data) {
          const batchNo = 'batch_number' in data
            ? data.batch_number
            : 'batch_code' in data
              ? data.batch_code
              : barcode;
          return {
            item_id: data.item_id,
            batch_no: batchNo,
          };
        }
      } catch (error) {
        if (this.isMissingRelationOrColumn(error?.message)) {
          continue;
        }
        throw error;
      }
    }

    return null;
  }

  private async findWarehouseMatch(value: string, organizationId: string): Promise<any | null> {
    const supabase = this.databaseService.getAdminClient();
    let query = supabase
      .from('warehouses')
      .select('id, name')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .or(`name.eq.${value},code.eq.${value}`)
      .limit(1);

    const { data, error } = await query;

    if (error) {
      if (this.isMissingRelationOrColumn(error.message)) {
        const fallback = await supabase
          .from('warehouses')
          .select('id, name')
          .eq('organization_id', organizationId)
          .is('deleted_at', null)
          .eq('name', value)
          .limit(1);

        if (fallback.error) {
          this.logger.error(`Failed to scan warehouse: ${fallback.error.message}`);
          throw new BadRequestException(`Failed to scan warehouse: ${fallback.error.message}`);
        }

        return fallback.data?.[0] || null;
      }

      this.logger.error(`Failed to scan warehouse: ${error.message}`);
      throw new BadRequestException(`Failed to scan warehouse: ${error.message}`);
    }

    return data?.[0] || null;
  }

  private async enrichItemResult(result: ScanResult, organizationId: string): Promise<ScanResult> {
    if (!result.item_id) {
      return result;
    }

    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase
      .from('items')
      .select('id, item_code, item_name, has_batch_no, has_serial_no')
      .eq('id', result.item_id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to fetch scanned item details: ${error.message}`);
      throw new BadRequestException(`Failed to fetch scanned item details: ${error.message}`);
    }

    if (!data) {
      return result;
    }

    return {
      ...result,
      item_id: data.id,
      item_code: data.item_code,
      item_name: data.item_name,
      has_batch_no: data.has_batch_no,
      has_serial_no: data.has_serial_no,
    };
  }

  private assertBarcodeIsValid(barcode: string, barcodeType: string): void {
    const validation = this.getValidationResult(barcode, barcodeType);
    if (!validation.isValid) {
      throw new BadRequestException(validation.reason || 'Invalid barcode');
    }
  }

  private getValidationResult(barcode: string, barcodeType: string): { isValid: boolean; reason?: string } {
    switch (barcodeType) {
      case BarcodeType.EAN:
      case BarcodeType.EAN_13:
      case BarcodeType.JAN:
      case BarcodeType.ISBN_13:
        return this.validateMod10Barcode(barcode, 13, barcodeType);
      case BarcodeType.EAN_8:
        return this.validateMod10Barcode(barcode, 8, barcodeType);
      case BarcodeType.UPC:
      case BarcodeType.UPC_A:
        return this.validateMod10Barcode(barcode, 12, barcodeType);
      case BarcodeType.CODE_39:
        return /^[0-9A-Z\-\. \$/\+%]+$/.test(barcode)
          ? { isValid: true }
          : { isValid: false, reason: 'CODE-39 contains invalid characters' };
      case BarcodeType.QR:
      case BarcodeType.CODE_128:
      case BarcodeType.GS1:
      case BarcodeType.GTIN:
      case BarcodeType.GTIN_14:
      case BarcodeType.ISBN:
      case BarcodeType.ISBN_10:
      case BarcodeType.ISSN:
      case BarcodeType.PZN:
        return { isValid: true };
      default:
        return { isValid: true };
    }
  }

  private validateMod10Barcode(barcode: string, expectedLength: number, label: string): { isValid: boolean; reason?: string } {
    if (!/^\d+$/.test(barcode)) {
      return { isValid: false, reason: `${label} must contain digits only` };
    }

    if (barcode.length !== expectedLength) {
      return { isValid: false, reason: `${label} must be ${expectedLength} digits long` };
    }

    const digits = barcode.split('').map(Number);
    const checkDigit = digits[digits.length - 1];
    const body = digits.slice(0, -1);

    const sum = body
      .reverse()
      .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);

    const computedCheckDigit = (10 - (sum % 10)) % 10;
    if (computedCheckDigit !== checkDigit) {
      return { isValid: false, reason: `${label} checksum is invalid` };
    }

    return { isValid: true };
  }

  async generate(itemId?: string, variantId?: string, organizationId?: string): Promise<{ barcode: string }> {
    const supabase = this.databaseService.getAdminClient();

    const table = variantId ? 'variant_barcodes' : 'item_barcodes';
    const fkCol = variantId ? 'variant_id' : 'item_id';
    const targetId = variantId || itemId;

    if (!targetId || !organizationId) {
      throw new BadRequestException('Item ID or variant ID and organization ID are required');
    }

    const existingCount = await this.countBarcodesForTarget(table, fkCol, targetId, organizationId);
    const productCode = String(10000 + existingCount).slice(-5);

    const ean13 = this.computeEAN13(organizationId, productCode);

    const { error } = await supabase
      .from(table)
      .insert({
        organization_id: organizationId,
        [fkCol]: targetId,
        barcode: ean13,
        barcode_type: 'EAN-13',
        is_primary: existingCount === 0,
        is_active: true,
      });

    if (error) {
      this.logger.error(`Failed to auto-generate barcode: ${error.message}`);
      throw new BadRequestException(`Failed to auto-generate barcode: ${error.message}`);
    }

    return { barcode: ean13 };
  }

  async regenerate(id: string, organizationId: string, userId: string): Promise<{ barcode: string }> {
    const supabase = this.databaseService.getAdminClient();
    const existing = await this.findOneBarcode(id, organizationId);
    const table = existing._table || 'item_barcodes';
    const fkCol = table === 'variant_barcodes' ? 'variant_id' : 'item_id';
    const targetId = existing[fkCol];

    const existingCount = await this.countBarcodesForTarget(table, fkCol, targetId, organizationId);
    const productCode = String(10000 + existingCount).slice(-5);

    const ean13 = this.computeEAN13(organizationId, productCode);

    const { error } = await supabase
      .from(table)
      .update({
        barcode: ean13,
        barcode_type: 'EAN-13',
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null);

    if (error) {
      this.logger.error(`Failed to regenerate barcode: ${error.message}`);
      throw new BadRequestException(`Failed to regenerate barcode: ${error.message}`);
    }

    return { barcode: ean13 };
  }

  private async countBarcodesForTarget(table: string, fkCol: string, targetId: string, organizationId: string): Promise<number> {
    const supabase = this.databaseService.getAdminClient();
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq(fkCol, targetId)
      .is('deleted_at', null);

    if (error) {
      this.logger.error(`Failed to count barcodes: ${error.message}`);
      return 0;
    }

    return count || 0;
  }

  private computeEAN13(organizationId: string, productCode: string): string {
    const MOROCCO_PREFIX = '611';
    const orgHash = this.hashStringToDigits(organizationId, 4);
    const body = `${MOROCCO_PREFIX}${orgHash}${productCode}`;

    const digits = body.split('').map(Number);
    const sum = digits
      .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 1 : 3), 0);

    const checkDigit = (10 - (sum % 10)) % 10;
    return `${body}${checkDigit}`;
  }

  private hashStringToDigits(str: string, length: number): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString().padStart(length, '0').slice(-length);
  }

  private isMissingRelationOrColumn(message?: string): boolean {
    if (!message) {
      return false;
    }

    return message.includes('Could not find') || message.includes('does not exist');
  }
}
