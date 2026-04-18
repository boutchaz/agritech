import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { BlockFAlternance as BlockFData } from '@/types/calibration-review';

interface BlockFAlternanceProps {
  data: BlockFData;
}

const ALTERNANCE_COLORS: Record<string, string> = {
  faible: 'text-green-600 dark:text-green-400',
  moderee: 'text-yellow-600 dark:text-yellow-400',
  marquee: 'text-orange-600 dark:text-orange-400',
  forte: 'text-red-600 dark:text-red-400',
};

function SeasonBadgeIcon({ badge, className }: { badge: string; className?: string }) {
  switch (badge) {
    case 'on_probable':
      return <TrendingUp className={className} />;
    case 'off_probable':
      return <TrendingDown className={className} />;
    default:
      return <Minus className={className} />;
  }
}

export function BlockFAlternance({ data }: BlockFAlternanceProps) {
  const { t } = useTranslation('ai');

  return (
    <Card data-block="F">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          {t('calibrationReview.blockF.title', 'Alternance')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-2xl font-bold ${ALTERNANCE_COLORS[data.label] ?? ''}`}>
              {data.indice.toFixed(1)}
            </p>
            <p className="text-sm text-muted-foreground capitalize">{data.label}</p>
          </div>
          <div
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white gap-1"
            style={{ backgroundColor: data.next_season.color }}
          >
            <SeasonBadgeIcon badge={data.next_season.badge} className="h-3 w-3" />
            {data.next_season.phrase}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{data.interpretation}</p>

        {data.variety_reference && (
          <div className="text-xs text-muted-foreground bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
            {t('calibrationReview.blockF.varietyRef', 'Référence variétale')} : {data.variety_reference.variety} (indice {data.variety_reference.indice_ref.toFixed(1)})
          </div>
        )}
      </CardContent>
    </Card>
  );
}
