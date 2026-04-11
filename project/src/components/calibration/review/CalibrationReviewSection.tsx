import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useCalibrationReview } from '@/hooks/useCalibrationReview';
import { useParcelById } from '@/hooks/useParcelsQuery';
import { BlockASynthese } from './BlockASynthese';
import { SpectralChart } from './SpectralChart';
import { ZoneMap } from './ZoneMap';
import { PhenologyDashboard } from './PhenologyDashboard';
import { BlockDAmeliorer } from './BlockDAmeliorer';
import { BlockGMetadonnees } from './BlockGMetadonnees';
import { BlockHValidation } from './BlockHValidation';
import { CalibrationExportButton } from './CalibrationExportButton';
import { SectionLoader } from '@/components/ui/loader';
import { Leaf, Calendar, MapPin, Ruler } from 'lucide-react';

interface CalibrationReviewSectionProps {
  parcelId: string;
}

const SECTION_ANCHORS = [
  { id: 'A', label: 'Synthèse' },
  { id: 'spectral', label: 'Seuils spectraux' },
  { id: 'zones', label: 'Zonage intra-parc.' },
  { id: 'D', label: 'Améliorer précision' },
] as const;

export function CalibrationReviewSection({ parcelId }: CalibrationReviewSectionProps) {
  const { t } = useTranslation('ai');
  const { data: review, isLoading } = useCalibrationReview(parcelId);
  const { data: parcel } = useParcelById(parcelId);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBlock = useCallback((block: string) => {
    const el = containerRef.current?.querySelector(`[data-block="${block}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  if (isLoading) {
    return <SectionLoader className="h-64 py-0" />;
  }

  if (!review) {
    return null;
  }

  const parcelName = parcel?.name ?? `Parcelle ${parcelId.slice(0, 8)}`;
  const variety = parcel?.variety ?? '';
  const surface = parcel?.area ? `${parcel.area} ${parcel.area_unit ?? 'ha'}` : '';
  const system = parcel?.planting_system ?? '';

  return (
    <div data-testid="calibration-review-section" ref={containerRef}>
      {/* ── Header: Parcel info + olive branding ── */}
      <div className="bg-[#2d5016] dark:bg-[#1a3009] rounded-t-xl px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <Leaf className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{parcelName}</h2>
              {variety && <p className="text-sm text-white/70">{variety}</p>}
            </div>
          </div>
          <CalibrationExportButton calibrationId={review.calibration_id} />
        </div>

        {/* Metadata row */}
        <div className="flex flex-wrap gap-4 mt-3 text-xs text-white/60">
          {surface && (
            <span className="flex items-center gap-1">
              <Ruler className="h-3 w-3" />
              Surface : {surface}
            </span>
          )}
          {system && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {t('calibrationReview.header.system', 'Syst\u00e8me')} : {system}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Calibration : {new Date(review.generated_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </span>
          {review.block_b.history_depth.months > 0 && (
            <span>
              Satellite : {review.block_b.history_depth.months} mois
            </span>
          )}
        </div>
      </div>

      {/* ── Body: sidebar nav + content ── */}
      <div className="flex items-start bg-gray-50 dark:bg-gray-950 rounded-b-xl border border-t-0 border-gray-200 dark:border-gray-800">
        {/* Sidebar nav (desktop only) — items-start + self-start so nav isn’t stretched to content height; sticky keeps it in view while scrolling main */}
        <nav className="sticky top-0 z-10 hidden shrink-0 self-start lg:flex w-48 flex-col border-r border-gray-200 bg-gray-50 py-4 px-2 dark:border-gray-800 dark:bg-gray-950">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
            Sections
          </p>
          {SECTION_ANCHORS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollToBlock(section.id)}
              className="text-left text-sm px-3 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {section.label}
            </button>
          ))}
        </nav>

        {/* Main content */}
        <div className="flex-1 p-4 md:p-6 space-y-6 min-w-0">
          {/* Section 1: Synthese executive */}
          <BlockASynthese data={review.block_a} onScrollToBlock={scrollToBlock} />

          {/* Section 2: Spectral thresholds */}
          <SpectralChart data={review.block_b.spectral} />

          {/* Section 2b: Phenology Dashboard */}
          {review.block_b.phenology_dashboard && (
            <PhenologyDashboard data={review.block_b.phenology_dashboard} />
          )}

          {/* Section 3: Intra-parcel zoning */}
          <ZoneMap
            heatmap={review.block_b.heatmap}
            spatialPatterns={review.block_b.spatial_patterns}
            heterogeneityFlag={review.block_b.heterogeneity_flag}
            boundary={parcel?.boundary}
          />

          {/* Section 4: Improve precision */}
          <BlockDAmeliorer data={review.block_d} />

          {/* Metadata */}
          <BlockGMetadonnees data={review.block_g} />
        </div>
      </div>

      {/* ── Validation footer ── */}
      {review.block_h_enabled && (
        <BlockHValidation parcelId={parcelId} calibrationId={review.calibration_id} />
      )}
    </div>
  );
}
