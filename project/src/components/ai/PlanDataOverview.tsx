import { useTranslation } from 'react-i18next';
import {
  Target,
  Leaf,
  Droplets,
  Scissors,
  Wallet,
  Calendar,
  Info,
  Gauge,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnnualDoses {
  N_kg_ha?: number;
  P2O5_kg_ha?: number;
  K2O_kg_ha?: number;
  MgO_kg_ha?: number;
  calculationDetails?: {
    export?: Record<string, number>;
    entretien?: Record<string, number>;
    soilCorrection?: Record<string, number>;
    waterCorrection?: Record<string, number>;
  };
}

interface IrrigationMonthEntry {
  month?: string;
  kc?: number;
  etoMm?: number;
  etcMm?: number;
  FL?: number;
  volumeLTreeDay?: number;
}

interface IrrigationPlan {
  monthly?: IrrigationMonthEntry[];
  rdiActive?: boolean;
  rdiWindow?: { start?: string; end?: string } | null;
  totalVolumeM3Ha?: number;
}

interface HarvestForecast {
  harvestWindow?: { start?: string; end?: string };
  yieldForecast?: { low?: number; central?: number; high?: number };
  productionTarget?: string;
  imTarget?: [number, number] | number[];
}

interface EconomicEstimate {
  totalInputCostDhHa?: number;
  breakdown?: Record<string, number>;
}

interface PruningOperation {
  type?: string;
  month?: string;
  notes?: string;
}

interface PruningPlan {
  operations?: PruningOperation[];
}

interface PlanParameters {
  cycleYear?: string;
  yieldMethod?: string;
  targetYieldTHa?: number;
  nutritionOption?: string;
  productionTarget?: string;
  nutritionOptionReason?: string;
}

export interface PlanData {
  source?: string;
  ai_version?: string;
  generated_at?: string;
  planSummary?: string;
  parameters?: PlanParameters;
  annualDoses?: AnnualDoses;
  irrigation?: IrrigationPlan;
  harvestForecast?: HarvestForecast;
  economicEstimate?: EconomicEstimate;
  pruning?: PruningPlan;
}

interface PlanDataOverviewProps {
  plan: PlanData;
  cropType?: string | null;
  variety?: string | null;
  season?: string | number | null;
}

const MONTH_ORDER = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_LABELS_FR: Record<string, string> = {
  jan: 'Jan',
  feb: 'Fév',
  mar: 'Mars',
  apr: 'Avr',
  may: 'Mai',
  jun: 'Juin',
  jul: 'Juil',
  aug: 'Août',
  sep: 'Sep',
  oct: 'Oct',
  nov: 'Nov',
  dec: 'Déc',
};

const PRODUCTION_TARGET_LABELS: Record<string, string> = {
  huile_qualite: 'Huile de qualité',
  huile_rendement: 'Huile — rendement',
  table: 'Olive de table',
  double_fin: 'Double usage',
};

const NUTRITION_OPTION_LABELS: Record<string, string> = {
  A: 'Option A — croissance',
  B: 'Option B — équilibrée',
  C: 'Option C — salinité',
};

function formatMonth(m?: string): string {
  if (!m) return '—';
  return MONTH_LABELS_FR[m.toLowerCase()] ?? m;
}

function formatNumber(value: number | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function PlanDataOverview({ plan, cropType, variety, season }: PlanDataOverviewProps) {
  const { t } = useTranslation('ai');

  const params = plan.parameters;
  const doses = plan.annualDoses;
  const irrigation = plan.irrigation;
  const harvest = plan.harvestForecast;
  const economic = plan.economicEstimate;
  const pruning = plan.pruning;

  const hasDoses =
    !!doses && (doses.N_kg_ha || doses.P2O5_kg_ha || doses.K2O_kg_ha || doses.MgO_kg_ha);
  const hasIrrigation = !!irrigation?.monthly && irrigation.monthly.length > 0;
  const hasHarvest = !!harvest?.yieldForecast || !!harvest?.harvestWindow?.start;
  const hasEconomic = economic?.totalInputCostDhHa != null || !!economic?.breakdown;
  const hasPruning = !!pruning?.operations && pruning.operations.length > 0;

  return (
    <div className="space-y-4">
      {/* ── Parameters header ── */}
      {(params || cropType || variety || season) && (
        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t('plan.overview.parametersTitle', 'Paramètres du plan')}
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {cropType && (
              <ParamTile label={t('plan.overview.crop', 'Culture')} value={cropType} />
            )}
            {variety && (
              <ParamTile label={t('plan.overview.variety', 'Variété')} value={variety} />
            )}
            {season != null && (
              <ParamTile label={t('plan.overview.season', 'Saison')} value={String(season)} />
            )}
            {params?.cycleYear && (
              <ParamTile
                label={t('plan.overview.cycleYear', 'Année du cycle')}
                value={params.cycleYear === 'indefini' ? t('plan.overview.undefined', 'indéfini') : params.cycleYear}
              />
            )}
            {params?.targetYieldTHa != null && (
              <ParamTile
                label={t('plan.overview.targetYield', 'Rendement visé')}
                value={`${formatNumber(params.targetYieldTHa, 2)} t/ha`}
              />
            )}
            {params?.productionTarget && (
              <ParamTile
                label={t('plan.overview.productionTarget', 'Objectif production')}
                value={PRODUCTION_TARGET_LABELS[params.productionTarget] ?? params.productionTarget}
              />
            )}
            {params?.nutritionOption && (
              <ParamTile
                label={t('plan.overview.nutritionOption', 'Option nutrition')}
                value={NUTRITION_OPTION_LABELS[params.nutritionOption] ?? params.nutritionOption}
              />
            )}
            {params?.yieldMethod && (
              <ParamTile
                label={t('plan.overview.yieldMethod', 'Méthode rendement')}
                value={params.yieldMethod}
              />
            )}
          </div>
          {params?.nutritionOptionReason && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-xs text-blue-900 dark:text-blue-200">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{params.nutritionOptionReason}</span>
            </div>
          )}
        </section>
      )}

      {/* ── Plan summary narrative ── */}
      {plan.planSummary && (
        <section className="rounded-xl border border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-900/20 p-5">
          <p className="text-sm leading-relaxed text-blue-900 dark:text-blue-100">
            {plan.planSummary}
          </p>
        </section>
      )}

      {/* ── Harvest forecast ── */}
      {hasHarvest && (
        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Gauge className="h-4 w-4 text-green-600 dark:text-green-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t('plan.overview.harvestTitle', 'Prévision de récolte')}
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {harvest?.yieldForecast?.central != null && (
              <StatCard
                label={t('plan.overview.yieldCentral', 'Rendement central')}
                value={`${formatNumber(harvest.yieldForecast.central, 2)} t/ha`}
                tone="green"
              />
            )}
            {(harvest?.yieldForecast?.low != null || harvest?.yieldForecast?.high != null) && (
              <StatCard
                label={t('plan.overview.yieldRange', 'Fourchette')}
                value={`${formatNumber(harvest.yieldForecast?.low, 2)} – ${formatNumber(harvest.yieldForecast?.high, 2)} t/ha`}
              />
            )}
            {harvest?.harvestWindow?.start && (
              <StatCard
                label={t('plan.overview.harvestWindow', 'Fenêtre récolte')}
                value={`${formatDate(harvest.harvestWindow.start)} → ${formatDate(harvest.harvestWindow.end)}`}
              />
            )}
            {harvest?.imTarget && Array.isArray(harvest.imTarget) && harvest.imTarget.length === 2 && (
              <StatCard
                label={t('plan.overview.maturityIndex', 'Indice maturité cible')}
                value={`${harvest.imTarget[0]} – ${harvest.imTarget[1]}`}
              />
            )}
          </div>
        </section>
      )}

      {/* ── Annual nutrition doses ── */}
      {hasDoses && (
        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Leaf className="h-4 w-4 text-green-600 dark:text-green-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t('plan.overview.dosesTitle', 'Doses annuelles (kg/ha)')}
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <DoseCard label="N" value={doses?.N_kg_ha} />
            <DoseCard label="P₂O₅" value={doses?.P2O5_kg_ha} />
            <DoseCard label="K₂O" value={doses?.K2O_kg_ha} />
            <DoseCard label="MgO" value={doses?.MgO_kg_ha} />
          </div>
          {doses?.calculationDetails && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 pr-3 font-medium">
                      {t('plan.overview.contribution', 'Contribution')}
                    </th>
                    <th className="py-2 pr-3 font-medium text-right">N</th>
                    <th className="py-2 pr-3 font-medium text-right">P₂O₅</th>
                    <th className="py-2 pr-3 font-medium text-right">K₂O</th>
                    <th className="py-2 font-medium text-right">MgO</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700 dark:text-gray-300">
                  <BreakdownRow
                    label={t('plan.overview.export', 'Exportations')}
                    values={doses.calculationDetails.export}
                  />
                  <BreakdownRow
                    label={t('plan.overview.entretien', 'Entretien')}
                    values={doses.calculationDetails.entretien}
                  />
                  <BreakdownRow
                    label={t('plan.overview.soilCorrection', 'Correction sol')}
                    values={doses.calculationDetails.soilCorrection}
                  />
                  <BreakdownRow
                    label={t('plan.overview.waterCorrection', 'Correction eau')}
                    values={doses.calculationDetails.waterCorrection}
                  />
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ── Irrigation monthly schedule ── */}
      {hasIrrigation && (
        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {t('plan.overview.irrigationTitle', 'Irrigation mensuelle')}
              </h3>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {irrigation?.totalVolumeM3Ha != null && (
                <span className="rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1">
                  {t('plan.overview.totalVolume', 'Total')}:{' '}
                  <span className="font-semibold">
                    {formatNumber(irrigation.totalVolumeM3Ha, 1)} m³/ha
                  </span>
                </span>
              )}
              <span
                className={cn(
                  'rounded-md px-2 py-1',
                  irrigation?.rdiActive
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
                )}
              >
                RDI: {irrigation?.rdiActive ? t('plan.overview.active', 'actif') : t('plan.overview.inactive', 'inactif')}
                {irrigation?.rdiActive && irrigation.rdiWindow?.start && (
                  <> ({formatDate(irrigation.rdiWindow.start)} → {formatDate(irrigation.rdiWindow.end)})</>
                )}
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2 pr-3 font-medium">{t('plan.overview.month', 'Mois')}</th>
                  <th className="py-2 pr-3 font-medium text-right">Kc</th>
                  <th className="py-2 pr-3 font-medium text-right">
                    ETo <span className="text-gray-400">(mm)</span>
                  </th>
                  <th className="py-2 pr-3 font-medium text-right">
                    ETc <span className="text-gray-400">(mm)</span>
                  </th>
                  <th className="py-2 pr-3 font-medium text-right">FL</th>
                  <th className="py-2 font-medium text-right">
                    {t('plan.overview.volumeLTreeDay', 'L/arbre/jour')}
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-700 dark:text-gray-300">
                {[...(irrigation?.monthly ?? [])]
                  .sort((a, b) => {
                    const ai = MONTH_ORDER.indexOf((a.month ?? '').toLowerCase());
                    const bi = MONTH_ORDER.indexOf((b.month ?? '').toLowerCase());
                    return ai - bi;
                  })
                  .map((m, i) => (
                    <tr
                      key={`${m.month}-${i}`}
                      className="border-b border-gray-100 dark:border-gray-800 last:border-none"
                    >
                      <td className="py-2 pr-3 font-medium">{formatMonth(m.month)}</td>
                      <td className="py-2 pr-3 text-right">{formatNumber(m.kc, 2)}</td>
                      <td className="py-2 pr-3 text-right">{formatNumber(m.etoMm, 0)}</td>
                      <td className="py-2 pr-3 text-right">{formatNumber(m.etcMm, 0)}</td>
                      <td className="py-2 pr-3 text-right">{formatNumber(m.FL, 0)}</td>
                      <td className="py-2 text-right">{formatNumber(m.volumeLTreeDay, 1)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Pruning plan ── */}
      {hasPruning && (
        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Scissors className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t('plan.overview.pruningTitle', 'Taille')}
            </h3>
          </div>
          <ul className="space-y-2">
            {pruning!.operations!.map((op, i) => (
              <li
                key={i}
                className="rounded-md border border-gray-100 dark:border-gray-800 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {op.type && (
                    <span className="font-medium text-gray-900 dark:text-white">{op.type}</span>
                  )}
                  {op.month && (
                    <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200 text-xs font-medium">
                      {formatMonth(op.month)}
                    </span>
                  )}
                </div>
                {op.notes && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">{op.notes}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Economic estimate ── */}
      {hasEconomic && (
        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {t('plan.overview.economicTitle', 'Estimation économique')}
            </h3>
          </div>
          {economic?.totalInputCostDhHa != null && (
            <div className="mb-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 p-4">
              <p className="text-xs text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                {t('plan.overview.totalCost', 'Coût total intrants')}
              </p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {formatNumber(economic.totalInputCostDhHa, 0)} DH/ha
              </p>
            </div>
          )}
          {economic?.breakdown && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(economic.breakdown).map(([key, value]) => (
                <StatCard
                  key={key}
                  label={BREAKDOWN_LABELS[key] ?? key}
                  value={`${formatNumber(value, 0)} DH/ha`}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Meta footer ── */}
      {(plan.ai_version || plan.generated_at) && (
        <footer className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
          <Calendar className="h-3 w-3" />
          {plan.generated_at && (
            <span>
              {t('plan.overview.generatedAt', 'Généré le')} {formatDate(plan.generated_at)}
            </span>
          )}
          {plan.ai_version && (
            <span className="rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 font-mono">
              IA v{plan.ai_version}
            </span>
          )}
        </footer>
      )}
    </div>
  );
}

const BREAKDOWN_LABELS: Record<string, string> = {
  fertigation: 'Fertigation',
  phyto: 'Phytosanitaire',
  biostimulants: 'Biostimulants',
  microelements: 'Microéléments',
};

function ParamTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-900/50 p-3">
      <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1 break-words">
        {value}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'green' | 'blue';
}) {
  const toneCls =
    tone === 'green'
      ? 'text-green-700 dark:text-green-300'
      : tone === 'blue'
        ? 'text-blue-700 dark:text-blue-300'
        : 'text-gray-900 dark:text-white';
  return (
    <div className="rounded-lg border border-gray-100 dark:border-gray-800 p-3">
      <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {label}
      </p>
      <p className={cn('text-sm font-semibold mt-1', toneCls)}>{value}</p>
    </div>
  );
}

function DoseCard({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-lg border border-green-100 dark:border-green-900/40 bg-green-50/50 dark:bg-green-900/10 p-3 text-center">
      <p className="text-[11px] text-green-700 dark:text-green-300 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-xl font-bold text-green-900 dark:text-green-100 mt-1">
        {formatNumber(value, 1)}
      </p>
      <p className="text-[10px] text-green-700/70 dark:text-green-400/70">kg/ha</p>
    </div>
  );
}

function BreakdownRow({
  label,
  values,
}: {
  label: string;
  values: Record<string, number> | undefined;
}) {
  if (!values) return null;
  const nums = [values.N, values.P2O5, values.K2O, values.MgO];
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800 last:border-none">
      <td className="py-2 pr-3 font-medium">{label}</td>
      {nums.map((n, i) => (
        <td key={i} className="py-2 pr-3 text-right tabular-nums">
          {formatNumber(n, 2)}
        </td>
      ))}
    </tr>
  );
}
