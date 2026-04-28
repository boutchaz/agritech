export type BarcodeType =
  | 'EAN'
  | 'EAN-8'
  | 'EAN-13'
  | 'UPC'
  | 'UPC-A'
  | 'CODE-39'
  | 'CODE-128'
  | 'GS1'
  | 'GTIN'
  | 'GTIN-14'
  | 'ISBN'
  | 'ISBN-10'
  | 'ISBN-13'
  | 'ISSN'
  | 'JAN'
  | 'PZN'
  | 'QR'
  | 'AUTO';

export const BARCODE_TYPE_OPTIONS: { value: BarcodeType; label: string }[] = [
  { value: 'AUTO', label: 'Auto-detect' },
  { value: 'EAN-13', label: 'EAN-13' },
  { value: 'EAN-8', label: 'EAN-8' },
  { value: 'EAN', label: 'EAN' },
  { value: 'UPC-A', label: 'UPC-A' },
  { value: 'UPC', label: 'UPC' },
  { value: 'CODE-128', label: 'CODE-128' },
  { value: 'CODE-39', label: 'CODE-39' },
  { value: 'QR', label: 'QR Code' },
  { value: 'GS1', label: 'GS1' },
  { value: 'GTIN', label: 'GTIN' },
  { value: 'GTIN-14', label: 'GTIN-14' },
  { value: 'ISBN', label: 'ISBN' },
  { value: 'ISBN-13', label: 'ISBN-13' },
  { value: 'ISSN', label: 'ISSN' },
];

export interface ItemBarcode {
  id: string;
  organization_id: string;
  item_id: string;
  barcode: string;
  barcode_type: BarcodeType;
  unit_id?: string;
  unit_name?: string;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  item?: { id: string; item_code: string; item_name: string };
}

export interface ScanResult {
  item_id: string;
  item_code: string;
  item_name: string;
  variant_id?: string;
  barcode: string;
  barcode_type?: string;
  unit_id?: string;
  unit_name?: string;
  batch_no?: string;
  warehouse_id?: string;
  warehouse_name?: string;
  has_batch_no?: boolean;
  has_serial_no?: boolean;
}

export interface CreateBarcodeInput {
  organization_id: string;
  item_id: string;
  barcode: string;
  barcode_type?: BarcodeType;
  unit_id?: string;
  is_primary?: boolean;
}

export interface UpdateBarcodeInput {
  barcode?: string;
  barcode_type?: BarcodeType;
  unit_id?: string | null;
  is_primary?: boolean;
  is_active?: boolean;
}

export interface BarcodeValidation {
  valid: boolean;
  barcode: string;
  barcode_type: string;
  error?: string;
}
