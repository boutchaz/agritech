import { useState } from "react";
import { LayoutGrid, Save, Loader2, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardSettingsApi } from '../lib/api/dashboard-settings';
import { useAuth } from '../hooks/useAuth';
import type { DashboardSettings as DashboardSettingsType } from '../types';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MIDDLE_WIDGET_ORDER = ['production', 'financial'] as const;
const BOTTOM_WIDGET_ORDER = ['alerts', 'farm', 'soil'] as const;
const BOTTOM_WIDGET_SET = new Set<string>(BOTTOM_WIDGET_ORDER);

const defaultSettings: DashboardSettingsType = {
  showSoilData: true,
  showClimateData: true,
  showIrrigationData: true,
  showMaintenanceData: true,
  showProductionData: true,
  showFinancialData: true,
  showStockAlerts: true,
  showTaskAlerts: true,
  layout: {
    topRow: ['soil', 'climate', 'irrigation', 'maintenance'],
    middleRow: ['production', 'financial'],
    bottomRow: ['alerts']
  }
};

/** API may omit or partially return `layout` — never read `.topRow` on undefined */
function normalizeDashboardLayout(raw: unknown): DashboardSettingsType['layout'] {
  const d = defaultSettings.layout;
  if (!raw || typeof raw !== 'object') {
    return { topRow: [...d.topRow], middleRow: [...d.middleRow], bottomRow: [...d.bottomRow] };
  }
  const L = raw as Record<string, unknown>;
  return {
    topRow: Array.isArray(L.topRow) ? L.topRow.map(String) : [...d.topRow],
    middleRow: Array.isArray(L.middleRow) ? L.middleRow.map(String) : [...d.middleRow],
    bottomRow: Array.isArray(L.bottomRow) ? L.bottomRow.map(String) : [...d.bottomRow],
  };
}

