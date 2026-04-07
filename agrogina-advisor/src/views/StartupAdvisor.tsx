import { useMemo } from 'react';
import { useEngineStore, computeErpMonthly, computeHaTotalPrice, computeHaTotalPriceStatic } from '../store/engineStore';
import type { EngineState } from '../store/engineStore';
import { generate60Months } from '../utils/engine60M';
import { Briefcase, AlertOctagon, Target, Lightbulb, Banknote, Building2, Workflow, Fingerprint } from 'lucide-react';

// Helpers to simulate Stress Tests
function cloneState(state: EngineState): EngineState {
  return JSON.parse(JSON.stringify(state));
}

// Scénario analysis helper
function runComparator(mockState: EngineState) {
  const data = generate60Months(mockState);
  const m60 = data[59]!;
  const lowestCash = Math.min(...data.map(m => m.cash));
  const breakEven = data.find(m => m.ebitda > 0)?.month || null;
  const cashNeeded = lowestCash < 0 ? Math.abs(lowestCash) : 0;
  
  // Quick CAC/LTV approximation for the state
  const erpMonthly = computeErpMonthly(mockState.erpModules);
  const agroAnnual = mockState.haPricingMode === 'static'
    ? computeHaTotalPriceStatic(mockState.avgHectaresPerClient, mockState.haPriceTiers)
    : computeHaTotalPrice(mockState.avgHectaresPerClient, mockState.haPriceTiers);
  const baseMrr = (erpMonthly + agroAnnual / 12) * (1 - mockState.discountPct / 100);
  
  const avgLife = mockState.churnRate > 0 ? 1 / (mockState.churnRate / 100) : 60;
  const ltv = baseMrr * avgLife;

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

  // Max Roadmaps month
  let lastUnlockMonth = 0;
  mockState.roadmapItems.forEach(r => {
    if (r.checked) lastUnlockMonth += r.deliveryMonths;
  });

  return { 
    data, m60, lowestCash, cashNeeded, breakEven, cac, ltv, 
    ltvCac: cac > 0 ? ltv/cac : 0, 
    baseMrr, lastUnlockMonth,
    state: mockState
  };
}

// Scorer function
function calculateScore(metric: number, type: 'breakeven' | 'cash' | 'ltvcac' | 'roadmap' | 'churn', cCac?: number): number {
  if (type === 'breakeven') {
    if (!metric) return 1;
    if (metric <= 12) return 5;
    if (metric <= 24) return 4;
    if (metric <= 36) return 3;
    if (metric <= 48) return 2;
    return 1;
  }
  if (type === 'cash') { // cashNeeded 
    if (metric <= 0) return 5;
    if (metric <= 1000000) return 4;
    if (metric <= 2500000) return 3;
    if (metric <= 5000000) return 2;
    return 1;
  }
  if (type === 'ltvcac') {
    if (metric >= 5) return 5;
    if (metric >= 3) return 4;
    if (metric >= 1.5) return 3;
    if (metric >= 1) return 2;
    return 1;
  }
  if (type === 'roadmap') {
    if (metric <= 6) return 5;
    if (metric <= 12) return 4;
    if (metric <= 18) return 3;
    if (metric <= 24) return 2;
    return 1;
  }
  if (type === 'churn') { // metric = new cashNeeded after 30% churn shock
    if (metric <= 0) return 5;
    if (!cCac || metric <= cCac * 1.5) return 4;
    return 2;
  }
  return 3;
}

