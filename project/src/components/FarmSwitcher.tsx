import {  useState, useRef, useEffect, useLayoutEffect  } from "react";
import { ChevronDown, Plus, Check } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useHotkey } from '@tanstack/react-hotkeys';
import { useAuth } from '../hooks/useAuth';
import { useFarms } from '../hooks/useParcelsQuery';
import type { AuthFarm } from '../contexts/AuthContext';
import { cn } from '@/lib/utils';
import { headerToolbarTextTriggerClass } from '@/lib/header-toolbar';
import { Button } from '@/components/ui/button';

const DROPDOWN_WIDTH = 256; // w-64

interface FarmSwitcherProps {
  currentFarmId?: string;
  onFarmChange?: (farmId: string) => void;
}

const FarmSwitcher = ({ currentFarmId, onFarmChange }: FarmSwitcherProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const { farms, currentFarm, setCurrentFarm, loading, currentOrganization } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [alignEnd, setAlignEnd] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { data: richFarms = [] } = useFarms(currentOrganization?.id);
  console.log('richFarms', currentOrganization?.id, richFarms);
  const handleAddFarm = () => {
    setIsOpen(false);
    navigate({ to: '/farm-hierarchy' });
  };

  const handleFarmSelect = (farm: AuthFarm) => {
    setCurrentFarm(farm);
    if (onFarmChange) {
      onFarmChange(farm.id);
    }
    setIsOpen(false);
  };

  const selectedFarmId = currentFarmId || currentFarm?.id;

  const farmDisplayName = (farm: { id: string; name?: string | null }) => {
    const trimmed = (farm.name ?? '').toString().trim();
    return trimmed || `Farm ${String(farm.id).slice(0, 8)}`;
  };

  const enrichedFarms = farms.map((farm) => {
    const richFarm = richFarms.find((f) => f.id === farm.id);
    const richName = (richFarm?.name ?? '').toString().trim();
    return {
      ...farm,
      name: ((farm.name ?? '').toString().trim() || richName || farmDisplayName(farm)),
      size:
        richFarm?.size ??
        (richFarm as { total_area?: number } | undefined)?.total_area ??
        farm.size ??
        (farm as { total_area?: number }).total_area,
    };
  });

  useLayoutEffect(() => {
    if (!isOpen || !buttonRef.current) return;

    const updateAlign = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const pad = 16;
      const overflowsRight = rect.left + DROPDOWN_WIDTH > vw - pad;
      const inRightHalf = rect.left > vw / 2;
      setAlignEnd(overflowsRight || inRightHalf);
    };

    updateAlign();
    window.addEventListener('resize', updateAlign);
    window.addEventListener('scroll', updateAlign, true);
    return () => {
      window.removeEventListener('resize', updateAlign);
      window.removeEventListener('scroll', updateAlign, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [isOpen]);

  useHotkey('Escape', () => setIsOpen(false), {
    enabled: isOpen,
    meta: { name: t('close', 'Close'), description: 'Close farm switcher' },
  });

  if (loading) {
    return (
      <div className="h-10 w-48 shrink-0 animate-pulse rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800" />
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <Button
        type="button"
        ref={buttonRef}
        title={
          currentFarm
            ? farmDisplayName(currentFarm)
            : t('farmSwitcher.selectFarm')
        }
        onClick={() => setIsOpen(!isOpen)}
        className={cn(headerToolbarTextTriggerClass, 'max-w-[200px] justify-between sm:max-w-[220px]')}
      >
        <span className="min-w-0 flex-1 truncate text-start">
          {currentFarm ? farmDisplayName(currentFarm) : t('farmSwitcher.selectFarm')}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
      </Button>

      {isOpen && (
        <div
          className={`absolute top-full z-[200] mt-2 w-64 max-w-[min(16rem,calc(100vw-1.5rem))] rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 ${
            alignEnd ? 'end-0' : 'start-0'
          }`}
        >
          <div className="py-1">
            {enrichedFarms.length === 0 ? (
              <div className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
                {t('farmSwitcher.noFarmsAvailable')}
              </div>
            ) : (
              enrichedFarms.map((farm) => (
                <Button
                  key={farm.id}
                  type="button"
                  onClick={() => handleFarmSelect({ ...farm, size: farm.size ?? null } as AuthFarm)}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-start text-sm transition-colors ${
                    farm.id === selectedFarmId
                      ? 'bg-green-50 font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{farm.name}</div>
                    {(farm.location || farm.size) && (
                      <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {farm.location && <span>{farm.location}</span>}
                        {farm.location && farm.size && <span> • </span>}
                        {farm.size && <span>{Number(farm.size).toFixed(2)} ha</span>}
                      </div>
                    )}
                  </div>
                  {farm.id === selectedFarmId && (
                    <Check className="ms-2 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                  )}
                </Button>
              ))
            )}
            <div className="mt-1 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                onClick={handleAddFarm}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-start text-sm text-green-600 transition-colors hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>{t('farmSwitcher.addFarm')}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmSwitcher;
