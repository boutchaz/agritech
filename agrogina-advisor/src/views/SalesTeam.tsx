import { useState } from 'react';
import { useEngineStore } from '../store/engineStore';
import { Users, UserCheck, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';

export default function SalesTeam() {
  const {
    salesFreelanceCount, salesSalariedCount, salesCapacityPerRep,
    salesRules, salesScaling, churnRate,
    setSalesFreelance, setSalesSalaried, setSalesCapacity,
    updateSalesRules, updateSalesScaling, setChurn,
  } = useEngineStore();

  const [freelanceOpen, setFreelanceOpen] = useState(false);
  const [salariedOpen, setSalariedOpen] = useState(false);

  return (
    <div className="max-w-5xl mx-auto text-slate-200 pb-12">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <Users className="text-blue-500" size={32} />
          Étape 4 — Équipe Commerciale
        </h2>
        <p className="text-slate-400 mt-2 font-medium">Freelances (commission) + Salariés (base + prime). Scaling automatique.</p>
      </div>
      <div className="space-y-4">
        {/* Freelances — Collapsible */}
        <div className="bg-[#1e2436] rounded-xl border border-slate-800 shadow-xl overflow-hidden">
          <button onClick={() => setFreelanceOpen(!freelanceOpen)}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-800/20 transition-colors text-left">
            <div className="flex items-center gap-2">
              <UserCheck size={20} className="text-indigo-400" />
              <span className="text-lg font-bold text-white">Freelances (Commission Only)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-indigo-400 font-bold">{salesFreelanceCount} rep · {salesRules.freelanceComY1Pct}% com</span>
              {freelanceOpen ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
            </div>
          </button>
          {freelanceOpen && (
            <div className="border-t border-slate-800 p-6 pt-4 space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1 uppercase">Nombre</label>
                <input type="number" min="0" value={salesFreelanceCount} onChange={e => setSalesFreelance(Number(e.target.value))}
                  className="w-full bg-slate-800 rounded px-3 py-2 text-lg font-bold text-white border border-slate-700" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Commission Y1 (%)</label>
                <div className="flex items-center gap-2">
                  <input type="range" min="5" max="30" value={salesRules.freelanceComY1Pct}
                    onChange={e => updateSalesRules('freelanceComY1Pct', Number(e.target.value))} className="flex-1 accent-indigo-500" />
                  <span className="text-indigo-400 font-bold w-12 text-right">{salesRules.freelanceComY1Pct}%</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Rente Y2+ (%)</label>
                <div className="flex items-center gap-2">
                  <input type="range" min="0" max="15" value={salesRules.freelanceComY2Pct}
                    onChange={e => updateSalesRules('freelanceComY2Pct', Number(e.target.value))} className="flex-1 accent-indigo-500" />
                  <span className="text-indigo-400 font-bold w-12 text-right">{salesRules.freelanceComY2Pct}%</span>
                </div>
              </div>
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 text-xs text-indigo-200">
                💡 0 coût fixe. {salesRules.freelanceComY1Pct}% du contrat annuel à la vente, puis {salesRules.freelanceComY2Pct}% de rente récurrente.
              </div>
            </div>
          )}
        </div>

        {/* Salariés — Collapsible */}
        <div className="bg-[#1e2436] rounded-xl border border-slate-800 shadow-xl overflow-hidden">
          <button onClick={() => setSalariedOpen(!salariedOpen)}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-800/20 transition-colors text-left">
            <div className="flex items-center gap-2">
              <TrendingUp size={20} className="text-emerald-400" />
              <span className="text-lg font-bold text-white">Commerciaux Salariés</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-emerald-400 font-bold">{salesSalariedCount} sal · {salesRules.salariedBase.toLocaleString('fr-FR')} DH/mo</span>
              {salariedOpen ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
            </div>
          </button>
          {salariedOpen && (
            <div className="border-t border-slate-800 p-6 pt-4 space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1 uppercase">Nombre Initial</label>
                <input type="number" min="0" value={salesSalariedCount} onChange={e => setSalesSalaried(Number(e.target.value))}
                  className="w-full bg-slate-800 rounded px-3 py-2 text-lg font-bold text-white border border-slate-700" />
                <p className="text-[10px] text-slate-500 mt-1">0 = pas de salarié au départ.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Salaire Base / Mois</label>
                  <input type="number" min="0" step="500" value={salesRules.salariedBase}
                    onChange={e => updateSalesRules('salariedBase', Number(e.target.value))}
                    className="w-full bg-slate-800 rounded px-2 py-1.5 text-red-300 border border-slate-700 font-bold" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Prime / Deal (DH)</label>
                  <input type="number" min="0" step="50" value={salesRules.salariedBonusPerDeal}
                    onChange={e => updateSalesRules('salariedBonusPerDeal', Number(e.target.value))}
                    className="w-full bg-slate-800 rounded px-2 py-1.5 text-emerald-300 border border-slate-700 font-bold" />
                </div>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                <div className="text-xs text-emerald-300 font-bold uppercase mb-2">Scaling Auto</div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-300">+1 salarié tous les</span>
                  <input type="number" min="0" step="10" value={salesScaling.everyNUsers}
                    onChange={e => updateSalesScaling('everyNUsers', Number(e.target.value))}
                    className="w-20 bg-slate-800 rounded px-2 py-1 text-emerald-300 font-bold border border-emerald-500/30 text-center" />
                  <span className="text-sm text-slate-300">clients</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">0 = pas de scaling auto</div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="bg-[#1e2436] rounded-xl border border-slate-800 p-6 shadow-xl">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs text-slate-500 mb-1 uppercase">Capacité / Rep / Mois (Deals Max)</label>
              <input type="number" min="1" value={salesCapacityPerRep} onChange={e => setSalesCapacity(Number(e.target.value))}
                className="w-full bg-slate-800 rounded px-3 py-2 text-white border border-slate-700 font-bold" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1 uppercase">Churn Mensuel (%)</label>
              <div className="flex items-center gap-3">
                <input type="range" min="0" max="10" step="0.5" value={churnRate}
                  onChange={e => setChurn(Number(e.target.value))} className="flex-1 accent-red-500" />
                <span className="text-red-400 font-bold w-12 text-right">{churnRate}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
