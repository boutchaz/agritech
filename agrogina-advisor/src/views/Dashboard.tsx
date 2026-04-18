import { useMemo, useState } from 'react';
import { useEngineStore, computeRDTotal, computeHaTotalPrice, computeHaTotalPriceStatic, computeErpMonthly } from '../store/engineStore';
import { generate60Months } from '../utils/engine60M';
import { LayoutDashboard, TrendingUp, TrendingDown, Unlock, Banknote, Users as UsersIcon, Lock, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Area, Bar, ReferenceLine, ReferenceDot } from 'recharts';

export default function Dashboard() {
  const state = useEngineStore();
  const data = useMemo(() => generate60Months(state), [state]);

  const lowestCash = Math.min(...data.map(m => m.cash));
  const peakUsers = Math.max(...data.map(m => m.users));
  const month12 = data[11];
  const month60 = data[59];
  const breakEvenMonth = data.find(m => m.ebitda > 0)?.month ?? 0;

  // Unlock events
  const unlockEvents = data.filter(m => m.unlockedThisMonth.length > 0)
    .map(m => ({ month: m.month, names: m.unlockedThisMonth, cash: m.cash, rdCapEx: m.rdCapEx }));

  // Module status map
  const unlockedMap = new Map<string, number>();
  for (const m of data) {
    for (const name of m.unlockedThisMonth) {
      if (!unlockedMap.has(name)) unlockedMap.set(name, m.month);
    }
  }

  // Split revenue display
  const erpMonthly = computeErpMonthly(state.erpModules);
  const agroAnnual = state.haPricingMode === 'static'
    ? computeHaTotalPriceStatic(state.avgHectaresPerClient, state.haPriceTiers)
    : computeHaTotalPrice(state.avgHectaresPerClient, state.haPriceTiers);
  const baseMrrPerClient = (erpMonthly + agroAnnual / 12) * (1 - state.discountPct / 100);
  const annualPerClient = baseMrrPerClient * 12;

  // Chart
  const chartH = 300;

  // Custom Tooltip for Cashflow Chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const monthData = data.find(m => m.month === label);
      if (!monthData) return null;

      return (
        <div className="bg-[#1e2436]/95 border border-slate-700/50 p-4 rounded-xl shadow-2xl backdrop-blur-md text-xs w-64">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-700/50">
            <span className="font-black text-white text-sm">Mois {label}</span>
            <span className="text-slate-400 font-bold">{monthData.users} Clients</span>
          </div>

          <div className="space-y-2 mb-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Cash Encaissé (MRR+Upfront)</span>
              <span className="text-blue-400 font-bold">+{Math.round(monthData.cashRevenue).toLocaleString('fr-FR')} <span className="text-[9px]">DH</span></span>
            </div>
            {monthData.fundingReceived > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Levée de Fonds</span>
                <span className="text-purple-400 font-bold">+{Math.round(monthData.fundingReceived).toLocaleString('fr-FR')} <span className="text-[9px]">DH</span></span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Total Charges (OPEX+COGS)</span>
              <span className="text-red-400 font-bold">-{Math.round(monthData.totalOpex + monthData.cogs).toLocaleString('fr-FR')} <span className="text-[9px]">DH</span></span>
            </div>
            {monthData.rdCapEx > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">R&D CapEx (Déblocage)</span>
                <span className="text-amber-400 font-bold">-{Math.round(monthData.rdCapEx).toLocaleString('fr-FR')} <span className="text-[9px]">DH</span></span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-700/50">
            <span className="text-slate-300 font-bold">Trésorerie Actuelle</span>
            <span className={`text-base font-black ${monthData.cash >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {Math.round(monthData.cash).toLocaleString('fr-FR')} <span className="text-[10px]">DH</span>
            </span>
          </div>

          {monthData.unlockedThisMonth.length > 0 && (
            <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded p-2">
              <span className="text-[9px] text-amber-500 uppercase font-bold block mb-1">Modules Débloqués</span>
              <span className="text-amber-300 font-bold">
                {monthData.unlockedThisMonth.join(', ')}
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // P&L view toggle
  const [plView, setPlView] = useState<'key' | 'full'>('key');
  const [roadmapOpen, setRoadmapOpen] = useState(true);
  
  // Track open state for individual module collapses
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
  const toggleModuleCollapse = (id: string) => setOpenModules(s => ({...s, [id]: !s[id]}));
  
  // Include campaign months (14, 26, 38, 50) to visualize seasonal revenues (like Drone)
  const keyMonths = [1, 2, 3, 6, 9, 12, 14, 18, 24, 26, 36, 38, 48, 50, 60];

  return (
    <div className="max-w-7xl mx-auto text-slate-200 pb-12">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <LayoutDashboard className="text-blue-500" size={32} />
          Étape 7 — Dashboard Intelligent
        </h2>
        <p className="text-slate-400 mt-2 font-medium">Projection 60 mois. Déblocage automatique des modules selon la trésorerie.</p>
      </div>

      {/* Growth Tranches */}
      <div className="bg-[#1e2436] rounded-xl border border-slate-800 p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">📈 Croissance Clients / Mois par Tranche</h3>
        </div>
        <div className="flex gap-3 flex-wrap">
          {state.growthTranches.map((t, i) => (
            <div key={i} className="bg-slate-900/50 rounded-lg p-3 border border-slate-800 flex-1 min-w-[120px]">
              <div className="text-[10px] text-slate-500 font-bold mb-1">{t.label}</div>
              <input type="number" min="0" value={t.newClientsPerMonth}
                onChange={e => state.updateGrowthTranche(i, 'newClientsPerMonth', Number(e.target.value))}
                className="w-full bg-slate-800 rounded px-2 py-1.5 text-lg font-black text-white border border-slate-700 text-center" />
              <div className="text-[9px] text-slate-600 mt-1 text-center">clients/mo</div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1e2436] rounded-xl border border-slate-800 p-4">
          <label className="block text-xs text-slate-500 mb-1 uppercase">Tréso Initiale (DH)</label>
          <input type="number" min="0" step="10000" value={state.startCash} onChange={e => state.setStartCash(Number(e.target.value))}
            className="w-full bg-slate-800 rounded px-3 py-2 text-lg font-bold text-emerald-300 border border-slate-700 text-center" />
        </div>
        <div className="bg-[#1e2436] rounded-xl border border-slate-800 p-4">
          <label className="block text-xs text-slate-500 mb-1 uppercase">Levée (DH)</label>
          <input type="number" min="0" step="100000" value={state.fundAmount} onChange={e => state.setFunding(Number(e.target.value), state.fundMonth)}
            className="w-full bg-slate-800 rounded px-3 py-2 text-lg font-bold text-purple-300 border border-slate-700 text-center" />
        </div>
        <div className="bg-[#1e2436] rounded-xl border border-slate-800 p-4">
          <label className="block text-xs text-slate-500 mb-1 uppercase">Mois Levée (0=aucune)</label>
          <input type="number" min="0" max="60" value={state.fundMonth} onChange={e => state.setFunding(state.fundAmount, Number(e.target.value))}
            className="w-full bg-slate-800 rounded px-3 py-2 text-lg font-bold text-purple-300 border border-slate-700 text-center" />
        </div>
        <div className="bg-[#1e2436] rounded-xl border border-slate-800 p-4">
          <label className="flex justify-between text-xs text-slate-500 mb-1 uppercase">
            <span>Buffer Risque</span>
            <span className="text-amber-400 font-bold">{state.unlockRiskBufferPct}%</span>
          </label>
          <input type="range" min="0" max="100" step="5" value={state.unlockRiskBufferPct}
            onChange={e => state.setUnlockRiskBuffer(Number(e.target.value))} className="w-full accent-amber-500" />
          <p className="text-[9px] text-slate-600 mt-1">Unlock si cash ≥ R&D × {(1 + state.unlockRiskBufferPct / 100).toFixed(1)}</p>
        </div>
        <div className="bg-emerald-500/10 rounded-xl border border-emerald-500/30 p-4 text-center">
          <div className="text-[10px] text-emerald-300 uppercase">Cash J1 / Client</div>
          <div className="text-2xl font-black text-emerald-400">{Math.round(annualPerClient).toLocaleString('fr-FR')}</div>
          <div className="text-[10px] text-slate-500">DH Annuel</div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <div className="bg-[#1e2436] rounded-lg border border-slate-800 p-4 text-center">
          <div className="text-[10px] text-blue-300 uppercase mb-1 flex items-center justify-center gap-1"><UsersIcon size={12} /> Peak Clients</div>
          <div className="text-2xl font-black text-white">{peakUsers}</div>
        </div>
        <div className={`bg-[#1e2436] rounded-lg border p-4 text-center ${lowestCash >= 0 ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
          <div className="text-[10px] uppercase mb-1 flex items-center justify-center gap-1">
            {lowestCash >= 0 ? <TrendingUp size={12} className="text-emerald-400" /> : <TrendingDown size={12} className="text-red-400" />}
            <span className={lowestCash >= 0 ? 'text-emerald-300' : 'text-red-300'}>Cash Min</span>
          </div>
          <div className={`text-xl font-black ${lowestCash >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{Math.round(lowestCash).toLocaleString('fr-FR')}</div>
        </div>
        <div className="bg-[#1e2436] rounded-lg border border-slate-800 p-4 text-center">
          <div className="text-[10px] text-purple-300 uppercase mb-1"><Banknote size={12} className="inline" /> Break-Even</div>
          <div className="text-xl font-black text-white">{breakEvenMonth > 0 ? `M${breakEvenMonth}` : '—'}</div>
        </div>
        <div className="bg-[#1e2436] rounded-lg border border-slate-800 p-4 text-center">
          <div className="text-[10px] text-purple-300 uppercase mb-1">MRR M12</div>
          <div className="text-xl font-black text-white">{month12 ? Math.round(month12.totalMrr).toLocaleString('fr-FR') : 0}</div>
        </div>
        <div className="bg-[#1e2436] rounded-lg border border-slate-800 p-4 text-center">
          <div className="text-[10px] text-amber-300 uppercase mb-1">Cash M60</div>
          <div className="text-xl font-black text-white">{month60 ? Math.round(month60.cash).toLocaleString('fr-FR') : 0}</div>
        </div>
      </div>

      {/* MODULE UNLOCK ROADMAP — Collapsible */}
      <div className="bg-[#1e2436] rounded-xl border border-slate-800 shadow-xl mb-6 overflow-hidden">
        <button onClick={() => setRoadmapOpen(!roadmapOpen)}
          className="w-full flex items-center justify-between p-6 hover:bg-slate-800/20 transition-colors text-left">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Unlock size={18} className="text-amber-400" /> Roadmap Déblocage Modules
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-amber-400">{unlockEvents.length} débloqués</span>
            {roadmapOpen ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
          </div>
        </button>
        {roadmapOpen && (
          <div className="border-t border-slate-800 p-6 pt-4">
            <div className="space-y-3">
              {state.roadmapItems.filter(i => i.checked).map(item => {
                const rdCost = computeRDTotal(item.rdItems);
                const unlockMonth = unlockEvents.find(ev => ev.names.includes(item.name))?.month;
                const isUnlocked = !!unlockMonth;
                const depItem = item.dependsOn ? state.roadmapItems.find(i => i.id === item.dependsOn) : null;
                const depUnlocked = !item.dependsOn || unlockEvents.some(ev => {
                  const depName = state.roadmapItems.find(i => i.id === item.dependsOn)?.name;
                  return depName && ev.names.includes(depName);
                });
                return (
                  <div key={item.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${isUnlocked ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-slate-900/30 border-slate-800'
                    }`}>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isUnlocked ? 'bg-emerald-500/20' : 'bg-slate-800'
                      }`}>
                      {isUnlocked ? <CheckCircle2 size={24} className="text-emerald-400" /> : <Lock size={20} className="text-slate-500" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{item.name}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${item.type === 'hardware' ? 'bg-orange-500/20 text-orange-400' : 'bg-indigo-500/20 text-indigo-400'
                          }`}>{item.type}</span>
                        {depItem && !depUnlocked && (
                          <span className="text-[9px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">⛓️ Attend: {depItem.name}</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{item.desc}</div>
                      <div className="flex gap-4 mt-1 text-[10px]">
                        <span className="text-amber-400">R&D: {rdCost > 0 ? rdCost.toLocaleString('fr-FR') + ' DH' : 'Gratuit'}</span>
                        {item.mrrPrice > 0 && <span className="text-emerald-400">+{item.mrrPrice} DH {item.mrrBasis.replace('per_', '/')}</span>}
                        {item.upfrontPrice > 0 && <span className="text-blue-400">+{item.upfrontPrice.toLocaleString('fr-FR')} DH HW {item.upfrontBasis.replace('per_', '/')}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {isUnlocked ? (
                        <div className="bg-emerald-500/20 rounded-xl px-4 py-2">
                          <div className="text-[10px] text-emerald-300 uppercase font-bold">Débloqué</div>
                          <div className="text-2xl font-black text-emerald-400">M{unlockMonth}</div>
                        </div>
                      ) : (
                        <div className="bg-slate-800 rounded-xl px-4 py-2">
                          <div className="text-[10px] text-slate-500 uppercase font-bold">En attente</div>
                          <div className="text-sm font-bold text-slate-400">{rdCost > 0 ? `${rdCost.toLocaleString('fr-FR')} DH` : 'Dépendance'}</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {unlockEvents.length === 0 && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                <p className="text-sm text-red-300 font-bold">⚠️ Aucun module débloqué sur 60 mois.</p>
                <p className="text-xs text-red-400/70 mt-1">La trésorerie n'atteint jamais le seuil R&D.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CASH FLOW CHART — Interactive */}
      <div className="bg-[#1e2436] rounded-xl border border-slate-800 p-6 shadow-xl mb-6">
        <h3 className="text-lg font-bold text-white mb-4">Flux de Trésorerie (60 mois)</h3>
        <div style={{ height: `${chartH}px` }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <defs>
                <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                tickMargin={10}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `M${val}`}
                minTickGap={20}
              />
              <YAxis
                yAxisId="cash"
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                tickFormatter={(val) => `${(val / 1000).toFixed(0)}K`}
                axisLine={false}
                tickLine={false}
                tickMargin={10}
              />
              <YAxis
                yAxisId="rev"
                orientation="right"
                hide
              />
              <RechartsTooltip
                content={<CustomTooltip />}
                cursor={{ fill: '#334155', opacity: 0.2 }}
              />

              {/* Reference Line for Zero Cash */}
              <ReferenceLine yAxisId="cash" y={0} stroke="#ef4444" strokeDasharray="3 3" opacity={0.5} />

              {/* Funding Reference Line (Vertical) */}
              {state.fundMonth > 0 && state.fundMonth <= 60 && (
                <ReferenceLine yAxisId="cash" x={state.fundMonth} stroke="#a855f7" strokeWidth={1} strokeDasharray="4 4" label={{ position: 'top', value: 'Levée', fill: '#a855f7', fontSize: 10, fontWeight: 'bold' }} />
              )}

              {/* Unlock Events Dots */}
              {unlockEvents.map(ev => (
                <ReferenceDot
                  key={`dot-${ev.month}`}
                  yAxisId="cash"
                  x={ev.month}
                  y={ev.cash}
                  r={5}
                  fill="#f59e0b"
                  stroke="#1e2436"
                  strokeWidth={2}
                />
              ))}

              <Area
                yAxisId="cash"
                type="monotone"
                dataKey="cash"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorCash)"
                activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
              />

              <Bar
                yAxisId="rev"
                dataKey="cashRevenue"
                fill="url(#colorRev)"
                radius={[4, 4, 0, 0]}
                barSize={8}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 mt-1 px-1">
          <span>M1</span><span>M12</span><span>M24</span><span>M36</span><span>M48</span><span>M60</span>
        </div>
        <div className="flex gap-6 mt-3 text-[10px] text-slate-500 justify-center">
          <span className="flex items-center gap-1"><span className="w-3 h-1 bg-emerald-500 rounded"></span> Trésorerie</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500/30 rounded"></span> Cash encaissé</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-500 rounded-full"></span> Unlock module</span>
          {state.fundMonth > 0 && <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-purple-500 border-dashed"></span> Levée</span>}
        </div>
      </div>

      {/* P&L TABLE — toggleable key months / full 60 months */}
      <div className="bg-[#1e2436] rounded-xl border border-slate-800 p-6 shadow-xl overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Projection Financière (Consolidée)</h3>
          <div className="flex gap-2">
            {(['key', 'full'] as const).map(v => (
              <button key={v} onClick={() => setPlView(v)}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${plView === v ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'text-slate-500 border border-slate-700'}`}>
                {v === 'key' ? 'Mois Clés' : '60 Mois'}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="text-xs min-w-full">
            <thead>
              <tr className="text-[9px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <th className="pb-2 text-left sticky left-0 bg-[#1e2436] z-10 pr-4">Indicateur</th>
                {(plView === 'full' ? data.map((_, i) => i + 1) : keyMonths).map(m => (
                  <th key={m} className="pb-2 text-right px-2 whitespace-nowrap">M{m}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {(() => {
                const rows: any[] = [];
                rows.push({ label: 'Clients', key: 'users', color: 'text-white', fmt: (v: number) => v.toString() });

                rows.push({ label: 'Cash Encaissé (Logiciel)', key: 'coreRevenue', color: 'text-emerald-400', fmt: (v: number) => Math.round(v).toLocaleString('fr-FR') });
                rows.push({ label: 'Services Drone', key: 'droneRevenue', color: 'text-emerald-500', fmt: (v: number) => `+${Math.round(v).toLocaleString('fr-FR')}` });
                rows.push({ label: 'MRR', key: 'totalMrr', color: 'text-blue-400', fmt: (v: number) => Math.round(v).toLocaleString('fr-FR') });
                rows.push({ label: 'COGS (Logiciel)', key: 'coreCogs', color: 'text-red-400', fmt: (v: number) => `-${Math.round(v).toLocaleString('fr-FR')}` });
                rows.push({ label: 'COGS Drone — Prestation', key: 'droneCogs', color: 'text-red-500', fmt: (v: number) => `-${Math.round(v).toLocaleString('fr-FR')}` });
                rows.push({ label: 'R&D CapEx', key: 'rdCapEx', color: 'text-amber-400', fmt: (v: number) => v > 0 ? `-${Math.round(v).toLocaleString('fr-FR')}` : '—' });
                rows.push({ label: 'Charges Opérationnelles Modules', isCustomGroup: true, keys: ['m2mSimCogs', 'techInstallOpex', 'savTerrainOpex', 'devMaintenanceOpex', 'agronomeOpex', 'hwBufferStockCapEx'], color: 'text-orange-400', fmt: (v: number) => v > 0 ? `-${Math.round(v).toLocaleString('fr-FR')}` : '—' });

                rows.push({ label: 'OpEx', key: 'totalOpex', color: 'text-red-300', fmt: (v: number) => `-${Math.round(v).toLocaleString('fr-FR')}` });
                rows.push({ label: 'EBITDA', key: 'ebitda', color: 'text-white', fmt: (v: number) => Math.round(v).toLocaleString('fr-FR') });
                rows.push({ label: '💰 Levée de Fonds', key: 'fundingReceived', color: 'text-purple-400', fmt: (v: number) => v > 0 ? `+${Math.round(v).toLocaleString('fr-FR')}` : '—' });
                rows.push({ label: 'Trésorerie', key: 'cash', color: 'text-white', fmt: (v: number) => Math.round(v).toLocaleString('fr-FR') });

                return rows.map((row, rIdx) => (
                  <tr key={row.key || `${row.itemId}-${rIdx}`}>
                    <td className={`py-1.5 font-bold sticky left-0 bg-[#1e2436] z-10 pr-4 whitespace-nowrap ${row.isModuleRev || row.isModuleCogs || row.isModuleRd ? 'pl-4 text-[10px]' : 'text-slate-300'}`}>{row.label}</td>
                    {(plView === 'full' ? data.map((_, i) => i) : keyMonths.map(m => m - 1)).map(idx => {
                      if (!data[idx]) return <td key={idx} className="py-1.5 text-right px-2 font-bold whitespace-nowrap text-slate-600">—</td>;

                      let val = 0;
                      if (row.key) val = data[idx][row.key as keyof typeof data[0]] as number;
                      if (row.isCustomGroup) val = row.keys.reduce((acc: number, k: string) => acc + (data[idx][k as keyof typeof data[0]] as number), 0);

                      const dynamicColor = row.color || (val < 0 ? 'text-red-400' : 'text-emerald-400');
                      return (
                        <td key={idx} className={`py-1.5 text-right px-2 font-bold whitespace-nowrap ${dynamicColor}`}>
                          {row.fmt(val as number)}
                        </td>
                      );
                    })}
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* DÉTAILS MODULES (Collapsible individual) */}
      <div className="space-y-4 mt-6">
        <h3 className="text-lg font-bold text-white mb-4 px-2 tracking-tight">Performances par Module Débloqué</h3>
        
        {(() => {
          const unlockedSet = new Set<string>();
          const modulesWithTriggerEvents: { item: any; startMonth: number; uMonth: number }[] = [];
          
          unlockEvents.forEach(ev => {
            ev.names.forEach(name => {
              const it = state.roadmapItems.find(x => x.name === name);
              if (it && !unlockedSet.has(it.id)) {
                unlockedSet.add(it.id);
                modulesWithTriggerEvents.push({ item: it, startMonth: ev.month + it.deliveryMonths, uMonth: ev.month });
              }
            });
          });

          if (modulesWithTriggerEvents.length === 0) {
            return <div className="text-sm text-slate-500 px-4 italic">Aucun module débloqué à afficher.</div>;
          }

          return modulesWithTriggerEvents.map(({ item, startMonth, uMonth }) => {
            const isOpen = openModules[item.id] || false;
            return (
              <div key={item.id} className="bg-[#1e2436] rounded-xl border border-slate-800 shadow-xl overflow-hidden">
                <button onClick={() => toggleModuleCollapse(item.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-800/20 transition-colors text-left border-b border-transparent">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                      <Unlock size={14} className="text-indigo-400" />
                    </div>
                    <span className="font-bold text-white text-sm">{item.name}</span>
                    <span className="text-[10px] text-slate-500 px-2 bg-slate-800 rounded-full">Actif M{startMonth}</span>
                  </div>
                  {isOpen ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                </button>
                
                {isOpen && (
                  <div className="border-t border-slate-800 p-4 overflow-x-auto bg-[#1a1f30]">
                    <table className="text-xs min-w-full">
                      <thead>
                        <tr className="text-[9px] uppercase tracking-wider text-slate-500 border-b border-slate-700">
                          <th className="pb-2 text-left sticky left-0 bg-[#1a1f30] z-10 pr-4 w-48">Indicateur Module</th>
                          {(plView === 'full' ? data.map((_, i) => i + 1) : keyMonths).map(m => (
                            <th key={m} className="pb-2 text-right px-2 whitespace-nowrap">M{m}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {[
                          { label: 'Revenus (MRR+HW)', key: 'moduleRevenues', color: 'text-emerald-400', isRev: true },
                          { label: 'COGS Directs', key: 'moduleCogs', color: 'text-red-400' },
                          { label: 'Opex Distribuées', key: 'moduleOpex', color: 'text-orange-400' },
                          { label: 'Dev R&D', key: 'moduleRdCapEx', color: 'text-amber-500/80', isRd: true },
                          { label: 'Marge Brute Module', key: 'grossMargin', color: 'text-white font-black', isTotal: true },
                        ].map(row => (
                          <tr key={row.key} className="hover:bg-slate-800/20">
                            <td className={`py-1.5 font-bold sticky left-0 bg-[#1a1f30]/90 z-10 pr-4 whitespace-nowrap ${row.color}`}>
                              {row.label}
                            </td>
                            {(plView === 'full' ? data.map((_, i) => i) : keyMonths.map(m => m - 1)).map(idx => {
                              if (!data[idx]) return <td key={idx} className="py-1.5 text-right px-2">—</td>;
                              const currentM = data[idx].month;

                              let val = 0;
                              if (row.isTotal) {
                                const r = data[idx].moduleRevenues[item.id] || 0;
                                const c = data[idx].moduleCogs[item.id] || 0;
                                const o = data[idx].moduleOpex[item.id] || 0;
                                val = r - c - o;
                              } else {
                                const record = data[idx][row.key as keyof typeof data[0]] as Record<string, number>;
                                val = record?.[item.id] || 0;
                              }

                              // Gray out if not started
                              if (row.isRd && currentM < uMonth) {
                                return <td key={idx} className="py-1.5 text-right px-2 text-[10px] text-slate-700">—</td>;
                              } else if (!row.isRd && currentM < startMonth) {
                                return <td key={idx} className="py-1.5 text-right px-2 text-[10px] text-slate-600 italic">Pre-launch</td>;
                              }

                              const displayVal = val === 0 ? '—' : (!row.isRd && !row.isTotal && row.key !== 'moduleRevenues') ? `-${Math.round(val).toLocaleString('fr-FR')}` : `${val > 0 && row.isTotal ? '+' : ''}${Math.round(val).toLocaleString('fr-FR')}`;

                              return (
                                <td key={idx} className={`py-1.5 text-right px-2 font-bold whitespace-nowrap ${row.isTotal ? (val < 0 ? 'text-red-300' : 'text-emerald-300') : row.color}`}>
                                  {displayVal}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}
