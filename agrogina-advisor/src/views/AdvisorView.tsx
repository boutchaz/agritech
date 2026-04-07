import { useMemo } from 'react';
import { useEngineStore } from '../store/engineStore';
import { generate60Months } from '../utils/engine60M';
import { BrainCircuit, AlertOctagon, CalendarClock, Target, TrendingUp } from 'lucide-react';

export default function AdvisorView() {
  const state = useEngineStore();
  const data = useMemo(() => generate60Months(state), [state]);

  const lowestCash = Math.min(...data.map(m => m.cash));
  const breakEvenMonth = data.find(m => m.ebitda > 0)?.month;
  const totalRDInvestment = data.reduce((a, m) => a + m.rdCapEx, 0);
  const month12 = data[11];
  
  // Sales bottleneck check — channel-based
  let totalLeads = 0;
  let weightedClients = 0;
  for (const ch of state.marketing.channels) {
    if (!ch.enabled) continue;
    let chLeads = 0;
    if (ch.frequency === 'yearly' && ch.eventsPerYear && ch.leadsPerEvent) {
      chLeads = Math.floor((ch.eventsPerYear * ch.leadsPerEvent) / 12);
    } else if (ch.costPerLead > 0 && ch.budgetMonthly > 0) {
      chLeads = Math.floor(ch.budgetMonthly / ch.costPerLead);
    } else {
      chLeads = ch.leadsPerMonth;
    }
    totalLeads += chLeads;
    weightedClients += chLeads * (ch.conversionPct / 100);
  }
  const clientsFromFunnel = Math.floor(weightedClients);
  const salesCap = (state.salesFreelanceCount + state.salesSalariedCount) * state.salesCapacityPerRep;
  const isSalesBottleneck = clientsFromFunnel > salesCap;
  const isMarketingBottleneck = clientsFromFunnel < salesCap && clientsFromFunnel < state.newUsersPerMonth;

  return (
    <div className="max-w-5xl mx-auto text-slate-200 pb-12">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <BrainCircuit className="text-pink-500" size={32} />
          Étape 7 — Conseiller IA CFO
        </h2>
        <p className="text-slate-400 mt-2 font-medium">Analyse d'impact automatique de votre configuration.</p>
      </div>

      <div className="space-y-4">
        {/* Cash Alert */}
        {lowestCash < 0 && (
          <div className="p-5 rounded-xl border bg-red-500/10 border-red-500/30">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-red-500/20 text-red-400"><AlertOctagon size={24} /></div>
              <div>
                <h3 className="text-lg font-bold text-red-400 mb-2">⚠️ Trésorerie Négative Détectée</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Manque estimé : <b>{lowestCash.toLocaleString('fr-FR')} DH</b>.<br />
                  <b>Solutions :</b> Avancez votre levée de fonds, réduisez les modules actifs dans la Roadmap R&D, ou augmentez le nombre de clients/mois.
                </p>
              </div>
            </div>
          </div>
        )}
        {lowestCash >= 0 && (
          <div className="p-5 rounded-xl border bg-emerald-500/10 border-emerald-500/30">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-emerald-500/20 text-emerald-400"><TrendingUp size={24} /></div>
              <div>
                <h3 className="text-lg font-bold text-emerald-400 mb-2">✅ Trésorerie Toujours Positive</h3>
                <p className="text-slate-300 text-sm">Votre Startup ne passe jamais en négatif sur les 60 mois. Cash plancher : <b>{lowestCash.toLocaleString('fr-FR')} DH</b>.</p>
              </div>
            </div>
          </div>
        )}

        {/* Break Even */}
        <div className="p-5 rounded-xl border bg-blue-500/10 border-blue-500/30">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-blue-500/20 text-blue-400"><CalendarClock size={24} /></div>
            <div>
              <h3 className="text-lg font-bold text-blue-400 mb-2">Point d'Équilibre (EBITDA &gt; 0)</h3>
              <p className="text-slate-300 text-sm">
                {breakEvenMonth ? `Atteint au Mois ${breakEvenMonth}. Après ce point, chaque mois génère du profit opérationnel.` : "Non atteint durant les 60 mois. Réduisez vos charges fixes ou augmentez vos ventes."}
              </p>
            </div>
          </div>
        </div>

        {/* R&D Investment */}
        <div className="p-5 rounded-xl border bg-amber-500/10 border-amber-500/30">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-amber-500/20 text-amber-400"><Target size={24} /></div>
            <div>
              <h3 className="text-lg font-bold text-amber-400 mb-2">Investissement R&D Total</h3>
              <p className="text-slate-300 text-sm">
                Budget R&D total injecté sur 60 mois : <b>{totalRDInvestment.toLocaleString('fr-FR')} DH</b>.
                {month12 && ` MRR atteint au Mois 12 : ${month12.totalMrr.toLocaleString('fr-FR')} DH/mois.`}
              </p>
            </div>
          </div>
        </div>

        {/* Sales Bottleneck */}
        {(isSalesBottleneck || isMarketingBottleneck) && (
          <div className="p-5 rounded-xl border bg-orange-500/10 border-orange-500/30">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-orange-500/20 text-orange-400"><Target size={24} /></div>
              <div>
                <h3 className="text-lg font-bold text-orange-400 mb-2">Déséquilibre Funnel</h3>
                <p className="text-slate-300 text-sm">
                  {isSalesBottleneck && "Trop de leads pour votre capacité commerciale. Recrutez des commerciaux ou réduisez le budget ads."}
                  {isMarketingBottleneck && "Vos commerciaux sont sous-alimentés en leads. Augmentez le budget marketing ou les salons."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
