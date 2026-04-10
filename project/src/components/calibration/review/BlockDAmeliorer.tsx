import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, ArrowRight, Lightbulb } from 'lucide-react';
import type { BlockDAmeliorer as BlockDData } from '@/types/calibration-blocks-review';

interface BlockDAmeliorerProps {
  data: BlockDData;
}

export function BlockDAmeliorer({ data }: BlockDAmeliorerProps) {
  const { t } = useTranslation('ai');
  const totalGain = data.missing_data.reduce((sum, m) => sum + m.gain_points, 0);

  if (data.missing_data.length === 0) {
    return (
      <Card data-block="D">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-green-600 dark:text-green-400">
            <CheckCircle className="h-5 w-5" />
            <p className="font-medium">
              {t('calibrationReview.blockD.allComplete', 'F\u00e9licitations, toutes les donn\u00e9es critiques sont collect\u00e9es.')}
              {' '}{t('calibrationReview.blockD.confidenceAt', 'Confiance')} : {data.current_confidence}/100.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-block="D">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          {t('calibrationReview.blockD.title', 'Am\u00e9liorer la pr\u00e9cision')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Confidence projection */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('calibrationReview.blockD.current', 'Actuel')}
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {data.current_confidence}%
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-blue-500 flex-shrink-0" />
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('calibrationReview.blockD.potential', 'Potentiel')}
            </p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {data.projected_confidence}%
            </p>
          </div>
          <div className="flex-1 text-sm text-gray-600 dark:text-gray-300">
            (+{totalGain} pts)
          </div>
        </div>

        {/* Confidence bar */}
        <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="absolute h-full bg-gray-400 dark:bg-gray-500 rounded-full transition-all"
            style={{ width: `${data.current_confidence}%` }}
          />
          <div
            className="absolute h-full bg-blue-300 dark:bg-blue-700 rounded-full opacity-50 transition-all"
            style={{ width: `${data.projected_confidence}%` }}
          />
        </div>

        {/* Available data */}
        {data.available_data.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('calibrationReview.blockD.availableData', 'Donn\u00e9es d\u00e9j\u00e0 disponibles')}
            </p>
            <div className="flex flex-wrap gap-2">
              {data.available_data.map((item) => (
                <Badge key={item.type} variant="secondary" className="text-green-600 dark:text-green-400">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {item.label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Missing data table */}
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('calibrationReview.blockD.missingData', 'Donn\u00e9es manquantes')}
          </p>
          <div className="border rounded-lg dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-700">
                  <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-400">
                    {t('calibrationReview.blockD.dataType', 'Donn\u00e9e')}
                  </th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600 dark:text-gray-400 w-16">
                    {t('calibrationReview.blockD.gain', 'Gain')}
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-400">
                    {t('calibrationReview.blockD.why', "Pourquoi c'est utile")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.missing_data.map((item) => (
                  <tr key={item.type} className="border-b last:border-0 dark:border-gray-700">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                        <span className="font-medium text-gray-900 dark:text-white">{item.label}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        +{item.gain_points}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300 text-xs">
                      {item.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
