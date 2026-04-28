import { useMemo, type CSSProperties } from 'react';
import { ReactBarcode, Renderer } from 'react-jsbarcode';
import JsBarcode from 'jsbarcode';
import { cn } from '@/lib/utils';

interface BarcodeDisplayProps {
  value: string;
  format?: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  className?: string;
  style?: CSSProperties;
}

function detectFormat(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (/^\d{13}$/.test(digits)) return 'EAN13';
  if (/^\d{8}$/.test(digits)) return 'EAN8';
  if (/^\d{12}$/.test(digits)) return 'UPC';
  return 'CODE128';
}

function isValidBarcode(value: string, format: string): boolean {
  try {
    const el = document.createElement('canvas');
    JsBarcode(el, value, { format });
    return true;
  } catch {
    return false;
  }
}

export function BarcodeDisplay({
  value,
  format,
  width = 1.5,
  height = 50,
  displayValue = true,
  className,
  style,
}: BarcodeDisplayProps) {
  const detectedFormat = useMemo(() => format || detectFormat(value), [format, value]);
  const valid = useMemo(() => isValidBarcode(value, detectedFormat), [value, detectedFormat]);

  if (!valid) {
    return (
      <span className={cn('font-mono text-sm', className)} style={style}>
        {value}
      </span>
    );
  }

  return (
    <div className={cn('inline-flex flex-col items-center', className)}>
      <ReactBarcode
        value={value}
        renderer={Renderer.SVG}
        options={{
          format: detectedFormat,
          width,
          height,
          displayValue,
          fontSize: 12,
          font: 'ui-monospace, monospace',
          textMargin: 4,
          margin: 0,
          background: 'transparent',
        }}
        style={style}
      />
    </div>
  );
}
