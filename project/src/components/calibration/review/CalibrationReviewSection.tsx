import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useCalibrationReview } from '@/hooks/useCalibrationReview';
import { BlockASynthese } from './BlockASynthese';
import { BlockBAnalyse } from './BlockBAnalyse';
import { BlockDAmeliorer } from './BlockDAmeliorer';
import { BlockGMetadonnees } from './BlockGMetadonnees';
import { BlockHValidation } from './BlockHValidation';
import { CalibrationExportButton } from './CalibrationExportButton';
import { SectionLoader } from '@/components/ui/loader';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import {
  FileCheck,
  BarChart3,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface CalibrationReviewSectionProps {
  parcelId: string;
}

export function CalibrationReviewSection({ parcelId }: CalibrationReviewSectionProps) {
  const { t } = useTranslation('ai');
  const tKey = 'calibrationReview';
  const { data: review, isLoading } = useCalibrationReview(parcelId);
  const containerRef = useRef<HTMLDivElement>(null);
  const [openBlocks, setOpenBlocks] = useState<Record<string, boolean>>({
    B: true,
    D: false,
  });

  const toggleBlock = (key: string) => {
    setOpenBlocks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const scrollToBlock = useCallback((block: string) => {
    const el = containerRef.current?.querySelector(`[data-block="${block}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Open the block if it's collapsible and closed
      setOpenBlocks((prev) => ({ ...prev, [block]: true }));
    }
  }, []);

  if (isLoading) {
    return <SectionLoader className="h-64 py-0" />;
  }

  if (!review) {
    return null;
  }

  return (
    <div className="space-y-4" data-testid="calibration-review-section" ref={containerRef}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          {t(`${tKey}.title`)}
        </h3>
        <CalibrationExportButton calibrationId={review.calibration_id} />
      </div>

      {/* Block A — Always visible, not collapsible */}
      <BlockASynthese data={review.block_a} onScrollToBlock={scrollToBlock} />

      {/* Block B — Collapsible, open by default */}
      <Collapsible open={openBlocks.B} onOpenChange={() => toggleBlock('B')}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className={cn(
              'w-full flex items-center justify-between p-3 rounded-lg border-l-4',
              'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800',
              'border-l-emerald-500',
            )}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-500" />
              <span className="font-medium text-gray-900 dark:text-white">
                {t(`${tKey}.blockB.title`, 'Analyse d\u00e9taill\u00e9e')}
              </span>
            </div>
            {openBlocks.B ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="pt-2">
            <BlockBAnalyse data={review.block_b} />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Block D — Collapsible */}
      <Collapsible open={openBlocks.D} onOpenChange={() => toggleBlock('D')}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className={cn(
              'w-full flex items-center justify-between p-3 rounded-lg border-l-4',
              'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800',
              'border-l-amber-500',
            )}
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              <span className="font-medium text-gray-900 dark:text-white">
                {t(`${tKey}.blockD.title`, 'Am\u00e9liorer la pr\u00e9cision')}
              </span>
            </div>
            {openBlocks.D ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="pt-2">
            <BlockDAmeliorer data={review.block_d} />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Block G — Metadata line */}
      <BlockGMetadonnees data={review.block_g} />

      {/* Block H — Validation (sticky footer, only when enabled) */}
      {review.block_h_enabled && (
        <BlockHValidation parcelId={parcelId} calibrationId={review.calibration_id} />
      )}
    </div>
  );
}
