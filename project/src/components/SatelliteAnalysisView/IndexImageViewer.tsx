
import { Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import InteractiveIndexViewer from './InteractiveIndexViewer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface IndexImageViewerProps {
  parcelId: string;
  parcelName?: string;
  farmId?: string;
  boundary?: number[][];
}

const IndexImageViewer = ({
  parcelId,
  parcelName,
  boundary
}: IndexImageViewerProps) => {
  const { t } = useTranslation('satellite');

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-6 rounded-xl border border-transparent bg-slate-50/50 p-4 md:p-6 dark:border-slate-800/80 dark:bg-slate-900/50">
      {/* Header Section */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-emerald-600 p-2 shadow-lg shadow-emerald-200 dark:shadow-emerald-950/40">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{t('satellite:heatmap.title')}</h1>
          </div>
          <p className="flex items-center gap-2 pl-1 text-sm text-slate-500 dark:text-slate-400">
            {parcelName
              ? t('satellite:heatmap.subtitle', { name: parcelName })
              : t('satellite:heatmap.subtitleFallback', { id: parcelId })}
          </p>
        </div>
      </div>

      <InteractiveIndexViewer
        parcelId={parcelId}
        parcelName={parcelName}
        boundary={boundary}
      />
    </div>
  );
};

export default IndexImageViewer;