export default function StartupAdvisor() {
  const state = useEngineStore();

  const scenariosToCompare = useMemo(() => {
    // Collect up to 2 saved scenarios if available, otherwise fallback to current state
    const saved = state.savedScenarios || [];
    if (saved.length >= 2) {
      return [runComparator(saved[0].stateSnapshot as EngineState), runComparator(saved[1].stateSnapshot as EngineState)];
    } else if (saved.length === 1) {
      return [runComparator(saved[0].stateSnapshot as EngineState), runComparator(state as EngineState)];
    } else {
      // Just baseline vs itself (hidden comparator logic)
      return [runComparator(state as EngineState)];
    }
  }, [state, state.savedScenarios]);

  // Differences detector
  const differences = useMemo(() => {
    if (scenariosToCompare.length < 2) return null;
    const [s1, s2] = [scenariosToCompare[0].state, scenariosToCompare[1].state];
    const diffs: { prop: string; v1: any; v2: any }[] = [];

    // Compare Pricing Tiers
    if (JSON.stringify(s1.haPriceTiers) !== JSON.stringify(s2.haPriceTiers)) {
      diffs.push({ prop: 'Prix AgromindIA par tranche', v1: 'Configuration A', v2: 'Configuration B' });
    }
    // ERP
    if (JSON.stringify(s1.erpModules) !== JSON.stringify(s2.erpModules)) {
      diffs.push({ prop: 'Multiplicateurs ERP', v1: 'Configuration A', v2: 'Configuration B' });
    }
    if (s1.salesSalariedCount !== s2.salesSalariedCount) {
      diffs.push({ prop: 'Commerciaux Salariés', v1: s1.salesSalariedCount, v2: s2.salesSalariedCount });
    }
    // Marketing Budget
    const mkt1 = s1.marketing.channels.reduce((a,c) => a + c.budgetMonthly, 0);
    const mkt2 = s2.marketing.channels.reduce((a,c) => a + c.budgetMonthly, 0);
    if (mkt1 !== mkt2) {
      diffs.push({ prop: 'Budget Marketing Mensuel', v1: `${mkt1} DH`, v2: `${mkt2} DH` });
    }
    // Roadmap triggers
    const trigger1 = s1.roadmapItems.filter(r => r.checked).map(r => r.name).join(', ');
    const trigger2 = s2.roadmapItems.filter(r => r.checked).map(r => r.name).join(', ');
    if (trigger1 !== trigger2) {
      diffs.push({ prop: 'Modules Roadmap Activés', v1: `${s1.roadmapItems.filter(r => r.checked).length} modules`, v2: `${s2.roadmapItems.filter(r => r.checked).length} modules` });
    }
    // Operations Thresholds
    if (s1.fixedCosts.savTerrainTriggerClients !== s2.fixedCosts.savTerrainTriggerClients) {
      diffs.push({ prop: 'Seuil SAV Terrain', v1: `${s1.fixedCosts.savTerrainTriggerClients} clients`, v2: `${s2.fixedCosts.savTerrainTriggerClients} clients` });
    }
    if (s1.fixedCosts.devMaintenanceTriggerModules !== s2.fixedCosts.devMaintenanceTriggerModules) {
      diffs.push({ prop: 'Seuil Développeur', v1: `${s1.fixedCosts.devMaintenanceTriggerModules} modules`, v2: `${s2.fixedCosts.devMaintenanceTriggerModules} modules` });
    }

    return diffs;
  }, [scenariosToCompare]);

  // Evaluate scores
  const evalues = useMemo(() => {
    return scenariosToCompare.map((scen, idx) => {
      const sBreak = calculateScore(scen.breakEven || 99, 'breakeven');
      const sCash = calculateScore(scen.cashNeeded, 'cash');
      const sLtvCac = calculateScore(scen.ltvCac, 'ltvcac');
      const sRoadmap = calculateScore(scen.lastUnlockMonth, 'roadmap');
      
      // Churn 30% Shock Test
      const shockState = cloneState(scen.state);
      shockState.churnRate = shockState.churnRate + 30; // Brutal 30% shock
      const shockRun = runComparator(shockState);
      const sChurn = calculateScore(shockRun.cashNeeded, 'churn', scen.cashNeeded);

      const total = sBreak + sCash + sLtvCac + sRoadmap + sChurn;
      const average = total / 5;

      return { ...scen, idx, scores: { breakeven: sBreak, cash: sCash, ltvcac: sLtvCac, roadmap: sRoadmap, churn: sChurn }, total, average };
    });
  }, [scenariosToCompare]);

  const winner = evalues.length > 1 ? (evalues[0].total >= evalues[1].total ? evalues[0] : evalues[1]) : evalues[0];
  const sName1 = state.savedScenarios?.[0]?.name || 'Scénario 1';
  const sName2 = state.savedScenarios?.[1]?.name || 'Actuel';

  return (
    <div className="max-w-6xl mx-auto text-slate-200 pb-20">
      
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-fuchsia-500/20 rounded-full mb-4 ring-4 ring-fuchsia-500/10">
          <Briefcase className="text-fuchsia-400" size={32} />
        </div>
        <h2 className="text-4xl font-black text-white tracking-tight">Expert CFO : Comparateur de Scénarios</h2>
        <p className="text-slate-400 mt-3 max-w-2xl mx-auto text-lg">
          Intelligence d'aide à la décision. Évaluation multi-axiale des trajectoires financières et commerciales.
        </p>
      </div>

      <div className="space-y-8">

        {/* Différences Détectées (Only if 2 scenarios) */}
        {differences && differences.length > 0 && (
          <div className="bg-[#1e2436] rounded-2xl border border-blue-500/30 overflow-hidden shadow-2xl">
            <div className="bg-blue-900/20 p-4 border-b border-blue-500/30 flex items-center gap-3">
              <Fingerprint className="text-blue-400" size={20} />
              <h3 className="text-lg font-bold text-blue-100">Différences Détectées entre les scénarios</h3>
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">Paramètre</th>
                    <th className="px-4 py-3">{sName1}</th>
                    <th className="px-4 py-3 rounded-tr-lg">{sName2}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {differences.map((d, i) => (
                    <tr key={i} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-medium text-slate-300">{d.prop}</td>
                      <td className="px-4 py-3 text-emerald-400">{d.v1}</td>
                      <td className="px-4 py-3 text-blue-400">{d.v2}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tableau de Scoring 6 Axes */}
        <section className="bg-[#1e2436] rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
          <div className="bg-slate-800/50 p-6 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="text-emerald-400" size={24} />
              <h3 className="text-xl font-bold text-white">Tableau de Scoring CFO (Audit 5 Axes)</h3>
            </div>
            {evalues.length > 1 && (
              <div className="text-sm font-bold bg-fuchsia-500/20 text-fuchsia-300 px-3 py-1 rounded-full border border-fuchsia-500/30">
                SCÉNARIO GAGNANT : {winner.idx === 0 ? sName1 : sName2}
              </div>
            )}
          </div>
          <div className="p-6 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase bg-[#1a1f30]">
                <tr>
                  <th className="px-4 py-4 rounded-tl-lg">Axe d'Évaluation</th>
                  <th className="px-4 py-4 text-center">{evalues.length > 1 ? sName1 : 'Scénario Actuel'}</th>
                  {evalues.length > 1 && <th className="px-4 py-4 text-center rounded-tr-lg">{sName2}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                
                <tr className="hover:bg-slate-800/20">
                  <td className="px-4 py-4 font-medium text-white flex items-center gap-2"><Lightbulb size={14} className="text-amber-400"/> Vitesse de Breakeven</td>
                  {evalues.map(e => (
                    <td key={e.idx} className="px-4 py-4 text-center">
                      <div className="flex justify-center gap-1 mb-1">
                        {[1,2,3,4,5].map(star => <span key={star} className={star <= e.scores.breakeven ? 'text-amber-400' : 'text-slate-700'}>★</span>)}
                      </div>
                      <div className="text-[10px] text-slate-500">{e.breakEven ? `Mois ${e.breakEven}` : 'Jamais/Tard'}</div>
                    </td>
                  ))}
                </tr>

                <tr className="hover:bg-slate-800/20">
                  <td className="px-4 py-4 font-medium text-white flex items-center gap-2"><Banknote size={14} className="text-emerald-400"/> Trésorerie Plancher (Risque Cash)</td>
                  {evalues.map(e => (
                    <td key={e.idx} className="px-4 py-4 text-center">
                      <div className="flex justify-center gap-1 mb-1">
                        {[1,2,3,4,5].map(star => <span key={star} className={star <= e.scores.cash ? 'text-emerald-400' : 'text-slate-700'}>★</span>)}
                      </div>
                      <div className="text-[10px] text-slate-500">{(e.cashNeeded/1000000).toFixed(2)}M DH Max</div>
                    </td>
                  ))}
                </tr>

                <tr className="hover:bg-slate-800/20">
                  <td className="px-4 py-4 font-medium text-white flex items-center gap-2"><Workflow size={14} className="text-blue-400"/> Investisseur : Scalabilité LTV/CAC</td>
                  {evalues.map(e => (
                    <td key={e.idx} className="px-4 py-4 text-center">
                      <div className="flex justify-center gap-1 mb-1">
                        {[1,2,3,4,5].map(star => <span key={star} className={star <= e.scores.ltvcac ? 'text-blue-400' : 'text-slate-700'}>★</span>)}
                      </div>
                      <div className="text-[10px] text-slate-500">{e.ltvCac.toFixed(1)}x</div>
                    </td>
                  ))}
                </tr>

                <tr className="hover:bg-slate-800/20">
                  <td className="px-4 py-4 font-medium text-white flex items-center gap-2"><AlertOctagon size={14} className="text-fuchsia-400"/> Résistance au Churn (Choc -30%)</td>
                  {evalues.map(e => (
                    <td key={e.idx} className="px-4 py-4 text-center">
                      <div className="flex justify-center gap-1 mb-1">
                        {[1,2,3,4,5].map(star => <span key={star} className={star <= e.scores.churn ? 'text-fuchsia-400' : 'text-slate-700'}>★</span>)}
                      </div>
                      <div className="text-[10px] text-slate-500">Test Stress Survie</div>
                    </td>
                  ))}
                </tr>

                <tr className="hover:bg-slate-800/20">
                  <td className="px-4 py-4 font-medium text-white flex items-center gap-2"><Building2 size={14} className="text-orange-400"/> Vitesse Déblocage Roadmap</td>
                  {evalues.map(e => (
                    <td key={e.idx} className="px-4 py-4 text-center">
                      <div className="flex justify-center gap-1 mb-1">
                        {[1,2,3,4,5].map(star => <span key={star} className={star <= e.scores.roadmap ? 'text-orange-400' : 'text-slate-700'}>★</span>)}
                      </div>
                      <div className="text-[10px] text-slate-500">{e.lastUnlockMonth} Mois TTM</div>
                    </td>
                  ))}
                </tr>

              </tbody>
              <tfoot className="bg-slate-900/80">
                <tr>
                  <td className="px-4 py-4 font-black text-white uppercase tracking-wider">Score Pondéré Global</td>
                  {evalues.map(e => (
                    <td key={e.idx} className={`px-4 py-4 text-center font-black text-xl ${e.idx === winner.idx && evalues.length > 1 ? 'text-fuchsia-400' : 'text-white'}`}>
                      {e.average.toFixed(1)} <span className="text-sm font-normal text-slate-500">/ 5.0</span>
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* SECTION 4: The Verdict */}
        <section className="bg-gradient-to-r from-fuchsia-900/40 to-indigo-900/40 rounded-2xl border border-fuchsia-500/30 overflow-hidden shadow-2xl p-8 relative">
          <div className="absolute inset-0 bg-noise opacity-10"></div>
          <div className="relative z-10">
            <h3 className="text-2xl font-black text-white mb-4">Verdict du Startup Advisor</h3>
            <div className="text-slate-200 leading-relaxed space-y-4">
              <p className="text-lg">
                Le <strong>{evalues.length > 1 ? (winner.idx === 0 ? sName1 : sName2) : sName2}</strong> est financièrement dominant ET commercialement défendable — <strong>configuration recommandée pour le lancement SIAM.</strong>
              </p>
              
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 mt-6 mt-4">
                <h4 className="font-bold text-fuchsia-300 mb-2 uppercase text-xs tracking-wider">Justification Analytique Automatisée</h4>
                <ul className="list-disc pl-5 space-y-2 text-sm text-slate-300">
                  <li><strong>Charges de structure :</strong> Ce modèle déclenche le recrutement d'un SAV au client {winner.state.fixedCosts.savTerrainTriggerClients} et d'un Technicien au module {winner.state.fixedCosts.techInstallTriggerHwModules}, permettant de maintenir le Breakeven au mois {winner.breakEven || 'N/A'}.</li>
                  <li><strong>Efficience Roadmap :</strong> Le déblocage de {winner.state.roadmapItems.filter(r=>r.checked).length} modules actifs répartit efficacement le risque technologique sur {winner.lastUnlockMonth} mois de go-to-market.</li>
                  <li><strong>Force du Modèle :</strong> Une efficience d'acquisition de LTV:CAC {winner.ltvCac.toFixed(1)}x avec un fond de roulement optimisé de {(winner.cashNeeded / 1000000).toFixed(2)}M DH.</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-fuchsia-500/30 flex items-center gap-4">
              <div className="w-12 h-12 bg-fuchsia-500 rounded-full flex items-center justify-center font-black text-white text-xl shadow-lg ring-4 ring-fuchsia-500/20">AG</div>
              <div>
                <div className="text-white font-bold">Cabinet Conseil Agrogina (AI Powered)</div>
                <div className="text-xs text-fuchsia-300">Généré le {new Date().toLocaleDateString('fr-FR')}</div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
