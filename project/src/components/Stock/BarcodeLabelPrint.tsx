import JsBarcode from 'react-jsbarcode';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LabelData {
  text: string;
  subtitle?: string;
  barcode?: string;
}

interface BarcodeLabelPrintProps {
  labels: LabelData[];
}

function LabelCard({ label }: { label: LabelData }) {
  return (
    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 flex flex-col items-center justify-center gap-2 bg-white dark:bg-gray-900 print:border-solid print:border-black min-h-[120px]">
      {label.barcode && (
        <svg ref={(ref) => {
          if (ref) {
            try {
              JsBarcode(ref, label.barcode, {
                format: 'CODE128',
                width: 2,
                height: 60,
                displayValue: true,
                fontSize: 12,
                margin: 5,
              });
            } catch {
              void 0;
            }
          }
        }} />
      )}
      {!label.barcode && (
        <span className="font-mono text-lg tracking-widest font-bold text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white pb-1">
          {label.text}
        </span>
      )}
      {label.subtitle && (
        <span className="text-xs text-gray-600 dark:text-gray-400 text-center">
          {label.subtitle}
        </span>
      )}
    </div>
  );
}

export function BarcodeLabelPrint({ labels }: BarcodeLabelPrintProps) {
  const { t } = useTranslation();

  if (labels.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 print:hidden">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('stock.labels.count', '{{count}} labels', { count: labels.length })}
        </p>
        <Button onClick={() => window.print()} size="sm">
          <Printer className="h-4 w-4 mr-2" />
          {t('stock.labels.print', 'Print Labels')}
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {labels.map((label, index) => (
          <LabelCard key={`${label.text}-${index}`} label={label} />
        ))}
      </div>
    </div>
  );
}
