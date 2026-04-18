import { useEngineStore } from '../store/engineStore';
import type { MarketingChannel } from '../store/engineStore';
import { Megaphone, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export default function Marketing() {
  const { marketing, updateMarketing, toggleMarketingChannel } = useEngineStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const channels = marketing.channels;

  // Compute leads for a channel
  const getLeads = (ch: MarketingChannel) => {
    if (ch.frequency === 'yearly' && ch.eventsPerYear && ch.leadsPerEvent) {
      return Math.floor((ch.eventsPerYear * ch.leadsPerEvent) / 12);
    }
    if (ch.costPerLead > 0 && ch.budgetMonthly > 0) {
      return Math.floor(ch.budgetMonthly / ch.costPerLead);
    }
    return ch.leadsPerMonth;
  };

  const getBudget = (ch: MarketingChannel) => {
    if (ch.frequency === 'yearly' && ch.eventsPerYear && ch.costPerEvent) {
      return Math.round((ch.eventsPerYear * ch.costPerEvent) / 12);
    }
    return ch.budgetMonthly;
  };

  // Totals
  const activeChannels = channels.filter(c => c.enabled);
  const totalBudget = activeChannels.reduce((a, ch) => a + getBudget(ch), 0);
  const totalLeads = activeChannels.reduce((a, ch) => a + getLeads(ch), 0);
  const totalClients = activeChannels.reduce((a, ch) => a + Math.floor(getLeads(ch) * (ch.conversionPct / 100)), 0);
  const avgConversion = totalLeads > 0 ? (totalClients / totalLeads * 100) : 0;
  const effectiveCac = totalClients > 0 ? Math.round(totalBudget / totalClients) : 0;

  return (
    <div className="max-w-6xl mx-auto text-slate-200 pb-12">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <Megaphone className="text-violet-500" size={32} />
          Étape 6 — Marketing & Acquisition
        </h2>
        <p className="text-slate-400 mt-2 font-medium">Cochez pour activer un canal. Chaque canal a son budget, coût par lead et taux de conversion.</p>
      </div>

      {/* Channel Cards */}
      <div className="space-y-3">
        {channels.map(ch => {
          const leads = getLeads(ch);
          const clients = Math.floor(leads * (ch.conversionPct / 100));
          const budget = getBudget(ch);
          const isExpanded = expandedId === ch.id;
          const cac = clients > 0 ? Math.round(budget / clients) : 0;

          return (
            <div key={ch.id} className={`rounded-xl border shadow-xl overflow-hidden transition-all ${
              ch.enabled ? 'bg-[#1e2436] border-blue-500/30' : 'bg-[#1a1f2e] border-slate-800 opacity-50'
            }`}>
              {/* Header */}
              <div className="flex items-center gap-3 p-5">
                <input type="checkbox" checked={ch.enabled}
                  onChange={() => toggleMarketingChannel(ch.id)}
                  className="w-5 h-5 rounded accent-blue-500 shrink-0" />
                <button onClick={() => setExpandedId(isExpanded ? null : ch.id)}
                  className="flex-1 flex items-center justify-between hover:bg-slate-800/20 rounded-lg transition-colors text-left -m-1 p-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{ch.emoji}</span>
                    <div>
                      <div className="text-sm font-bold text-white">{ch.name}</div>
                      <div className="text-[10px] text-slate-500">{ch.note}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {ch.enabled && (
                      <div className="flex items-center gap-4 text-xs">
                        <div className="text-right">
                          <div className="text-slate-500">Budget</div>
                          <div className="font-bold text-white">{budget.toLocaleString('fr-FR')} DH</div>
                        </div>
                        <div className="text-right">
                          <div className="text-slate-500">Leads</div>
                          <div className="font-bold text-blue-400">{leads}/mo</div>
                        </div>
                        <div className="text-right">
                          <div className="text-slate-500">Conv.</div>
                          <div className="font-bold text-emerald-400">{ch.conversionPct}%</div>
                        </div>
                        <div className="text-right">
                          <div className="text-slate-500">Clients</div>
                          <div className="font-bold text-amber-400">{clients}/mo</div>
                        </div>
                        <div className="text-right">
                          <div className="text-slate-500">CAC</div>
                          <div className={`font-bold ${cac < 3000 ? 'text-emerald-400' : cac < 8000 ? 'text-amber-400' : 'text-red-400'}`}>{cac > 0 ? cac.toLocaleString('fr-FR') : '—'}</div>
                        </div>
                      </div>
                    )}
                    {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                  </div>
                </button>
              </div>

              {/* Expanded Details */}
              {isExpanded && ch.enabled && (
                <div className="border-t border-slate-800 p-5 pt-4">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Budget */}
                    {ch.frequency === 'yearly' ? (
                      <>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Événements / An</label>
                          <input type="number" min="0" value={ch.eventsPerYear || 0}
                            onChange={e => updateMarketing(ch.id, 'eventsPerYear', Number(e.target.value))}
                            className="w-full bg-slate-800 rounded px-3 py-2 text-sm border border-slate-700 text-white font-bold" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Coût / Événement (DH)</label>
                          <input type="number" min="0" step="500" value={ch.costPerEvent || 0}
                            onChange={e => updateMarketing(ch.id, 'costPerEvent', Number(e.target.value))}
                            className="w-full bg-slate-800 rounded px-3 py-2 text-sm border border-slate-700 text-red-300 font-bold" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Leads / Événement</label>
                          <input type="number" min="0" value={ch.leadsPerEvent || 0}
                            onChange={e => updateMarketing(ch.id, 'leadsPerEvent', Number(e.target.value))}
                            className="w-full bg-slate-800 rounded px-3 py-2 text-sm border border-slate-700 text-blue-300 font-bold" />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Budget / Mois (DH)</label>
                          <input type="number" min="0" step="100" value={ch.budgetMonthly}
                            onChange={e => updateMarketing(ch.id, 'budgetMonthly', Number(e.target.value))}
                            className="w-full bg-slate-800 rounded px-3 py-2 text-sm border border-slate-700 text-white font-bold" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Coût / Lead (DH)</label>
                          <input type="number" min="1" step="10" value={ch.costPerLead}
                            onChange={e => updateMarketing(ch.id, 'costPerLead', Number(e.target.value))}
                            className="w-full bg-slate-800 rounded px-3 py-2 text-sm border border-slate-700 text-red-300 font-bold" />
                        </div>
                      </>
                    )}
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Conversion (%)</label>
                      <div className="flex items-center gap-2">
                        <input type="range" min="0.5" max="40" step="0.5" value={ch.conversionPct}
                          onChange={e => updateMarketing(ch.id, 'conversionPct', Number(e.target.value))}
                          className="flex-1 accent-emerald-500" />
                        <span className="text-emerald-400 font-bold text-sm w-10 text-right">{ch.conversionPct}%</span>
                      </div>
                    </div>
                  </div>
                  {/* LinkedIn Premium */}
                  {ch.id === 'linkedin' && (
                    <div className="mt-3 flex items-center gap-3 bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                      <span className="text-xs text-blue-300 font-bold">LinkedIn Premium :</span>
                      <input type="number" min="0" step="50" value={ch.linkedinPremiumCost || 0}
                        onChange={e => updateMarketing(ch.id, 'linkedinPremiumCost', Number(e.target.value))}
                        className="w-28 bg-slate-800 rounded px-2 py-1 text-blue-300 font-bold border border-blue-500/30 text-sm" />
                      <span className="text-[10px] text-slate-500">DH/mois (inclus dans le budget)</span>
                    </div>
                  )}
                  {/* Partenariats — manual leads */}
                  {ch.id === 'partners' && (
                    <div className="mt-3">
                      <label className="block text-[10px] text-slate-500 mb-1">Leads Manuels / Mois</label>
                      <input type="number" min="0" value={ch.leadsPerMonth}
                        onChange={e => updateMarketing(ch.id, 'leadsPerMonth', Number(e.target.value))}
                        className="w-32 bg-slate-800 rounded px-3 py-2 text-sm border border-slate-700 text-blue-300 font-bold" />
                      <p className="text-[10px] text-slate-500 mt-1">Leads directs via partenariats (pas de coût par lead)</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 bg-gradient-to-r from-violet-900/30 to-blue-900/30 rounded-xl border border-violet-500/30 p-6 shadow-xl">
        <div className="grid grid-cols-5 gap-6 items-center">
          <div className="text-center">
            <div className="text-[10px] text-slate-500 uppercase font-bold">Canaux Actifs</div>
            <div className="text-3xl font-black text-white">{activeChannels.length}<span className="text-sm text-slate-500">/{channels.length}</span></div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-slate-500 uppercase font-bold">Budget Total / Mois</div>
            <div className="text-2xl font-black text-red-400">{totalBudget.toLocaleString('fr-FR')} <span className="text-sm">DH</span></div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-slate-500 uppercase font-bold">Total Leads / Mois</div>
            <div className="text-2xl font-black text-blue-400">{totalLeads}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-slate-500 uppercase font-bold">Clients / Mois</div>
            <div className="text-2xl font-black text-emerald-400">{totalClients}</div>
            <div className="text-[10px] text-slate-400">Conv. moy: {avgConversion.toFixed(1)}%</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-slate-500 uppercase font-bold">CAC Effectif</div>
            <div className={`text-2xl font-black ${effectiveCac < 3000 ? 'text-emerald-400' : effectiveCac < 8000 ? 'text-amber-400' : 'text-red-400'}`}>
              {effectiveCac > 0 ? effectiveCac.toLocaleString('fr-FR') : '—'} <span className="text-sm">DH</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
