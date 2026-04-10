import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import {
  Save,
  Calculator,
  Layers,
  TrendingDown,
  Maximize2,
  Percent,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================
// Pricing constants from advisor reespec
// ============================================

interface ErpModule {
  id: string;
  name: string;
  nameFr: string;
  pricePerMonth: number;
  isBase: boolean;
}

interface HaTier {
  minHa: number;
  maxHa: number | null;
  label: string;
  pricePerHaYear: number;
}

interface SizeMultiplier {
  minHa: number;
  maxHa: number | null;
  label: string;
  multiplier: number;
}

const DEFAULT_MODULES: ErpModule[] = [
  { id: 'multi-fermes', name: 'Multi-Farms & Parcels', nameFr: 'Multi-Fermes & Parcellaire', pricePerMonth: 100, isBase: true },
  { id: 'dashboard', name: 'Dashboard & Live Map', nameFr: 'Dashboard & Live Map', pricePerMonth: 50, isBase: true },
  { id: 'taches', name: 'Agronomic Tasks', nameFr: 'Tâches Agronomiques', pricePerMonth: 80, isBase: true },
  { id: 'recolte', name: 'Harvest & Traceability', nameFr: 'Récolte & Traçabilité', pricePerMonth: 50, isBase: true },
  { id: 'rh', name: 'HR & Agri Payroll', nameFr: 'RH & Paie Agronomique', pricePerMonth: 80, isBase: false },
  { id: 'stocks', name: 'Stocks & Warehouses', nameFr: 'Stocks & Entrepôts', pricePerMonth: 60, isBase: false },
  { id: 'compta', name: 'Accounting & Billing', nameFr: 'Compta & Facturation', pricePerMonth: 250, isBase: false },
  { id: 'qualite', name: 'Quality Control', nameFr: 'Contrôle Qualité', pricePerMonth: 40, isBase: false },
  { id: 'conformite', name: 'Compliance & Standards', nameFr: 'Conformité & Normes', pricePerMonth: 60, isBase: false },
  { id: 'marketplace', name: 'Marketplace', nameFr: 'Marketplace', pricePerMonth: 50, isBase: false },
  { id: 'ia', name: 'AI Assistant', nameFr: 'Assistant IA', pricePerMonth: 60, isBase: false },
];

const DEFAULT_HA_TIERS: HaTier[] = [
  { minHa: 0, maxHa: 5, label: '<5 ha', pricePerHaYear: 500 },
  { minHa: 5, maxHa: 20, label: '5–20 ha', pricePerHaYear: 400 },
  { minHa: 20, maxHa: 100, label: '20–100 ha', pricePerHaYear: 300 },
  { minHa: 100, maxHa: 200, label: '100–200 ha', pricePerHaYear: 250 },
  { minHa: 200, maxHa: 400, label: '200–400 ha', pricePerHaYear: 200 },
  { minHa: 400, maxHa: 500, label: '400–500 ha', pricePerHaYear: 180 },
  { minHa: 500, maxHa: null, label: '500+ ha', pricePerHaYear: 150 },
];

const DEFAULT_SIZE_MULTIPLIERS: SizeMultiplier[] = [
  { minHa: 0, maxHa: 100, label: '<100 ha', multiplier: 1.0 },
  { minHa: 100, maxHa: 500, label: '100–500 ha', multiplier: 2.5 },
  { minHa: 500, maxHa: null, label: '500+ ha', multiplier: 5.0 },
];

const DEFAULT_DISCOUNT = 10;
const VAT_RATE = 20;

function SubscriptionModelPage() {
  const [modules, setModules] = useState<ErpModule[]>(DEFAULT_MODULES);
  const [haTiers, setHaTiers] = useState<HaTier[]>(DEFAULT_HA_TIERS);
  const [sizeMultipliers] = useState<SizeMultiplier[]>(DEFAULT_SIZE_MULTIPLIERS);
  const [discount, setDiscount] = useState(DEFAULT_DISCOUNT);

  // Simulator state
  const [simHectares, setSimHectares] = useState(50);
  const [simModules, setSimModules] = useState<Set<string>>(
    new Set(DEFAULT_MODULES.filter((m) => m.isBase).map((m) => m.id)),
  );
  const [simCycle, setSimCycle] = useState<'monthly' | 'annual'>('annual');

  // Compute quote
  const quote = useMemo(() => {
    const selectedMods = modules.filter((m) => simModules.has(m.id));
    const erpMonthly = selectedMods.reduce((s, m) => s + m.pricePerMonth, 0);

    // Size multiplier
    const mult = sizeMultipliers.find(
      (t) => simHectares >= t.minHa && (t.maxHa === null || simHectares < t.maxHa),
    );
    const multiplier = mult?.multiplier ?? 1;

    // Degressive ha pricing
    let haAnnual = 0;
    let remaining = simHectares;
    const tierBreakdown: { label: string; ha: number; rate: number; subtotal: number }[] = [];

    for (const tier of haTiers) {
      if (remaining <= 0) break;
      const tierSize = tier.maxHa !== null ? tier.maxHa - tier.minHa : remaining;
      const ha = Math.min(remaining, tierSize);
      const subtotal = ha * tier.pricePerHaYear;
      haAnnual += subtotal;
      tierBreakdown.push({ label: tier.label, ha, rate: tier.pricePerHaYear, subtotal });
      remaining -= ha;
    }

    const erpAnnual = erpMonthly * multiplier * 12;
    const subtotalHt = erpAnnual + haAnnual;
    const discountAmount = subtotalHt * (discount / 100);
    const annualHt = subtotalHt - discountAmount;
    const cycleHt = simCycle === 'annual' ? annualHt : annualHt / 12;
    const cycleTva = cycleHt * (VAT_RATE / 100);
    const cycleTtc = cycleHt + cycleTva;

    return {
      erpMonthly,
      multiplier,
      erpAnnual,
      haAnnual,
      tierBreakdown,
      subtotalHt,
      discountAmount,
      annualHt,
      cycleHt,
      cycleTva,
      cycleTtc,
      avgPerHa: simHectares > 0 ? annualHt / simHectares : 0,
    };
  }, [modules, haTiers, sizeMultipliers, discount, simHectares, simModules, simCycle]);

  const updateModulePrice = (id: string, price: number) => {
    setModules((prev) => prev.map((m) => (m.id === id ? { ...m, pricePerMonth: price } : m)));
  };

  const updateTierPrice = (index: number, price: number) => {
    setHaTiers((prev) => prev.map((t, i) => (i === index ? { ...t, pricePerHaYear: price } : t)));
  };

  const handleSave = () => {
    // TODO: persist to backend/DB when endpoint is ready
    toast.success('Subscription model saved (local only for now)');
  };

  return (
    <div className="admin-page">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Subscription Model</h1>
          <p className="mt-1 text-sm text-gray-500 sm:text-base">Configure modular ERP pricing, hectare tiers & simulator</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 sm:w-auto"
        >
          <Save className="h-4 w-4 shrink-0" /> Save Model
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: Config */}
        <div className="lg:col-span-2 space-y-6">
          {/* ERP Modules */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Layers className="h-5 w-5 shrink-0 text-emerald-600" />
              <h2 className="text-base font-semibold text-gray-900 sm:text-lg">ERP Modules</h2>
              <span className="text-xs text-gray-400 sm:text-sm">({modules.length} modules)</span>
            </div>
            <div className="-mx-px overflow-x-auto">
            <table className="w-full min-w-[280px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-2 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
                  <th className="pb-2 text-left text-xs font-medium text-gray-500 uppercase w-20">Type</th>
                  <th className="pb-2 text-right text-xs font-medium text-gray-500 uppercase w-32">DH/month</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {modules.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2">
                      <p className="text-sm font-medium text-gray-900">{m.nameFr}</p>
                      <p className="text-xs text-gray-400">{m.name}</p>
                    </td>
                    <td className="py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        m.isBase ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {m.isBase ? 'Base' : 'Upsell'}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      <input
                        type="number"
                        value={m.pricePerMonth}
                        onChange={(e) => updateModulePrice(m.id, Number(e.target.value))}
                        className="w-24 text-right text-sm font-mono border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Ha Tiers */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Degressive Hectare Pricing</h2>
            </div>
            <div className="-mx-px overflow-x-auto">
            <table className="w-full min-w-[240px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-2 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
                  <th className="w-32 pb-2 text-right text-xs font-medium text-gray-500 uppercase">DH/ha/year</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {haTiers.map((t, i) => (
                  <tr key={i}>
                    <td className="py-2 text-sm text-gray-700">{t.label}</td>
                    <td className="py-2 text-right">
                      <input
                        type="number"
                        value={t.pricePerHaYear}
                        onChange={(e) => updateTierPrice(i, Number(e.target.value))}
                        className="w-full max-w-[6rem] rounded border border-gray-200 px-2 py-1 text-right font-mono text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 sm:w-24"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Size Multipliers & Discount */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Maximize2 className="h-5 w-5 text-purple-600" />
                <h2 className="font-semibold text-gray-900">Size Multipliers</h2>
              </div>
              <table className="w-full">
                <tbody className="divide-y divide-gray-50">
                  {sizeMultipliers.map((s, i) => (
                    <tr key={i}>
                      <td className="py-2 text-sm text-gray-700">{s.label}</td>
                      <td className="py-2 text-right text-sm font-mono text-purple-700">{s.multiplier}x</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Percent className="h-5 w-5 text-amber-600" />
                <h2 className="font-semibold text-gray-900">Bundle Discount</h2>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-20 text-right text-lg font-mono border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                <span className="text-gray-500">%</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">TVA: {VAT_RATE}%</p>
            </div>
          </div>
        </div>

        {/* Right column: Simulator */}
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-200 bg-white p-4 sm:p-5 lg:sticky lg:top-4">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-900">Quote Simulator</h2>
            </div>

            {/* Hectares input */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">Farm size (hectares)</label>
              <input
                type="number"
                value={simHectares}
                onChange={(e) => setSimHectares(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Size multiplier: <span className="font-medium text-purple-600">{quote.multiplier}x</span>
              </p>
            </div>

            {/* Module toggles */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-2">Selected modules</label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {modules.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={simModules.has(m.id)}
                      disabled={m.isBase}
                      onChange={(e) => {
                        setSimModules((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(m.id);
                          else next.delete(m.id);
                          return next;
                        });
                      }}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
                    />
                    <span className={m.isBase ? 'text-gray-500' : 'text-gray-700'}>{m.nameFr}</span>
                    <span className="text-xs text-gray-400 ml-auto">{m.pricePerMonth} DH</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Billing cycle */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">Billing cycle</label>
              <div className="flex gap-2">
                {(['monthly', 'annual'] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setSimCycle(c)}
                    className={`flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      simCycle === c
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {c === 'monthly' ? 'Monthly' : 'Annual'}
                  </button>
                ))}
              </div>
            </div>

            {/* Breakdown */}
            <div className="border-t border-gray-200 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">ERP modules ({simModules.size})</span>
                <span className="font-mono">{quote.erpMonthly.toLocaleString()} DH/mo × {quote.multiplier}x</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">ERP annual</span>
                <span className="font-mono">{quote.erpAnnual.toLocaleString()} DH</span>
              </div>

              {/* Ha breakdown */}
              <div className="pl-3 border-l-2 border-gray-200 space-y-0.5">
                {quote.tierBreakdown.map((t, i) => (
                  <div key={i} className="flex justify-between text-xs text-gray-400">
                    <span>{t.ha} ha × {t.rate} DH</span>
                    <span className="font-mono">{t.subtotal.toLocaleString()} DH</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Hectares annual</span>
                <span className="font-mono">{quote.haAnnual.toLocaleString()} DH</span>
              </div>

              <div className="border-t border-gray-100 pt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal HT</span>
                  <span className="font-mono">{quote.subtotalHt.toLocaleString()} DH</span>
                </div>
                <div className="flex justify-between text-sm text-amber-600">
                  <span>Discount ({discount}%)</span>
                  <span className="font-mono">-{quote.discountAmount.toLocaleString()} DH</span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-2">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-gray-700">Annual HT</span>
                  <span className="font-mono">{Math.round(quote.annualHt).toLocaleString()} DH</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Avg per hectare</span>
                  <span className="font-mono">{Math.round(quote.avgPerHa).toLocaleString()} DH/ha/yr</span>
                </div>
              </div>

              <div className="bg-emerald-50 -mx-5 -mb-5 mt-3 px-5 py-4 rounded-b-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {simCycle === 'annual' ? 'Annual' : 'Monthly'} HT
                  </span>
                  <span className="font-mono font-medium">{Math.round(quote.cycleHt).toLocaleString()} DH</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>TVA ({VAT_RATE}%)</span>
                  <span className="font-mono">{Math.round(quote.cycleTva).toLocaleString()} DH</span>
                </div>
                <div className="flex justify-between text-lg font-bold mt-1">
                  <span className="text-emerald-800">
                    {simCycle === 'annual' ? 'Annual' : 'Monthly'} TTC
                  </span>
                  <span className="text-emerald-700 font-mono">
                    {Math.round(quote.cycleTtc).toLocaleString()} DH
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/subscription-model')({
  component: SubscriptionModelPage,
});
