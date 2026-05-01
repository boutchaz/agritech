import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Search } from 'lucide-react';
import { geocodingService, searchMoroccanLocation, type SearchResult } from '@/utils/geocoding';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type FarmLocationValue = {
  location: string;
  latitude?: number;
  longitude?: number;
  place_id?: string;
};

type FarmLocationPickerProps = {
  /** When set to MA, search is biased with ", Morocco" for better local hits. */
  countryCode?: string;
  value: FarmLocationValue;
  onChange: (next: FarmLocationValue) => void;
  className?: string;
};

export function FarmLocationPicker({ countryCode, value, onChange, className }: FarmLocationPickerProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasResolvedPoint =
    typeof value.latitude === 'number' &&
    typeof value.longitude === 'number' &&
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude);

  useEffect(() => {
    if (!hasResolvedPoint && value.location && !query) {
      setQuery(value.location);
    }
  }, [hasResolvedPoint, value.location, query]);

  const runSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (trimmed.length < 3) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const list =
          countryCode === 'MA'
            ? await searchMoroccanLocation(trimmed)
            : await geocodingService.search(trimmed);
        setResults(Array.isArray(list) ? list : []);
      } finally {
        setSearching(false);
      }
    },
    [countryCode],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (hasResolvedPoint) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void runSearch(query);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch, hasResolvedPoint]);

  const pick = (r: SearchResult) => {
    const lat = parseFloat(r.lat);
    const lon = parseFloat(r.lon);
    onChange({
      location: r.display_name,
      latitude: lat,
      longitude: lon,
      place_id: r.place_id,
    });
    setQuery('');
    setResults([]);
  };

  const clear = () => {
    onChange({ location: '', latitude: undefined, longitude: undefined, place_id: undefined });
    setQuery('');
    setResults([]);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <label className="block pl-1 text-xs font-medium text-slate-500 dark:text-slate-400">
        {t('onboarding.farm.locationLabel', 'Location')}
      </label>

      {!hasResolvedPoint ? (
        <div className="relative">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              data-testid="farm-location-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t(
                countryCode === 'MA'
                  ? 'onboarding.farm.locationPlaceholderMA'
                  : 'onboarding.farm.locationPlaceholder',
              )}
              className="pl-9"
              autoComplete="off"
            />
          </div>
          {searching && (
            <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-lg dark:border-slate-600 dark:bg-slate-800">
              {t('onboarding.farm.locationSearching', 'Searching…')}
            </div>
          )}
          {!searching && results.length > 0 && (
            <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800">
              {results.map((r, index) => (
                <button
                  key={r.place_id}
                  type="button"
                  data-testid={`farm-location-result-${index}`}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                  onClick={() => pick(r)}
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <span className="line-clamp-2 text-slate-800 dark:text-slate-100">{r.display_name}</span>
                </button>
              ))}
            </div>
          )}
          {!searching && query.trim().length >= 3 && results.length === 0 && (
            <p className="mt-1.5 pl-1 text-xs text-slate-400">{t('onboarding.farm.locationNoResults', 'No places found.')}</p>
          )}
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-800 line-clamp-3 dark:text-slate-100">{value.location}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {value.latitude?.toFixed(5)}, {value.longitude?.toFixed(5)}
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 px-2 text-xs" onClick={clear}>
            {t('onboarding.farm.locationChange', 'Change')}
          </Button>
        </div>
      )}

      <p className="pl-1 text-xs text-slate-400 dark:text-slate-500">
        {t(
          'onboarding.farm.locationHelp',
          'Search OpenStreetMap and pick a result so we can save exact coordinates for maps and parcels.',
        )}
      </p>
    </div>
  );
}
