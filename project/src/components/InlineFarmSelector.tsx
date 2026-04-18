
import { cn } from '@/lib/utils';
import { useAuth } from '../hooks/useAuth';
import { MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/radix-select';
import { Badge } from '@/components/ui/badge';

interface InlineFarmSelectorProps {
  message?: string;
  className?: string;
}

const InlineFarmSelector = ({
  message,
  className = '',
}: InlineFarmSelectorProps) => {
  const { t } = useTranslation();
  const { farms, currentFarm, setCurrentFarm } = useAuth();

  const farmsList = Array.isArray(farms) ? farms : [];

  // Only show "no farms" when we truly have none — not while refetching with a stale empty array
  // when currentFarm is still set (handled in MultiTenantAuthProvider + keepPreviousData).
  if (farmsList.length === 0 && !currentFarm) {
    return (
      <div className={`bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {t('farmSelector.noFarms', 'No farms available')}
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
              {t('farmSelector.createFarmFirst', 'Create a farm first to access this feature.')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (currentFarm) {
    const farmRow = farmsList.find((f) => f.id === currentFarm.id);
    const farmInList = Boolean(farmRow);
    const displayArea =
      farmRow && 'total_area' in farmRow && farmRow.total_area != null
        ? Number(farmRow.total_area)
        : (currentFarm as { total_area?: number }).total_area;
    // Always keep a non-empty value when currentFarm exists — empty string breaks Radix Select (no matching item → blank trigger).
    const selectValue = currentFarm.id;

    return (
      <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4", className)}>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-2xl shadow-sm">
            <MapPin className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('farmSelector.activeFarm', 'Active Farm Context')}</p>
            <h4 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight uppercase mt-0.5">{currentFarm.name}</h4>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end px-4 border-r border-slate-100 dark:border-slate-700">
            <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Surface</span>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
              {displayArea != null ? Number(displayArea).toFixed(2) : '0.00'} HA
            </span>
          </div>
          
          <Select
            value={selectValue}
            onValueChange={(value) => {
              const farm = farmsList.find(f => f.id === value);
              if (farm) setCurrentFarm(farm);
            }}
          >
            <SelectTrigger className="w-full sm:w-48 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 rounded-xl h-10 text-xs font-bold uppercase tracking-tight text-slate-900 dark:text-slate-100">
              <SelectValue placeholder={currentFarm.name} />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200 dark:border-slate-700 shadow-xl">
              {farmsList.map((farm) => (
                <SelectItem
                  key={farm.id}
                  value={farm.id}
                  textValue={farm.name}
                  className="rounded-lg py-3 focus:bg-emerald-50 dark:focus:bg-emerald-900/20"
                >
                  <div className="flex items-center justify-between w-full gap-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-bold uppercase tracking-tight text-xs">{farm.name}</span>
                    </div>
                    {farm.total_area && (
                      <Badge variant="outline" className="text-[9px] font-medium tabular-nums border-slate-200 text-slate-500">{farm.total_area} HA</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
              {!farmInList && (
                <SelectItem
                  value={currentFarm.id}
                  textValue={currentFarm.name}
                  className="rounded-lg py-3 focus:bg-emerald-50 dark:focus:bg-emerald-900/20"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-bold uppercase tracking-tight text-xs">{currentFarm.name}</span>
                  </div>
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] p-6 border border-blue-100 dark:border-blue-800/50", className)}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="flex items-center gap-5 flex-1">
          <div className="p-4 bg-blue-600 rounded-[1.25rem] shadow-lg shadow-blue-200 dark:shadow-blue-900/20">
            <MapPin className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">Attention Required</p>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight uppercase mt-1">
              {message || t('farmSelector.selectFarm')}
            </h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 max-w-md">
              {t('farmSelector.selectFarmDescription')}
            </p>
          </div>
        </div>
        
        <div className="lg:w-72">
          <Select
            value=""
            onValueChange={(value) => {
              const farm = farmsList.find(f => f.id === value);
              if (farm) setCurrentFarm(farm);
            }}
          >
            <SelectTrigger className="w-full bg-white dark:bg-slate-800 border-none rounded-2xl h-14 px-6 shadow-md hover:shadow-lg transition-all text-sm font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
              <SelectValue placeholder={t('farmSelector.chooseFarm', 'Choose a farm...')} />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-none shadow-2xl">
              {farmsList.map((farm) => (
                <SelectItem
                  key={farm.id}
                  value={farm.id}
                  textValue={farm.name}
                  className="rounded-xl py-4 px-6 focus:bg-blue-50 dark:focus:bg-blue-900/20"
                >
                  <div className="flex items-center justify-between w-full gap-8">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      <span className="font-semibold uppercase tracking-widest text-xs">{farm.name}</span>
                    </div>
                    {farm.total_area && (
                      <span className="text-[10px] font-medium text-slate-400 tabular-nums">
                        {farm.total_area} HA
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default InlineFarmSelector;
