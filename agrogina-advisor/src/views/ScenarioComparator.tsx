import { useEngineStore } from '../store/engineStore';
import { generate60Months } from '../utils/engine60M';
import { useState, useMemo } from 'react';
import { Scale, Target, TrendingUp, AlertTriangle, Activity, CheckCircle, Trophy, Star } from 'lucide-react';

export default function ScenarioComparator({ onResetToBuild }: { onResetToBuild: () => void }) {
  const store = useEngineStore();
  const { savedScenarios, startScenarioBuilder, loadScenario, removeScenario } = store;

  const [newScenarioName, setNewScenarioName] = useState('');

  // Generate projections for all saved scenarios
  const projections = useMemo(() => {
    return savedScenarios.map(scen => {
      // Create a temporary mock store state to run generate60Months
      // generate60Months only needs the state properties, not the actions
      const mockState = { ...scen.stateSnapshot } as any;
      const data = generate60Months(mockState);

      const m12 = data[11];
      const m36 = data[35];
      const m60 = data[59];
      const lowestCash = Math.min(...data.map(m => m.cash));
      const cashNeeded = lowestCash < 0 ? Math.abs(lowestCash) : 0;
      const breakEvenMonth = data.find(m => m.ebitda > 0)?.month || null;

      // Calculate CAC & LTV (approximate average)
      const avgMrr = data.length > 0 ? data[data.length - 1].totalMrr / Math.max(1, data[data.length - 1].users) : 0;
      const avgLife = mockState.churnRate > 0 ? 1 / (mockState.churnRate / 100) : 60;
      const ltv = avgMrr * avgLife;

      let varMkt = 0;
      for (const ch of mockState.marketing.channels) {
        if (!ch.enabled) continue;
        if (ch.frequency === 'yearly' && ch.eventsPerYear && ch.costPerEvent) {
          varMkt += (ch.eventsPerYear * ch.costPerEvent) / 12;
        } else {
          varMkt += ch.budgetMonthly;
        }
      }
      const monthlyAcqCost = varMkt + mockState.salesSalariedCount * mockState.salesRules.salariedBase;
      const cac = mockState.newUsersPerMonth > 0 ? monthlyAcqCost / mockState.newUsersPerMonth : 0;

      return {
        scenario: scen,
        data,
        mrrY1: m12.totalMrr,
        mrrY3: m36.totalMrr,
        mrrY5: m60.totalMrr,
        cashNeeded,
        breakEvenMonth,
        cac,
        ltv,
        ltvCac: cac > 0 ? ltv / cac : 0
      };
    });
  }, [savedScenarios]);

  const handleStartBuilder = () => {
    const name = newScenarioName.trim() || `Scénario ${savedScenarios.length + 1}`;
    startScenarioBuilder(name);
    onResetToBuild(); // Takes the user to step 1 (Pricing)
  };

  const generateDifferencesBlock = () => {
    if (projections.length !== 2) return null;
    const [scenA, scenB] = projections;
    const stateA = scenA.scenario.stateSnapshot;
    const stateB = scenB.scenario.stateSnapshot;

    const diffs: { label: string, valA: any, valB: any }[] = [];

    if (stateA.erpSizeMultiplier !== stateB.erpSizeMultiplier) {
      diffs.push({ label: 'Multiplicateur ERP', valA: `x${stateA.erpSizeMultiplier}`, valB: `x${stateB.erpSizeMultiplier}` });
    }

    stateA.haPriceTiers.forEach((tierA: any, i: number) => {
      const tierB = stateB.haPriceTiers[i];
      if (tierA.pricePerHa !== tierB.pricePerHa) {
        diffs.push({ label: `Prix ${tierA.label}`, valA: `${tierA.pricePerHa} DH`, valB: `${tierB.pricePerHa} DH` });
      }
    });

    const repA = stateA.salesFreelanceCount + stateA.salesSalariedCount;
    const repB = stateB.salesFreelanceCount + stateB.salesSalariedCount;
    if (repA !== repB) diffs.push({ label: 'Force de Vente (Total)', valA: repA, valB: repB });

    const sumMkt = (state: any) => state.marketing.channels.reduce((sum: number, ch: any) => sum + (ch.enabled ? ch.budgetMonthly : 0), 0);
    const mktA = sumMkt(stateA);
    const mktB = sumMkt(stateB);
    if (mktA !== mktB) diffs.push({ label: 'Budget Marketing (Mensuel)', valA: `${mktA} DH`, valB: `${mktB} DH` });

    const modA = stateA.erpModules.filter((m: any) => m.checked).length;
    const modB = stateB.erpModules.filter((m: any) => m.checked).length;
    if (modA !== modB) diffs.push({ label: 'Modules ERP Actifs', valA: modA, valB: modB });

    const sumP1 = (fc: any) => Object.entries(fc).filter(([k]) => k.startsWith('phase1') || k.startsWith('admP1') || k.startsWith('mktBrandP1')).reduce((s, [_, v]) => s + Number(v), 0);
    const sumP2 = (fc: any) => Object.entries(fc).filter(([k]) => k.startsWith('phase2') || k.startsWith('admP2') || k.startsWith('mktBrandP2')).reduce((s, [_, v]) => s + Number(v), 0);

    const p1A = sumP1(stateA.fixedCosts);
    const p1B = sumP1(stateB.fixedCosts);
    if (p1A !== p1B) diffs.push({ label: 'Charges Phase 1 (Mensuel)', valA: `${p1A} DH`, valB: `${p1B} DH` });

    const p2A = sumP2(stateA.fixedCosts);
    const p2B = sumP2(stateB.fixedCosts);
    if (p2A !== p2B) diffs.push({ label: 'Charges Phase 2 (Mensuel)', valA: `${p2A} DH`, valB: `${p2B} DH` });

    if (diffs.length === 0) return null;

    return (
      <div className="mb-6 bg-[#161b29] border border-fuchsia-500/20 rounded-xl overflow-hidden shadow-lg relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/10 blur-3xl rounded-full pointer-events-none"></div>
        <div className="p-3 bg-fuchsia-500/5 border-b border-fuchsia-500/20 flex items-center gap-2">
          <Activity size={16} className="text-fuchsia-400" />
          <span className="text-sm font-black text-fuchsia-300">Différences Détectées Automatiquement</span>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {diffs.map((d, i) => (
            <div key={i} className="p-3 bg-slate-900/60 rounded-lg border border-slate-700/50 flex flex-col justify-between">
              <div className="text-[10px] text-slate-400 uppercase font-bold mb-2 tracking-wide">{d.label}</div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-bold bg-slate-800/80 px-2 py-1 rounded truncate max-w-[45%]">{d.valA}</span>
                <span className="text-slate-600 font-black italic">vs</span>
                <span className="text-slate-300 font-bold bg-slate-800/80 px-2 py-1 rounded truncate max-w-[45%]">{d.valB}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const generateExpertConclusion = () => {
    if (projections.length < 2) {
      return <div className="text-indigo-300 italic text-sm p-4 text-center">Enregistrez au moins deux scénarios pour permettre l'audit du CFO.</div>;
    }

    const calcCfoScore = (proj: any) => {
      const state = proj.scenario.stateSnapshot;
      let breakdown: { axis: string; score: number; max: number; label: string }[] = [];

      let beScore = 1;
      if (proj.breakEvenMonth) {
        if (proj.breakEvenMonth <= 12) beScore = 5;
        else if (proj.breakEvenMonth <= 24) beScore = 4;
        else if (proj.breakEvenMonth <= 36) beScore = 3;
        else if (proj.breakEvenMonth <= 48) beScore = 2;
      }
      breakdown.push({ axis: 'Vitesse de Breakeven', score: beScore, max: 5, label: proj.breakEvenMonth ? `Mois ${proj.breakEvenMonth}` : 'Jamais' });

      let cashScore = 1;
      if (proj.cashNeeded < 500000) cashScore = 5;
      else if (proj.cashNeeded < 1000000) cashScore = 4;
      else if (proj.cashNeeded < 2000000) cashScore = 3;
      else if (proj.cashNeeded < 3000000) cashScore = 2;
      breakdown.push({ axis: 'Trésorerie Plancher', score: cashScore, max: 5, label: `${(proj.cashNeeded / 1000000).toFixed(2)}M DH` });

      let ltvScore = 1;
      if (proj.ltvCac >= 5) ltvScore = 5;
      else if (proj.ltvCac >= 3) ltvScore = 4;
      else if (proj.ltvCac >= 2) ltvScore = 3;
      else if (proj.ltvCac >= 1) ltvScore = 2;
      breakdown.push({ axis: 'Multiple Invt. (LTV:CAC)', score: ltvScore, max: 5, label: `${proj.ltvCac.toFixed(1)}x` });

      const rmCount = state.roadmapItems.filter((i: any) => i.checked).length;
      let rmScore = Math.min(5, Math.max(1, Math.round(rmCount / 2)));
      breakdown.push({ axis: 'Déblocage Roadmap', score: rmScore, max: 5, label: `${rmCount} modules` });

      let churnScore = 1;
      if (state.churnRate <= 1) churnScore = 5;
      else if (state.churnRate <= 2) churnScore = 4;
      else if (state.churnRate <= 4) churnScore = 3;
      else if (state.churnRate <= 6) churnScore = 2;
      breakdown.push({ axis: 'Résistance Churn (-30%)', score: churnScore, max: 5, label: `Basé sur ${state.churnRate}%/an` });

      const validTiers = state.haPriceTiers.filter((t: any) => t.valuePerHa && t.valuePerHa > 0);
      const hasValueAnchoring = validTiers.length > 0;

      if (hasValueAnchoring) {
        let avgRatio = validTiers.reduce((sum: number, t: any) => sum + (t.pricePerHa / t.valuePerHa), 0) / validTiers.length;
        let defScore = 1;
        if (avgRatio <= 0.15) defScore = 5;
        else if (avgRatio <= 0.25) defScore = 4;
        else if (avgRatio <= 0.35) defScore = 3;
        else if (avgRatio <= 0.5) defScore = 2;

        breakdown.push({ axis: 'Défendabilité Commerciale', score: defScore, max: 5, label: `Ratio Prix: ${(avgRatio * 100).toFixed(0)}%` });
      }

      const totalScore = breakdown.reduce((acc, b) => acc + b.score, 0) / breakdown.length;

      return {
        id: proj.scenario.id,
        name: proj.scenario.name,
        totalScore,
        breakdown,
        hasValueAnchoring,
        mrrY5: proj.mrrY5,
      };
    };

    const scores = projections.map(calcCfoScore);
    const winner = [...scores].sort((a, b) => b.totalScore - a.totalScore)[0];
    const isCommercialDefendable = winner.hasValueAnchoring && winner.breakdown.find(b => b.axis === 'Défendabilité Commerciale')?.score! >= 3;

    return (
      <div className="space-y-6 text-sm text-indigo-100/90 leading-relaxed mt-4">
        {/* Scoring Table */}
        <div className="overflow-x-auto rounded-xl border border-indigo-500/20 bg-indigo-950/20">
          <table className="w-full text-left text-xs">
            <thead className="bg-indigo-900/40 text-indigo-300 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Axe d'Exploration CFO</th>
                {scores.map(s => (
                  <th key={s.id} className="px-4 py-3 text-center border-l border-indigo-500/10">
                    <div className="flex flex-col items-center gap-1">
                      {s.id === winner.id && <Trophy size={14} className="text-amber-400" />}
                      <span className={s.id === winner.id ? 'text-white' : ''}>{s.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-500/10">
              {scores[0].breakdown.map((row, i) => (
                <tr key={i} className="hover:bg-indigo-900/20">
                  <td className="px-4 py-2.5 font-bold text-indigo-200">{row.axis} {row.axis.includes('Défendabilité') && <span className="ml-1 px-1.5 py-0.5 rounded text-[8px] bg-emerald-500/20 text-emerald-300">New</span>}</td>
                  {scores.map(s => {
                    const cell = s.breakdown[i];
                    return (
                      <td key={s.id} className="px-4 py-2.5 text-center border-l border-indigo-500/10">
                        <div className="flex flex-col items-center gap-0.5">
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <Star key={idx} size={10} className={idx < cell.score ? 'fill-amber-400 text-amber-400' : 'fill-slate-800 text-slate-700'} />
                            ))}
                          </div>
                          <span className="text-[9px] text-indigo-400 font-medium">{cell.label}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Total Score */}
              <tr className="bg-indigo-900/30">
                <td className="px-4 py-3 font-black text-white uppercase text-[10px] tracking-wider">Score Global Pondéré</td>
                {scores.map(s => (
                  <td key={s.id} className="px-4 py-3 text-center border-l border-indigo-500/10">
                    <div className={`text-lg font-black ${s.id === winner.id ? 'text-amber-400' : 'text-indigo-300'}`}>
                      {s.totalScore.toFixed(1)} <span className="text-[10px] font-normal opacity-50">/ 5</span>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className={`p-5 rounded-xl border-l-4 ${isCommercialDefendable ? 'bg-emerald-900/20 border-emerald-500' : 'bg-blue-900/20 border-blue-500'}`}>
          <h4 className="font-black text-white mb-2 flex items-center gap-2">
            <CheckCircle size={18} className={isCommercialDefendable ? 'text-emerald-400' : 'text-blue-400'} />
            Verdict Final pour le SIAM
          </h4>
          <p className="text-sm">
            Le modèle <strong>« {winner.name} »</strong> écrase la compétition interne avec un score pondéré de {winner.totalScore.toFixed(1)}/5.
            Il présente le profil risque/rentabilité le plus sain pour rassurer des investisseurs.
            {isCommercialDefendable ? (
              <span className="text-emerald-300 font-bold block mt-2">
                🟢 Le scénario est financièrement dominant ET commercialement défendable. C'est la configuration à retenir pour le lancement officiel.
              </span>
            ) : winner.hasValueAnchoring ? (
              <span className="text-blue-300 font-bold block mt-2">
                🔵 Le scénario est le meilleur, mais assurez-vous que la proposition de valeur soutienne fermement ce prix.
              </span>
            ) : (
              <span className="text-slate-400 block mt-2">
                💡 Astuce : Allez dans l'étape 1 (Pricing) et remplissez "Ancrage Valeur Client" pour activer le 6ème axe de défendabilité commerciale.
              </span>
            )}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto text-slate-200 pb-12">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <Scale className="text-blue-500" size={32} />
          Étape 9 — Comparateur de Scénarios
        </h2>
        <p className="text-slate-400 mt-2 font-medium">Sauvegardez vos configurations actuelles pour les comparer côte à côte avec une analyse d'expert financier.</p>
      </div>

      {/* Wizard Start Action */}
      <div className="bg-[#1e2436] rounded-xl border border-blue-500/30 p-8 shadow-xl mb-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-3xl opacity-50 rounded-full"></div>
        <div className="relative z-10 w-full md:w-auto">
          <h3 className="text-xl font-black text-white mb-2 flex items-center gap-2"><Scale className="text-blue-400" /> Assistant de Création</h3>
          <p className="text-sm text-slate-400 max-w-md leading-relaxed">
            Créez un nouveau scénario métier avec notre assistant guidé étape par étape. Votre modèle principal sera sauvegardé en lieu sûr pendant la configuration de l'hypothèse.
          </p>
        </div>
        <div className="relative z-10 w-full md:w-auto flex flex-col sm:flex-row items-center gap-3">
          <input type="text" placeholder="Nom (ex: Modèle Achat Drone)" value={newScenarioName} onChange={e => setNewScenarioName(e.target.value)}
            className="w-full sm:w-64 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none transition" />
          <button onClick={handleStartBuilder} className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-lg transition shadow-lg shadow-blue-500/20 flex flex-col items-center justify-center">
            <span>🚀 Démarrer l'Assistant</span>
            <span className="text-[9px] font-bold text-blue-200">Sans risque pour le modèle principal</span>
          </button>
        </div>
      </div>

      {savedScenarios.length === 0 ? (
        <div className="text-center py-20 bg-[#1e2436] rounded-xl border border-slate-800 border-dashed">
          <Scale size={48} className="text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Aucun Scénario Sauvegardé</h3>
          <p className="text-slate-400">Sauvegardez la configuration actuelle pour démarrer la comparaison.</p>
        </div>
      ) : (
        <>
          {generateDifferencesBlock()}

          {/* Comparison Table */}
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4">
              {projections.map((proj: any) => (
                <div key={proj.scenario.id} className="min-w-[320px] flex-1 bg-[#1e2436] rounded-xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
                  {/* Header */}
                  <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-lg text-white">{proj.scenario.name}</h4>
                      <p className="text-[10px] text-slate-500">{new Date(proj.scenario.date).toLocaleString('fr-FR')}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => loadScenario(proj.scenario.id)} className="text-xs text-blue-400 hover:text-blue-300 font-bold px-2 py-1 bg-blue-500/10 rounded">Charger</button>
                      <button onClick={() => removeScenario(proj.scenario.id)} className="text-xs text-red-400 hover:text-red-300 font-bold px-2 py-1 bg-red-500/10 rounded">X</button>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 flex-1 space-y-6">
                    {/* Revenue Row */}
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold mb-3 flex items-center gap-1"><TrendingUp size={12} /> Trajectoire MRR</div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-slate-900/50 p-2 rounded border border-slate-800 text-center">
                          <div className="text-[9px] text-slate-500">Année 1</div>
                          <div className="text-sm font-bold text-white">{(proj.mrrY1 / 1000).toFixed(1)}k</div>
                        </div>
                        <div className="bg-slate-900/50 p-2 rounded border border-slate-800 text-center">
                          <div className="text-[9px] text-slate-500">Année 3</div>
                          <div className="text-sm font-bold text-emerald-400">{(proj.mrrY3 / 1000).toFixed(1)}k</div>
                        </div>
                        <div className="bg-slate-900/50 p-2 rounded border border-slate-800 text-center relative overflow-hidden">
                          <div className="absolute inset-0 bg-blue-500/10"></div>
                          <div className="text-[9px] text-blue-300 relative z-10">Année 5</div>
                          <div className="text-sm font-black text-blue-400 relative z-10">{(proj.mrrY5 / 1000).toFixed(1)}k</div>
                        </div>
                      </div>
                    </div>

                    {/* Risk Row */}
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold mb-3 flex items-center gap-1"><AlertTriangle size={12} /> Risque & Financement</div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center p-2 rounded bg-amber-500/5 border border-amber-500/20">
                          <span className="text-xs text-slate-400">Cash Nécessaire</span>
                          <span className="font-bold text-amber-400">{(proj.cashNeeded / 1000000).toFixed(2)}M DH</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded bg-emerald-500/5 border border-emerald-500/20">
                          <span className="text-xs text-slate-400">Mois Break-Even</span>
                          <span className="font-bold text-emerald-400">{proj.breakEvenMonth ? `Mois ${proj.breakEvenMonth}` : 'Jamais'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Unit Economics Row */}
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold mb-3 flex items-center gap-1"><Target size={12} /> Unit Economics</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 rounded border border-slate-800 text-center">
                          <div className="text-[9px] text-slate-500 mb-1">CAC Unitaire</div>
                          <div className="font-bold text-white">{Math.round(proj.cac).toLocaleString('fr-FR')} DH</div>
                        </div>
                        <div className={`p-2 rounded border text-center ${proj.ltvCac >= 3 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                          <div className="text-[9px] mb-1 font-bold">Ratio LTV:CAC</div>
                          <div className={`font-black ${proj.ltvCac >= 3 ? 'text-emerald-400' : 'text-red-400'}`}>{proj.ltvCac.toFixed(1)}x</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Expert Conclusion */}
          <div className="mt-6 bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/30 rounded-xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-3xl opacity-50 rounded-full"></div>
            <div className="relative z-10">
              <h3 className="text-lg font-black text-white mb-2 flex items-center gap-2">
                <Scale className="text-indigo-400" size={20} />
                Avis de l'Expert Financier
              </h3>
              <div className="w-full">
                {generateExpertConclusion()}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
