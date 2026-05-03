import { type ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { BarChart3, Lock, Satellite, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCan } from '@/lib/casl';

export function SatelliteAccessGate({ children }: { children: ReactNode }) {
  const { can } = useCan();
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (can('create', 'SatelliteReport')) {
    return <>{children}</>;
  }

  return (
    <div className="p-6">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <Lock className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t('production.satelliteAnalysis.proFeatureTitle')}
        </h2>
        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
          {t('production.satelliteAnalysis.proFeatureDescription')}
        </p>
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
            <Satellite className="w-4 h-4 text-blue-600" />
            <span>{t('production.satelliteAnalysis.featureRealtime')}</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>{t('production.satelliteAnalysis.featureVegetation')}</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span>{t('production.satelliteAnalysis.featureHistorical')}</span>
          </div>
        </div>
        <Button
          variant="blue"
          onClick={() => navigate({ to: '/settings/subscription' })}
          className="px-6 py-3 rounded-lg font-medium inline-flex items-center gap-2"
        >
          {t('production.satelliteAnalysis.upgradeButton')}
          <span>→</span>
        </Button>
      </div>
    </div>
  );
}
