import { useTranslation } from 'react-i18next';
import { useCurrency } from '@/hooks/useCurrency';
import { Badge } from '@/components/ui/badge';

interface StockValueProps {
  value: number | null | undefined;
  className?: string;
}

export function StockValue({ value, className }: StockValueProps) {
  const { t } = useTranslation('stock');
  const { format } = useCurrency();
  const v = Number(value ?? 0);
  if (!v) {
    return (
      <Badge variant="outline" className={className}>
        {t('stock.valuation.pending', 'Valorisation en attente')}
      </Badge>
    );
  }
  return <span className={className}>{format(v)}</span>;
}
