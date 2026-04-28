import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './useAuth';
import { barcodesApi } from '../lib/api/barcodes';
import type { ScanResult } from '../types/barcode';
import { toast } from 'sonner';

interface UseBarcodeScannerOptions {
  items: Array<{ item_id: string; quantity: number; unit?: string; batch_number?: string }>;
  onItemFound: (result: ScanResult) => void;
  onNotFound?: (barcode: string) => void;
  warehouseId?: string;
  autoIncrement?: boolean;
}

interface UseBarcodeScannerReturn {
  scanValue: string;
  setScanValue: (value: string) => void;
  isScanning: boolean;
  lastResult: ScanResult | null;
  error: string | null;
  handleScan: (value: string) => void;
  clearResult: () => void;
}

export function useBarcodeScanner(options: UseBarcodeScannerOptions): UseBarcodeScannerReturn {
  const { items, onItemFound, onNotFound, warehouseId, autoIncrement = true } = options;
  const { currentOrganization } = useAuth();
  const { t } = useTranslation('stock');

  const [scanValue, setScanValue] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearResult = useCallback(() => {
    setLastResult(null);
    setError(null);
  }, []);

  const handleScan = useCallback(
    async (value: string) => {
      if (!value.trim() || isScanning) return;

      setIsScanning(true);
      setError(null);

      try {
        if (!currentOrganization?.id) {
          setError(t('barcode.notFound', 'No item found for this barcode'));
          onNotFound?.(value);
          return;
        }

        const result = await barcodesApi.scan(value.trim(), currentOrganization.id);

        if (!result || !result.item_id) {
          if (result?.warehouse_id) {
            onItemFound(result);
            setLastResult(result);
            toast.success(t('barcode.warehouseSet', 'Warehouse {{name}} set for next scans', { name: result.warehouse_name || result.warehouse_id }));
          } else {
            setError(t('barcode.notFound', 'No item found for this barcode'));
            onNotFound?.(value);
            toast.error(t('barcode.notFound', 'No item found for this barcode'));
          }
          return;
        }

        setLastResult(result);
        onItemFound(result);
        toast.success(t('barcode.itemAdded', 'Item added: {{itemName}}', { itemName: result.item_name }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Scan failed';
        setError(message);
        onNotFound?.(value);
        toast.error(t('barcode.scanFailed', 'Scan failed: {{error}}', { error: message }));
      } finally {
        setIsScanning(false);
      }
    },
    [isScanning, currentOrganization?.id, items, onItemFound, onNotFound, t, warehouseId, autoIncrement],
  );

  return { scanValue, setScanValue, isScanning, lastResult, error, handleScan, clearResult };
}