const DashboardSettings = () => {
  const { user, currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [settings, setSettings] = useState<DashboardSettingsType>(defaultSettings);
  const [success, setSuccess] = useState(false);

  // Fetch dashboard settings
  const { isLoading } = useQuery({
    queryKey: ['dashboard-settings', user?.id, currentOrganization?.id],
    queryFn: async () => {
      if (!user || !currentOrganization) return null;

      const data = await dashboardSettingsApi.getSettings(currentOrganization.id);

      if (data) {
        const fetchedSettings: DashboardSettingsType = {
          showSoilData: data.show_soil_data ?? defaultSettings.showSoilData,
          showClimateData: data.show_climate_data ?? defaultSettings.showClimateData,
          showIrrigationData: data.show_irrigation_data ?? defaultSettings.showIrrigationData,
          showMaintenanceData: data.show_maintenance_data ?? defaultSettings.showMaintenanceData,
          showProductionData: data.show_production_data ?? defaultSettings.showProductionData,
          showFinancialData: data.show_financial_data ?? defaultSettings.showFinancialData,
          showStockAlerts: data.show_stock_alerts ?? defaultSettings.showStockAlerts,
          showTaskAlerts: data.show_task_alerts ?? defaultSettings.showTaskAlerts,
          layout: normalizeDashboardLayout(data.layout),
        };
        setSettings(fetchedSettings);
        return fetchedSettings;
      }

      return defaultSettings;
    },
    enabled: !!user && !!currentOrganization
  });

  // Save dashboard settings mutation
  const saveMutation = useMutation({
    mutationFn: async (settingsToSave: DashboardSettingsType) => {
      if (!user || !currentOrganization) {
        throw new Error(t('dashboard.errors.userOrOrgNotFound'));
      }

      const dbSettings = {
        show_soil_data: settingsToSave.showSoilData,
        show_climate_data: settingsToSave.showClimateData,
        show_irrigation_data: settingsToSave.showIrrigationData,
        show_maintenance_data: settingsToSave.showMaintenanceData,
        show_production_data: settingsToSave.showProductionData,
        show_financial_data: settingsToSave.showFinancialData,
        show_stock_alerts: settingsToSave.showStockAlerts,
        show_task_alerts: settingsToSave.showTaskAlerts,
        layout: settingsToSave.layout
      };

      await dashboardSettingsApi.upsertSettings(currentOrganization.id, dbSettings);

      return settingsToSave;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['dashboard-settings', user?.id, currentOrganization?.id]
      });
      setSuccess(true);
      toast.success(t('dashboard.saveResult.success'));
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (error) => {
      toast.error(t('dashboard.saveResult.failed'), {
        description: error instanceof Error ? error.message : t('dashboard.saveResult.failedDescription'),
      });
    },
  });

  const handleSettingChange = (key: keyof DashboardSettingsType, value: boolean) => {
    setSettings({
      ...settings,
      [key]: value,
      layout: normalizeDashboardLayout(settings.layout),
    });
  };

  const handleSave = () => {
    saveMutation.mutate({
      ...settings,
      layout: normalizeDashboardLayout(settings.layout),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  const layout = normalizeDashboardLayout(settings.layout);

  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
            <LayoutGrid className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
            {t('dashboard.title')}
          </h2>
        </div>
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="w-full sm:w-auto shrink-0 h-11 sm:h-10 rounded-xl"
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>{saveMutation.isPending ? t('dashboard.saving') : t('dashboard.save')}</span>
        </Button>
      </div>

      {saveMutation.isError && (
        <div className="bg-red-50 dark:bg-red-900/20 p-3 sm:p-4 rounded-xl">
          <div className="flex items-start gap-2 sm:items-center sm:gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-600 dark:text-red-400">
              {saveMutation.error instanceof Error
                ? saveMutation.error.message
                : t('dashboard.saveResult.failed')}
            </p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 p-3 sm:p-4 rounded-xl">
          <p className="text-green-600 dark:text-green-400">
            {t('dashboard.saveResult.success')}
          </p>
        </div>
      )}

      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
        {t('dashboard.description')}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Data Display Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">
            {t('dashboard.sections.dataDisplay')}
          </h3>

          <div className="space-y-3 sm:space-y-4">
            <label className="flex items-start gap-3 cursor-pointer touch-manipulation">
              <input
                type="checkbox"
                checked={settings.showSoilData}
                onChange={(e) => handleSettingChange('showSoilData', e.target.checked)}
                className="mt-0.5 shrink-0 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">{t('dashboard.data.soil.title')}</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.data.soil.description')}</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer touch-manipulation">
              <input
                type="checkbox"
                checked={settings.showClimateData}
                onChange={(e) => handleSettingChange('showClimateData', e.target.checked)}
                className="mt-0.5 shrink-0 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">{t('dashboard.data.climate.title')}</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.data.climate.description')}</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer touch-manipulation">
              <input
                type="checkbox"
                checked={settings.showIrrigationData}
                onChange={(e) => handleSettingChange('showIrrigationData', e.target.checked)}
                className="mt-0.5 shrink-0 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">{t('dashboard.data.irrigation.title')}</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.data.irrigation.description')}</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer touch-manipulation">
              <input
                type="checkbox"
                checked={settings.showMaintenanceData}
                onChange={(e) => handleSettingChange('showMaintenanceData', e.target.checked)}
                className="mt-0.5 shrink-0 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">{t('dashboard.data.maintenance.title')}</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.data.maintenance.description')}</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer touch-manipulation">
              <input
                type="checkbox"
                checked={settings.showProductionData}
                onChange={(e) => handleSettingChange('showProductionData', e.target.checked)}
                className="mt-0.5 shrink-0 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">{t('dashboard.data.production.title')}</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.data.production.description')}</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer touch-manipulation">
              <input
                type="checkbox"
                checked={settings.showFinancialData}
                onChange={(e) => handleSettingChange('showFinancialData', e.target.checked)}
                className="mt-0.5 shrink-0 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">{t('dashboard.data.financial.title')}</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.data.financial.description')}</p>
              </div>
            </label>
          </div>
        </div>

        {/* Alerts Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">
            {t('dashboard.sections.alerts')}
          </h3>

          <div className="space-y-3 sm:space-y-4">
            <label className="flex items-start gap-3 cursor-pointer touch-manipulation">
              <input
                type="checkbox"
                checked={settings.showStockAlerts}
                onChange={(e) => handleSettingChange('showStockAlerts', e.target.checked)}
                className="mt-0.5 shrink-0 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">{t('dashboard.alerts.stock.title')}</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.alerts.stock.description')}</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer touch-manipulation">
              <input
                type="checkbox"
                checked={settings.showTaskAlerts}
                onChange={(e) => handleSettingChange('showTaskAlerts', e.target.checked)}
                className="mt-0.5 shrink-0 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">{t('dashboard.alerts.tasks.title')}</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.alerts.tasks.description')}</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Layout — matches live Dashboard.tsx (fixed KPI + ops; optional middle & bottom rows only) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6 space-y-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
          {t('dashboard.sections.layout')}
        </h3>

        <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-slate-900/50">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('dashboard.layout.structureTitle')}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {t('dashboard.layout.structureIntro')}
          </p>
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white/70 px-3 py-2.5 text-xs leading-snug text-slate-600 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-300">
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {t('dashboard.layout.fixedStripLabel')}
            </span>
            <span className="mx-2 text-slate-300 dark:text-slate-600">·</span>
            <span>{t('dashboard.layout.fixedStripDetail')}</span>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {t('dashboard.layout.optionalBlockTitle')}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t('dashboard.layout.toggleHint')}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t('dashboard.layout.optionalTwoCol')}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {MIDDLE_WIDGET_ORDER.map((key) => {
              const on = layout.middleRow.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  role="switch"
                  aria-checked={on}
                  onClick={() => {
                    setSettings((prev) => {
                      const L = normalizeDashboardLayout(prev.layout);
                      const cur = [...L.middleRow];
                      const has = cur.includes(key);
                      const next = has ? cur.filter((k) => k !== key) : [...cur, key];
                      const sorted = MIDDLE_WIDGET_ORDER.filter((k) => next.includes(k));
                      return { ...prev, layout: { ...L, middleRow: sorted } };
                    });
                  }}
                  className={cn(
                    'flex min-h-[4.5rem] flex-col items-start justify-center rounded-2xl border px-4 py-3 text-left text-sm transition-colors',
                    on
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-950 shadow-sm dark:border-emerald-400/60 dark:bg-emerald-950/40 dark:text-emerald-50'
                      : 'border-slate-200 bg-slate-50/80 text-slate-600 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300',
                  )}
                >
                  <span className="font-semibold">{t(`dashboard.layoutOptions.${key}`)}</span>
                  <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {on ? t('dashboard.layout.toggleOn') : t('dashboard.layout.toggleOff')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t('dashboard.layout.optionalThreeCol')}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {BOTTOM_WIDGET_ORDER.map((key) => {
              const on = layout.bottomRow.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  role="switch"
                  aria-checked={on}
                  onClick={() => {
                    setSettings((prev) => {
                      const L = normalizeDashboardLayout(prev.layout);
                      const cur = [...L.bottomRow];
                      const has = cur.includes(key);
                      const next = has ? cur.filter((k) => k !== key) : [...cur, key];
                      const sorted = BOTTOM_WIDGET_ORDER.filter((k) => next.includes(k));
                      return { ...prev, layout: { ...L, bottomRow: sorted } };
                    });
                  }}
                  className={cn(
                    'flex min-h-[4.5rem] flex-col items-start justify-center rounded-2xl border px-4 py-3 text-left text-sm transition-colors',
                    on
                      ? 'border-violet-500 bg-violet-50 text-violet-950 shadow-sm dark:border-violet-400/60 dark:bg-violet-950/35 dark:text-violet-50'
                      : 'border-slate-200 bg-slate-50/80 text-slate-600 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300',
                  )}
                >
                  <span className="font-semibold">
                    {key === 'farm'
                      ? t('dashboard.widgets.farm.title')
                      : t(`dashboard.layoutOptions.${key}`)}
                  </span>
                  <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {on ? t('dashboard.layout.toggleOn') : t('dashboard.layout.toggleOff')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {layout.bottomRow.some((k) => !BOTTOM_WIDGET_SET.has(k)) && (
          <p className="text-xs text-amber-800 dark:text-amber-200/90">
            {t('dashboard.layout.legacyBottomNote', {
              keys: layout.bottomRow.filter((k) => !BOTTOM_WIDGET_SET.has(k)).join(', '),
            })}
          </p>
        )}
      </div>

      {/* Preview — schematic matches dashboard grid, not legacy topRow */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('dashboard.preview.title')}
        </h3>
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t('dashboard.layout.previewFixed')}
            </p>
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/40">
              <div className="h-9 rounded-xl bg-slate-200/90 dark:bg-slate-700/80" aria-hidden />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-14 rounded-xl bg-emerald-100/90 dark:bg-emerald-900/25"
                    aria-hidden
                  />
                ))}
              </div>
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-12 lg:gap-3">
                <div className="h-20 rounded-2xl bg-slate-200/90 lg:col-span-7 dark:bg-slate-700/80" aria-hidden />
                <div className="h-20 rounded-2xl bg-slate-200/90 lg:col-span-5 dark:bg-slate-700/80" aria-hidden />
              </div>
            </div>
          </div>

          {(layout.middleRow.length > 0 ||
            BOTTOM_WIDGET_ORDER.some((k) => layout.bottomRow.includes(k))) && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t('dashboard.layout.previewOptional')}
              </p>
              <div className="space-y-2">
                {layout.middleRow.length > 0 && (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {MIDDLE_WIDGET_ORDER.filter((k) => layout.middleRow.includes(k)).map((item) => (
                      <div
                        key={item}
                        className="flex min-h-10 items-center justify-center rounded-2xl bg-emerald-100/90 px-2 text-center text-xs font-semibold text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100"
                      >
                        {t(`dashboard.layoutOptions.${item}`)}
                      </div>
                    ))}
                  </div>
                )}
                {BOTTOM_WIDGET_ORDER.some((k) => layout.bottomRow.includes(k)) && (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {BOTTOM_WIDGET_ORDER.filter((k) => layout.bottomRow.includes(k)).map((item) => (
                      <div
                        key={item}
                        className="flex min-h-10 items-center justify-center rounded-2xl bg-violet-100/90 px-2 text-center text-xs font-semibold text-violet-900 dark:bg-violet-900/30 dark:text-violet-100"
                      >
                        {item === 'farm'
                          ? t('dashboard.widgets.farm.title')
                          : t(`dashboard.layoutOptions.${item}`)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardSettings;
