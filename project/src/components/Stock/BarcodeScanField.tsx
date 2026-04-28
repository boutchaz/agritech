import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import { ScanBarcode, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BarcodeScanFieldProps {
  value: string;
  onChange: (value: string) => void;
  onScan: (value: string) => void;
  isScanning?: boolean;
  error?: string | null;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export default function BarcodeScanField({
  value,
  onChange,
  onScan,
  isScanning = false,
  error,
  placeholder,
  className,
  autoFocus = true,
}: BarcodeScanFieldProps) {
  const { t } = useTranslation('stock');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim()) {
      onScan(value.trim());
      onChange('');
    }
  };

  return (
    <div className={cn('space-y-1', className)}>
      <div className="relative">
        <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t('barcode.scanPlaceholder', 'Scan or type barcode...')}
          disabled={isScanning}
          className="pl-10 pr-10 font-mono"
        />
        {isScanning && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
