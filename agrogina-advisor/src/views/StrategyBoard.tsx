import { useMemo } from 'react';
import { useEngineStore, computeRDTotal, computeHaTotalPrice, computeHaTotalPriceStatic, computeAvgHaPrice, computeAvgHaPriceStatic, computeErpMonthly } from '../store/engineStore';
import { generate60Months } from '../utils/engine60M';
import { Crown, Globe2, AlertTriangle, BarChart3, Layers } from 'lucide-react';

export default function StrategyBoard() {
  const state = useEngineStore();
  const data = useMemo(() => generate60Months(state), [state]);

  // Core (agro prices are ANNUAL)
  const erpMonthly = computeErpMonthly(state.erpModules);
  const agroAnnual = state.haPricingMode === 'static'
    ? computeHaTotalPriceStatic(state.avgHectaresPerClient, state.haPriceTiers)
    : computeHaTotalPrice(state.avgHectaresPerClient, state.haPriceTiers);
  const baseMrr = (erpMonthly + agroAnnual / 12) * (1 - state.discountPct / 100);
  const annualPerClient = baseMrr * 12;
  const pricePerHa = state.haPricingMode === 'static'
    ? computeAvgHaPriceStatic(state.avgHectaresPerClient, state.haPriceTiers)
    : computeAvgHaPrice(state.avgHectaresPerClient, state.haPriceTiers);

  // LTV
  const avgLife = state.churnRate > 0 ? 1 / (state.churnRate / 100) : 60;
  const ltv = baseMrr * avgLife;

  // CAC
  const monthlyMktCost = state.marketing.channels
    .filter(ch => ch.enabled)
    .reduce((a, ch) => {
      if (ch.frequency === 'yearly' && ch.eventsPerYear && ch.costPerEvent) {
        return a + (ch.eventsPerYear * ch.costPerEvent) / 12;
      }
      return a + ch.budgetMonthly;
    }, 0);
  const monthlyAcqCost = monthlyMktCost + state.salesSalariedCount * state.salesRules.salariedBase;
  const cac = state.newUsersPerMonth > 0 ? monthlyAcqCost / state.newUsersPerMonth : 0;
  const ltvCac = cac > 0 ? ltv / cac : 0;
  const cacPayback = baseMrr > 0 ? cac / baseMrr : 0;

  // Engine
  const breakEven = data.find(m => m.ebitda > 0)?.month ?? 0;
  const lowestCash = Math.min(...data.map(m => m.cash));
  const peakUsers = Math.max(...data.map(m => m.users));

  // Commission per client
  const commissionPer = annualPerClient * (state.salesRules.freelanceComY1Pct / 100);
  const usersM12 = data[11]?.users || 1;
  const serverPer = (state.infra.devServerCost + state.infra.serverBaseCost) * 12 / Math.max(usersM12, 1);
  const apiPer = (state.infra.agromindApiCostPerUser + state.infra.assistantApiCostPerUser) * 12;
  const contributionNet = annualPerClient - serverPer - apiPer - commissionPer;

  // Sensitivity — apply multiplier to all tier prices (annual)
  const sensitivities = [-30, -20, -10, 0, 10, 20].map(pct => {
    const adjustedTiers = state.haPriceTiers.map(t => ({ ...t, pricePerHa: t.pricePerHa * (1 + pct / 100) }));
    const adjAgro = state.haPricingMode === 'static'
      ? computeHaTotalPriceStatic(state.avgHectaresPerClient, adjustedTiers)
      : computeHaTotalPrice(state.avgHectaresPerClient, adjustedTiers);
    const adj = (erpMonthly * (1 + pct / 100) + adjAgro / 12) * (1 - state.discountPct / 100);
    const adjPerHa = state.haPricingMode === 'static'
      ? computeAvgHaPriceStatic(state.avgHectaresPerClient, adjustedTiers)
      : computeAvgHaPrice(state.avgHectaresPerClient, adjustedTiers);
    return { pct, mrr: adj, annual: adj * 12, perHa: adjPerHa };
  });

  // Total R&D
  const totalRD = state.roadmapItems.filter(i => i.checked).reduce((a, i) => a + computeRDTotal(i.rdItems), 0);

  // Risks
  const risks = [
    { id: 'R1', name: 'Adoption lente', prob: '🟠', mitigation: 'Demos terrain, ambassadeurs coopératives' },
    { id: 'R2', name: 'SOWIT lance ERP similaire', prob: '🟡', mitigation: 'Contrats annuels lock-in, vitesse exécution' },
    { id: 'R3', name: 'Cash négatif avant levée', prob: lowestCash < 0 ? '🔴' : '🟢', mitigation: lowestCash < 0 ? 'URGENT: avancez la levée ou réduisez les coûts' : 'OK — trésorerie reste positive' },
    { id: 'R4', name: 'Churn élevé', prob: '🟡', mitigation: 'Annual billing = friction, Customer Success dès M6' },
    { id: 'R5', name: 'Dépendance GEE', prob: '🟢', mitigation: 'Gratuit non-commercial, backup Copernicus' },
  ];

  // Competitive
  const competitors = ['SOWIT', 'Agroptima', 'Agriedge', 'Isagri', 'SMAG', 'Cropwise'];
  const features = [
    { name: 'ERP Agricole', us: '✅', c: ['❌', '🟡', '❌', '✅', '🟡', '❌'] },
    { name: 'RH & Paie', us: '✅', c: ['❌', '❌', '❌', '✅', '❌', '❌'] },
    { name: 'AgromindIA (Calibrée)', us: '✅', c: ['🟡', '❌', '🟡', '❌', '❌', '🟡'] },
    { name: '14 Indices Spectraux', us: '✅', c: ['✅', '❌', '✅', '❌', '❌', '✅'] },
    { name: 'Météo Analytique', us: '✅', c: ['✅', '❌', '✅', '🟡', '🟡', '✅'] },
    { name: 'Comptabilité Avancée', us: '✅', c: ['❌', '❌', '❌', '✅', '🟡', '❌'] },
    { name: 'IoT Hardware', us: '🔜', c: ['✅', '❌', '❌', '❌', '❌', '🟡'] },
    { name: 'Drone', us: '🔜', c: ['✅', '❌', '❌', '❌', '❌', '❌'] },
    { name: 'Marketplace', us: '🔜', c: ['❌', '❌', '❌', '❌', '❌', '❌'] },
    { name: 'API Ouverte', us: '✅', c: ['❌', '❌', '❌', '🟡', '✅', '✅'] },
    { name: 'Focus Maroc/Afrique', us: '✅', c: ['✅', '❌', '🟡', '❌', '❌', '🟡'] },
  ];

  // Pricing & Ratio for Competitive Matrix
  const agroginaAnnualPrice = annualPerClient;
  const compPrices = [null, null, 5000, null, 4300, null]; // ['SOWIT', 'Agroptima', 'Agriedge', 'Isagri', 'SMAG', 'Cropwise']
  const compPriceLabels = ['N/D', 'N/D', '5 000 DH/an', 'Sur demande', '4 300 DH/an', 'Sur demande'];

  const countChecks = (colIndex: number) => {
    if (colIndex === -1) return features.filter(f => f.us === '✅').length;
    return features.filter(f => f.c[colIndex] === '✅').length;
  };

  const agroginaChecks = countChecks(-1);
  const compChecks = competitors.map((_, i) => countChecks(i));

  // Ratios score (Raw checks / Price)
  const rawRatios = compPrices.map((p, i) => p ? compChecks[i] / p : 0);
  rawRatios.push(agroginaAnnualPrice > 0 ? agroginaChecks / Math.max(agroginaAnnualPrice, 1) : 0);
  const maxRatio = Math.max(...rawRatios, 0.0001); // avoid div 0

  const normalizeRatio = (price: number | null, checks: number) => {
    if (!price || price <= 0) return 'N/D';
    const raw = checks / price;
    return ((raw / maxRatio) * 10).toFixed(1) + '/10';
  };

  return (
    <div className="max-w-7xl mx-auto text-slate-200 pb-12">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <Crown className="text-amber-500" size={32} />
          Étape 8 — Board Stratégique
        </h2>
        <p className="text-slate-400 mt-2 font-medium">Analyse en temps réel. Tous les KPIs se recalculent quand vous changez un paramètre.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'LTV/CAC', value: `${ltvCac.toFixed(1)}x`, ok: ltvCac >= 3, bench: '≥ 3x' },
          { label: 'CAC Payback', value: `${cacPayback.toFixed(1)} mo`, ok: cacPayback <= 12, bench: '< 12 mo' },
          { label: 'Prix/Ha/An', value: `${Math.round(pricePerHa)} DH`, ok: pricePerHa >= 180, bench: '≥ 180 DH' },
          { label: 'Break-Even', value: breakEven > 0 ? `Mois ${breakEven}` : 'Non', ok: breakEven > 0 && breakEven <= 24, bench: '< 24 mo' },
          { label: 'Cash Plancher', value: `${Math.round(lowestCash).toLocaleString('fr-FR')}`, ok: lowestCash >= 0, bench: '> 0 DH' },
          { label: 'Peak Clients', value: `${peakUsers}`, ok: true, bench: '-' },
          { label: 'R&D Total', value: `${(totalRD / 1000).toFixed(0)}K DH`, ok: true, bench: '-' },
          { label: 'Marge SaaS', value: `${annualPerClient > 0 ? Math.round((contributionNet / annualPerClient) * 100) : 0}%`, ok: annualPerClient > 0 && contributionNet / annualPerClient > 0.6, bench: '70-90%' },
        ].map(k => (
          <div key={k.label} className={`bg-[#1e2436] rounded-lg p-3 border ${k.ok ? 'border-slate-800' : 'border-red-500/30'}`}>
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-slate-500 uppercase">{k.label}</span>
              <span className={`font-bold ${k.ok ? 'text-emerald-400' : 'text-red-400'}`}>{k.ok ? '✅' : '❌'}</span>
            </div>
            <div className="text-lg font-black text-white">{k.value}</div>
            <div className="text-[10px] text-slate-600">Bench: {k.bench}</div>
          </div>
        ))}
      </div>

      {/* Unit Economics Waterfall */}
      <div className="bg-[#1e2436] rounded-xl border border-slate-800 p-6 mb-6 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <BarChart3 size={18} className="text-emerald-400" /> Unit Economics — Waterfall Annuel par Client
        </h3>
        <div className="space-y-2">
          {[
            { label: 'Revenue SaaS Annuel (12 mo)', value: annualPerClient, color: 'bg-emerald-500', pct: 100 },
            { label: `− Serveur (part/client)`, value: -Math.round(serverPer), color: 'bg-red-500', pct: serverPer / annualPerClient * 100 },
            { label: '− APIs (AgromindIA + Assistant, 12 mo)', value: -apiPer, color: 'bg-red-400', pct: apiPer / annualPerClient * 100 },
            { label: `− Commission (${state.salesRules.freelanceComY1Pct}%)`, value: -Math.round(commissionPer), color: 'bg-orange-500', pct: commissionPer / annualPerClient * 100 },
            { label: '= Contribution Nette', value: Math.round(contributionNet), color: 'bg-emerald-600', pct: contributionNet / annualPerClient * 100, bold: true },
          ].map(row => (
            <div key={row.label} className={`flex items-center gap-3 ${row.bold ? 'pt-2 border-t border-slate-700' : ''}`}>
              <div className="w-56 text-xs text-slate-300 shrink-0">{row.label}</div>
              <div className="flex-1 h-5 bg-slate-900/50 rounded overflow-hidden">
                <div className={`h-full ${row.color} rounded`} style={{ width: `${Math.min(Math.abs(row.pct), 100)}%` }} />
              </div>
              <div className={`w-28 text-right font-bold text-sm ${row.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {row.value >= 0 ? '+' : ''}{Math.round(row.value).toLocaleString('fr-FR')} DH
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sensitivity */}
      <div className="bg-[#1e2436] rounded-xl border border-slate-800 p-6 mb-6 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Layers size={18} className="text-purple-400" /> Sensibilité Pricing (±30%)
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
              <th className="pb-2 text-left">Variation</th>
              <th className="pb-2 text-right">MRR/Client</th>
              <th className="pb-2 text-right">Annuel</th>
              <th className="pb-2 text-right">Prix/Ha/An</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {sensitivities.map(s => (
              <tr key={s.pct} className={`${s.pct === 0 ? 'bg-blue-500/5' : ''}`}>
                <td className={`py-2 font-bold ${s.pct === 0 ? 'text-blue-400' : 'text-slate-300'}`}>
                  {s.pct === 0 ? '✅ Actuel' : `${s.pct > 0 ? '+' : ''}${s.pct}%`}
                </td>
                <td className="py-2 text-right text-slate-300">{Math.round(s.mrr).toLocaleString('fr-FR')}</td>
                <td className="py-2 text-right font-bold text-emerald-400">{Math.round(s.annual).toLocaleString('fr-FR')}</td>
                <td className={`py-2 text-right font-bold ${s.perHa >= 180 ? 'text-emerald-400' : 'text-red-400'}`}>{Math.round(s.perHa)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Competitive + Risks side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Competitive Matrix */}
        <div className="bg-[#1e2436] rounded-xl border border-slate-800 p-6 shadow-xl overflow-x-auto">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Globe2 size={18} className="text-cyan-400" /> Matrice Concurrentielle
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase text-slate-500 border-b border-slate-800">
                <th className="pb-2 text-left">Feature</th>
                <th className="pb-2 text-center text-blue-400">Nous</th>
                {competitors.map(c => (
                  <th key={c} className="pb-2 text-center whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {features.map(f => (
                <tr key={f.name}>
                  <td className="py-1.5 text-xs text-slate-300">{f.name}</td>
                  <td className="py-1.5 text-center bg-blue-500/5">{f.us}</td>
                  {f.c.map((v, i) => (
                    <td key={i} className="py-1.5 text-center">{v}</td>
                  ))}
                </tr>
              ))}
              {/* Dynamic Strategy Rows */}
              <tr className="border-t-2 border-slate-700 bg-slate-900/50">
                <td className="py-2.5 text-xs font-bold text-slate-300">Prix Annuel de Référence</td>
                <td className="py-2.5 text-center font-black text-amber-400 bg-amber-500/10">{Math.round(agroginaAnnualPrice).toLocaleString('fr-FR')} DH</td>
                {compPriceLabels.map((lbl, i) => (
                  <td key={i} className={`py-2.5 text-center text-xs font-bold ${lbl === 'N/D' ? 'text-slate-600' : 'text-slate-400'}`}>{lbl}</td>
                ))}
              </tr>
              <tr className="bg-slate-900/50">
                <td className="py-2.5 text-xs font-bold text-slate-300">Ratio Valeur/Prix (Normalisé sur 10)</td>
                <td className="py-2.5 text-center font-black text-emerald-400 bg-emerald-500/10 flex justify-center items-center gap-1">
                  {normalizeRatio(agroginaAnnualPrice, agroginaChecks)} <Crown size={12} className="text-emerald-400" />
                </td>
                {compPrices.map((p, i) => {
                  const val = normalizeRatio(p, compChecks[i]);
                  return (
                    <td key={i} className={`py-2.5 text-center text-xs font-bold ${val === 'N/D' ? 'text-slate-600' : 'text-slate-300'}`}>
                      {val}
                    </td>
                  );
                })}
              </tr>
                
              {/* Benchmark Footer Rows */}
              <tr className="border-t-2 border-slate-700 bg-slate-900/60 transition-all font-semibold">
                <td className="px-4 py-3 text-slate-300">Prix Annuel de Référence</td>
                <td className="px-4 py-3 text-center text-amber-500">{agroginaAnnualPrice > 0 ? `${Math.round(agroginaAnnualPrice).toLocaleString()} DH/an` : 'GRATUIT'}</td>
                {competitors.map((_, i) => (
                  <td key={i} className="px-2 py-3 text-center text-slate-400 text-xs">
                    {compPriceLabels[i]}
                  </td>
                ))}
              </tr>
              
              <tr className="bg-slate-900/80 font-black">
                <td className="px-4 py-3 text-slate-400">Ratio Valeur/Prix</td>
                <td className="px-4 py-3 text-center text-emerald-400">
                  {normalizeRatio(agroginaAnnualPrice, agroginaChecks)}
                </td>
                {competitors.map((_, i) => (
                  <td key={i} className="px-2 py-3 text-center text-slate-500">
                    {normalizeRatio(compPrices[i], compChecks[i])}
                  </td>
                ))}
              </tr>

            </tbody>
          </table>
        </div>

        {/* Risk Matrix */}
        <div className="bg-[#1e2436] rounded-xl border border-slate-800 p-6 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-400" /> Risques
          </h3>
          <div className="space-y-2">
            {risks.map(r => (
              <div key={r.id} className="flex items-start gap-2 p-2 rounded-lg bg-slate-900/30 border border-slate-800">
                <span className="text-sm">{r.prob}</span>
                <div>
                  <div className="text-xs font-bold text-white">{r.name}</div>
                  <div className="text-[10px] text-slate-500">{r.mitigation}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
