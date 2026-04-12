import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from 'react-simple-maps';
import { useSupportedCountries } from '@/hooks/useSupportedCountries';
import type { SupportedCountry } from '@/lib/api/supported-countries';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

/**
 * Maps ISO 3166-1 alpha-2 codes (our DB) to ISO 3166-1 numeric codes (TopoJSON).
 * Only includes countries we might support — extended as needed.
 */
const ALPHA2_TO_NUMERIC: Record<string, string> = {
  AD: '020', AL: '008', AR: '032', AU: '036', BA: '070', BR: '076',
  CA: '124', CH: '756', CL: '152', CO: '170', CR: '188', EC: '218',
  ES: '724', FR: '250', GB: '826', GT: '320', IT: '380', KG: '417',
  KZ: '398', LI: '438', MA: '504', MD: '498', ME: '499', MK: '807',
  MX: '484', NO: '578', NZ: '554', PA: '591', PR: '630', PT: '620',
  PY: '600', RS: '688', SV: '222', SM: '674', TR: '792', UA: '804',
  US: '840', UY: '858', XK: '-99', ZA: '710',
  EH: '732', // Western Sahara — displayed as part of Morocco
  // EU countries (reference image)
  DE: '276', NL: '528', BE: '056', AT: '040', PL: '616', CZ: '203',
  SK: '703', HU: '348', RO: '642', BG: '100', HR: '191', SI: '705',
  LT: '440', LV: '428', EE: '233', FI: '246', SE: '752', DK: '208',
  IE: '372', GR: '300', CY: '196', MT: '470', LU: '442',
  // Additional
  EG: '818', SA: '682', AE: '784', JO: '400', LB: '422', TN: '788',
  DZ: '012', SN: '686', KE: '404', NG: '566', GH: '288', ET: '231',
  TZ: '834', IN: '356', PK: '586', BD: '050', TH: '764', VN: '704',
  ID: '360', PH: '608', MY: '458', JP: '392', KR: '410', CN: '156',
};

const REGION_ORDER = [
  'Europe',
  'North America',
  'South America',
  'Oceania',
  'Central Asia',
  'Middle East',
  'Africa',
];

interface SupportedRegionsSectionProps {
  className?: string;
}

const SupportedRegionsSection = ({ className }: SupportedRegionsSectionProps) => {
  const { t } = useTranslation();
  const { data: countries, isLoading } = useSupportedCountries();

  const supportedNumericCodes = useMemo(() => {
    if (!countries) return new Set<string>();
    const codes = new Set(
      countries.map((c) => ALPHA2_TO_NUMERIC[c.country_code]).filter(Boolean),
    );
    // Morocco includes Western Sahara
    if (codes.has('504')) codes.add('732');
    return codes;
  }, [countries]);

  const groupedByRegion = useMemo(() => {
    if (!countries) return {};
    const grouped: Record<string, SupportedCountry[]> = {};
    for (const c of countries) {
      if (!grouped[c.region]) grouped[c.region] = [];
      grouped[c.region].push(c);
    }
    return grouped;
  }, [countries]);

  const sortedRegions = useMemo(
    () =>
      REGION_ORDER.filter((r) => groupedByRegion[r]?.length).concat(
        Object.keys(groupedByRegion)
          .filter((r) => !REGION_ORDER.includes(r))
          .sort(),
      ),
    [groupedByRegion],
  );

  if (isLoading) return null;
  if (!countries?.length) return null;

  return (
    <section
      id="supported-regions"
      className={`py-24 bg-background ${className ?? ''}`}
    >
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-[800px] mx-auto mb-12 reveal-on-scroll opacity-0 translate-y-[30px] transition-all duration-[1000ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]">
          <h2 className="font-[Montserrat,sans-serif] font-extrabold text-[clamp(2rem,4vw,2.75rem)] text-foreground tracking-tight leading-tight">
            {t('landing.regions.title', 'Supported Agricultural Regions')}
          </h2>
          <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
            {t(
              'landing.regions.subtitle',
              'GeoParl platform is available for agricultural land in the following countries:',
            )}
          </p>
        </div>

        {/* Content: regions list + map */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start reveal-on-scroll opacity-0 translate-y-[30px] transition-all duration-[1000ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] delay-200">
          {/* Left: region list */}
          <div className="space-y-5">
            {sortedRegions.map((region) => {
              const regionCountries = groupedByRegion[region];
              if (!regionCountries?.length) return null;
              return (
                <div key={region} className="flex items-start gap-3">
                  <div className="mt-1 shrink-0 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">
                      {region}:{' '}
                    </span>
                    <span className="text-muted-foreground text-sm leading-relaxed">
                      {regionCountries.map((c) =>
                        c.country_code === 'MA'
                          ? `${c.country_name} (incl. Western Sahara)`
                          : c.country_name,
                      ).join(', ')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: world map */}
          <div className="rounded-2xl border border-border/50 bg-secondary/20 p-4 overflow-hidden">
            <ComposableMap
              projectionConfig={{ scale: 147, center: [10, 10] }}
              className="w-full h-auto"
              style={{ maxHeight: 400 }}
            >
              <ZoomableGroup center={[10, 10]} zoom={1} minZoom={1} maxZoom={1}>
                <Geographies geography={GEO_URL}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const numericCode = geo.id;
                      const isSupported = supportedNumericCodes.has(numericCode);
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={isSupported ? '#34d399' : '#e2e8f0'}
                          stroke="#fff"
                          strokeWidth={0.5}
                          style={{
                            default: { outline: 'none' },
                            hover: {
                              fill: isSupported ? '#10b981' : '#cbd5e1',
                              outline: 'none',
                            },
                            pressed: { outline: 'none' },
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SupportedRegionsSection;
