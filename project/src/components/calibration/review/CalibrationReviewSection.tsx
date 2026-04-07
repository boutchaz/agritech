import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCalibrationReview } from '@/hooks/useCalibrationReview';
import { Level1Decision } from './Level1Decision';
import { Level2Diagnostic } from './Level2Diagnostic';
import { Level3Biophysical } from './Level3Biophysical';
import { Level4Temporal } from './Level4Temporal';
import { Level5QualityAudit } from './Level5QualityAudit';
import { ExpertLecture } from './ExpertLecture';
import { CalibrationExportButton } from './CalibrationExportButton';
import { SectionLoader } from '@/components/ui/loader';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import {
  Activity,
  Target,
  Leaf,
  Calendar,
  Shield,
  FileCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Step1Output } from '@/types/calibration-output';

interface CalibrationReviewSectionProps {
  parcelId: string;
}

const LEVEL_CONFIG = [
  { key: 'level1', icon: Activity, color: 'text-blue-500', borderColor: 'border-l-blue-500' },
  { key: 'level2', icon: Target, color: 'text-indigo-500', borderColor: 'border-l-indigo-500' },
  { key: 'level3', icon: Leaf, color: 'text-emerald-500', borderColor: 'border-l-emerald-500' },
  { key: 'level4', icon: Calendar, color: 'text-purple-500', borderColor: 'border-l-purple-500' },
  { key: 'level5', icon: Shield, color: 'text-slate-500', borderColor: 'border-l-slate-500' },
] as const;

export function CalibrationReviewSection({ parcelId }: CalibrationReviewSectionProps) {
  const { t } = useTranslation('ai');
  const tKey = 'calibrationReview';
  const { data: review, isLoading } = useCalibrationReview(parcelId);
  const [openLevels, setOpenLevels] = useState<Record<string, boolean>>({
    level1: true,
    level2: false,
    level3: false,
    level4: false,
    level5: false,
  });

  if (isLoading) {
    return <SectionLoader className="h-64 py-0" />;
  }

  if (!review) {
    return null;
  }

  const toggleLevel = (key: string) => {
    setOpenLevels((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderLevel = (levelKey: string) => {
    switch (levelKey) {
      case 'level1':
        return <Level1Decision data={review.level1_decision} />;
      case 'level2':
        return <Level2Diagnostic data={review.level2_diagnostic} />;
      case 'level3':
        return <Level3Biophysical data={review.level3_biophysical} />;
      case 'level4':
        return (
          <Level4Temporal
            data={review.level4_temporal}
            step1={review.output.step1 as Step1Output | undefined}
            plantingYear={review.planting_year}
          />
        );
      case 'level5':
        return <Level5QualityAudit data={review.level5_quality_audit} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4" data-testid="calibration-review-section">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          {t(`${tKey}.title`)}
        </h3>
        <CalibrationExportButton calibrationId={review.calibration_id} />
      </div>

      <ExpertLecture audit={review.expert_audit} />

      {LEVEL_CONFIG.map((level) => {
        const isOpen = openLevels[level.key];
        const Icon = level.icon;

        return (
          <Collapsible
            key={level.key}
            open={isOpen}
            onOpenChange={() => toggleLevel(level.key)}
          >
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-lg border-l-4',
                  'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800',
                  level.borderColor,
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn('h-5 w-5', level.color)} />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {t(`${tKey}.${level.key}.title`)}
                  </span>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pt-2">
                {renderLevel(level.key)}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
