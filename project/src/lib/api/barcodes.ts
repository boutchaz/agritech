import { apiClient } from '../api-client';
import { requireOrganizationId } from './createCrudApi';
import type {
  ItemBarcode,
  ScanResult,
  CreateBarcodeInput,
  UpdateBarcodeInput,
  BarcodeValidation,
} from '../../types/barcode';

const BASE_URL = '/api/v1/barcodes';

export const barcodesApi = {
  async getAllForItem(itemId: string, organizationId?: string): Promise<ItemBarcode[]> {
    return apiClient.get<ItemBarcode[]>(`${BASE_URL}/item/${itemId}`, {}, organizationId);
  },

  async getAllForVariant(variantId: string, organizationId?: string): Promise<ItemBarcode[]> {
    return apiClient.get<ItemBarcode[]>(`${BASE_URL}/variant/${variantId}`, {}, organizationId);
  },

  async create(data: CreateBarcodeInput, organizationId?: string): Promise<ItemBarcode> {
    return apiClient.post<ItemBarcode>(BASE_URL, data, {}, organizationId);
  },

  async update(id: string, data: UpdateBarcodeInput, organizationId?: string): Promise<ItemBarcode> {
    return apiClient.patch<ItemBarcode>(`${BASE_URL}/${id}`, data, {}, organizationId);
  },

  async remove(id: string, organizationId?: string): Promise<void> {
    return apiClient.delete<void>(`${BASE_URL}/${id}`, {}, organizationId);
  },

  async scan(value: string, organizationId?: string): Promise<ScanResult> {
    requireOrganizationId(organizationId, 'barcodesApi.scan');
    return apiClient.get<ScanResult>(`${BASE_URL}/scan/${encodeURIComponent(value)}`, {}, organizationId);
  },

  async validate(barcode: string, barcodeType?: string, organizationId?: string): Promise<BarcodeValidation> {
    return apiClient.post<BarcodeValidation>(`${BASE_URL}/validate`, { barcode, barcode_type: barcodeType }, {}, organizationId);
  },

  async generate(data: { item_id?: string; variant_id?: string }, organizationId?: string): Promise<{ barcode: string }> {
    return apiClient.post<{ barcode: string }>(`${BASE_URL}/generate`, data, {}, organizationId);
  },

  async regenerate(id: string, organizationId?: string): Promise<{ barcode: string }> {
    return apiClient.post<{ barcode: string }>(`${BASE_URL}/regenerate/${id}`, {}, {}, organizationId);
  },
};
