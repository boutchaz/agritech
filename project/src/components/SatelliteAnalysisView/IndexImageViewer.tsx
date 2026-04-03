import React from 'react';
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

const IndexImageViewer: React.FC<IndexImageViewerProps> = ({
  parcelId,
  parcelName,
  boundary
}) => {
  const { t } = useTranslation('satellite');

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto p-4 md:p-6 bg-slate-50/50 rounded-xl">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 rounded-lg shadow-emerald-200 shadow-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('satellite:heatmap.title')}</h1>
          </div>
          <p className="text-slate-500 text-sm flex items-center gap-2 pl-1">
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
