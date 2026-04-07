import { useState } from 'react';
import { useEngineStore, computeRDTotal } from '../store/engineStore';
import type { RDCategory } from '../store/engineStore';
import { Route, PlusCircle, Trash2, Zap, Link, ChevronDown, ChevronRight } from 'lucide-react';

const catOptions: { value: RDCategory; label: string }[] = [
  { value: 'dev', label: 'Développeur' },
  { value: 'server', label: 'Serveur / Cloud' },
  { value: 'api', label: 'API Externe' },
  { value: 'hw_engineer', label: 'Ingénieur HW' },
  { value: 'material', label: 'Matériaux' },
  { value: 'test', label: 'Test / QA' },
  { value: 'certification', label: 'Certification' },
  { value: 'pilot', label: 'Pilote / Formation' },
  { value: 'other', label: 'Autre' },
];

export default function RoadmapRD() {
  const {
    roadmapItems, droneStrategy, droneCapExCost, droneThirdPartyMode, droneThirdPartyPrice, dronePassagesPerMonth, droneCampaignMonths, droneChargeMode, droneChargePrice,
    toggleRoadmapItem, updateRoadmapItemField,
    addRDItem, updateRDItem, removeRDItem, avgHectaresPerClient,
    setDroneStrategy, setDroneCapEx, setDroneThirdPartyMode, setDroneThirdPartyPrice, setDronePassagesPerMonth, setDroneCampaignMonths, setDroneChargeMode, setDroneChargePrice
  } = useEngineStore();

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setExpandedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const totalRD = roadmapItems.filter(i => i.checked).reduce((a, i) => a + computeRDTotal(i.rdItems), 0);

  const renderCard = (item: typeof roadmapItems[0]) => {
    const total = computeRDTotal(item.rdItems);
    const depItem = item.dependsOn ? roadmapItems.find(i => i.id === item.dependsOn) : null;
    const isExpanded = expandedIds.has(item.id);

    return (
      <div key={item.id} className={`bg-[#1e2436] rounded-xl border shadow-xl overflow-hidden transition-all ${item.checked ? 'border-blue-500/30' : 'border-slate-800 opacity-50'}`}>
        {/* Header — always visible */}
        <div className="flex items-center gap-3 p-5 cursor-pointer hover:bg-slate-800/20 transition-colors" onClick={() => toggle(item.id)}>
          <input type="checkbox" checked={item.checked} onChange={(e) => { e.stopPropagation(); toggleRoadmapItem(item.id); }} className="w-5 h-5 rounded accent-blue-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${item.type === 'hardware' ? 'bg-orange-500/20 text-orange-400' : item.type === 'bundle' ? 'bg-purple-500/20 text-purple-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                {item.type === 'hardware' ? 'Hardware' : item.type === 'bundle' ? 'Bundle' : 'Software'}
              </span>
              {depItem && (
                <span className="text-[9px] text-slate-500 flex items-center gap-1"><Link size={10} /> Dépend: {depItem.name}</span>
              )}
            </div>
            <h3 className="text-lg font-black text-white mt-0.5">{item.name}</h3>
            <p className="text-xs text-slate-500 truncate">{item.desc}</p>
          </div>
          <div className="text-right shrink-0 flex items-center gap-3">
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold">R&D</div>
              <div className={`text-lg font-black ${total > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {total > 0 ? total.toLocaleString('fr-FR') + ' DH' : 'Gratuit'}
              </div>
            </div>
            {isExpanded ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
          </div>
        </div>

        {/* Expanded body */}
        {item.checked && isExpanded && (
          <div className="border-t border-slate-800 p-5 pt-4">
            {/* Delivery & Adoption (NEW) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1 uppercase font-bold">Délai de Prod. (Mois)</label>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" value={item.deliveryMonths}
                    onChange={e => updateRoadmapItemField(item.id, 'deliveryMonths', Number(e.target.value))}
                    className="w-full bg-slate-800 rounded px-2 py-1.5 text-sm text-amber-300 border border-slate-700 font-bold" />
                </div>
                <div className="text-[9px] text-slate-500 mt-1">Délai avant lancement officiel</div>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1 uppercase font-bold">Taux d'Adoption (%)</label>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" max="100" value={item.adoptionPct}
                    onChange={e => updateRoadmapItemField(item.id, 'adoptionPct', Number(e.target.value))}
                    className="w-full bg-slate-800 rounded px-2 py-1.5 text-sm text-blue-300 border border-slate-700 font-bold" />
                </div>
                <div className="text-[9px] text-slate-500 mt-1">% d'adoption base existante</div>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1 uppercase font-bold">Nvx Clients (Pack)/Mo</label>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" value={item.newClientsPerMonth}
                    onChange={e => updateRoadmapItemField(item.id, 'newClientsPerMonth', Number(e.target.value))}
                    className="w-full bg-slate-800 rounded px-2 py-1.5 text-sm text-emerald-300 border border-slate-700 font-bold" />
                </div>
                <div className="text-[9px] text-slate-500 mt-1">Nvx clients (ERP + Module)</div>
              </div>

              {(item.newModuleOnlyClientsPerMonth !== undefined) && (
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 uppercase font-bold">Nvx Clients (Seul)/Mo</label>
                  <div className="flex items-center gap-2">
                    <input type="number" min="0" value={item.newModuleOnlyClientsPerMonth}
                      onChange={e => updateRoadmapItemField(item.id, 'newModuleOnlyClientsPerMonth', Number(e.target.value))}
                      className="w-full bg-slate-800 rounded px-2 py-1.5 text-sm text-indigo-300 border border-slate-700 font-bold" />
                  </div>
                  <div className="text-[9px] text-slate-500 mt-1">Nvx clients (Module seulement)</div>
                </div>
              )}
            </div>

            {/* Revenue impact */}
            {!item.isParserOnly && (
              <div className={`grid grid-cols-1 gap-3 mb-4 p-4 rounded-xl border ${item.mrrPrice > 0 || item.upfrontPrice > 0 || (item.sensors && item.sensors.length > 0) ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900/50 border-slate-700/50'}`}>
                <div className="mb-2 flex flex-col">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase font-black text-white/50">Classification Financière :</span>
                    {(() => {
                      // Margin calculation logic
                      const avgHectares = avgHectaresPerClient || 100;

                      const calcAnnualRevPerClient = (it: any) => {
                        if (it.id === 'rm-drone') {
                          return droneChargePrice * dronePassagesPerMonth * droneCampaignMonths * (droneChargeMode === 'per_ha' ? avgHectares : 1);
                        }
                        let r = it.mrrPrice * 12;
                        if (it.mrrBasis === 'per_ha') r *= avgHectares;
                        if (it.mrrBasis === 'per_unit' || it.mrrBasis === 'per_head' || it.mrrBasis === 'per_greenhouse') r *= it.avgUnitsPerClient;
                        return r;
                      };

                      const calcCogsPerClient = (it: any) => {
                        if (it.id === 'rm-drone' && droneStrategy === 'third_party') {
                          return droneThirdPartyPrice * dronePassagesPerMonth * droneCampaignMonths * (droneThirdPartyMode === 'per_ha' ? avgHectares : 1);
                        }
                        let c = it.cogsPrice;
                        if (it.cogsBasis === 'per_ha') c *= avgHectares;
                        if (it.cogsBasis === 'per_unit' || it.cogsBasis === 'per_head' || it.cogsBasis === 'per_greenhouse') c *= it.avgUnitsPerClient;
                        return c;
                      };

                      const rev = calcAnnualRevPerClient(item);
                      const cogs = calcCogsPerClient(item);
                      const marginPct = rev > 0 ? ((rev - cogs) / rev) * 100 : 0;
                      const marginPerHa = (rev - cogs) / avgHectares;

                      if (item.mrrPrice > 0 || rev > 0) {
                        if (item.cogsPrice > 0 || cogs > 0) {
                          return (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-400/20">
                              💰 Centre de Profit avec COGS variable (Marge brute estimée : {marginPct.toFixed(0)}% — {Math.round(marginPerHa).toLocaleString('fr-FR')} DH/ha)
                            </span>
                          );
                        }
                        return (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-400/20">
                            💰 Centre de Profit
                          </span>
                        );
                      }
                      if (item.upfrontPrice > 0 || (item.sensors && item.sensors.length > 0)) {
                        return (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-400/20">
                            📦 Centre de Revenu Upfront (Hardware)
                          </span>
                        );
                      }
                      return (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-300 border border-slate-600">
                          ⚙️ Centre de Coût
                        </span>
                      );
                    })()}
                  </div>
                  {item.mrrPrice === 0 && item.upfrontPrice === 0 && !item.sensors && (
                    <p className="text-[10px] text-slate-500 mt-1 italic">Ce module améliore l'offre, mais n'ajoute pas de tarif explicite sur la facture finale.</p>
                  )}
                </div>

                {/* Sub-components conditionally toggled */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  {/* MRR Block */}
                  {item.mrrBasis && (
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                      <h5 className="text-[10px] uppercase font-black text-emerald-400 mb-2">Revenu Récurrent {item.id === 'rm-drone' ? '(Campagne Annuelle)' : '(MRR)'}</h5>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-[9px] text-slate-500 mb-1">Prix {item.id === 'rm-drone' ? '(Total / Client / An)' : '(DH/mois)'}</label>
                          {item.id === 'rm-drone' ? (
                            <div className="w-full bg-slate-900 rounded px-2 py-1.5 text-sm text-emerald-300 border border-slate-700 font-bold opacity-70 cursor-not-allowed">
                              {Math.round(droneChargePrice * dronePassagesPerMonth * droneCampaignMonths * (droneChargeMode === 'per_ha' ? (avgHectaresPerClient || 100) : 1)).toLocaleString('fr-FR')} DH
                            </div>
                          ) : (
                            <input type="number" min="0" value={item.mrrPrice} onChange={e => updateRoadmapItemField(item.id, 'mrrPrice', Number(e.target.value))} className="w-full bg-slate-900 rounded px-2 py-1 text-sm text-emerald-300 border border-slate-700 font-bold" />
                          )}
                        </div>
                        <div className="flex-1">
                          <label className="block text-[9px] text-slate-500 mb-1">Base</label>
                          <select value={item.id === 'rm-drone' ? 'per_client' : item.mrrBasis} disabled={item.id === 'rm-drone'} onChange={e => updateRoadmapItemField(item.id, 'mrrBasis', e.target.value as any)} className={`w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 ${item.id === 'rm-drone' ? 'opacity-70 cursor-not-allowed' : ''}`}>
                            <option value="per_client">Forfait/Client</option>
                            <option value="per_ha">Par Hectare</option>
                            <option value="per_unit">Par Unité</option>
                            <option value="per_head">Par Tête (Bétail)</option>
                            <option value="per_greenhouse">Par Serre</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Upfront Block (Only if NO complex sensors list) */}
                  {!item.sensors && (
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                      <h5 className="text-[10px] uppercase font-black text-blue-400 mb-2">Vente Matériel (Upfront)</h5>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-[9px] text-slate-500 mb-1">Prix Vente (DH)</label>
                          <input type="number" min="0" value={item.upfrontPrice} onChange={e => updateRoadmapItemField(item.id, 'upfrontPrice', Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-blue-300 font-bold" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[9px] text-slate-500 mb-1">Base</label>
                          <select value={item.upfrontBasis} onChange={e => updateRoadmapItemField(item.id, 'upfrontBasis', e.target.value as any)} className="w-full bg-slate-900 rounded border border-slate-700 px-2 py-1.5 text-xs text-slate-300">
                            <option value="per_client">Forfait/Client</option>
                            <option value="per_ha">Par Hectare</option>
                            <option value="per_unit">Par Unité</option>
                            <option value="per_head">Par Tête (Bétail)</option>
                            <option value="per_greenhouse">Par Serre</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* COGS Block (Only if NO complex sensors list) */}
                  {!item.sensors && (
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                      <h5 className="text-[10px] uppercase font-black text-red-400 mb-2">Coût d'Achat Matériel (COGS)</h5>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-[9px] text-slate-500 mb-1">Coût Achat (DH)</label>
                          <input type="number" min="0" value={item.cogsPrice} onChange={e => updateRoadmapItemField(item.id, 'cogsPrice', Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-red-300 font-bold" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[9px] text-slate-500 mb-1">Base</label>
                          <select value={item.cogsBasis} onChange={e => updateRoadmapItemField(item.id, 'cogsBasis', e.target.value as any)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300">
                            <option value="per_client">Par Client</option>
                            <option value="per_ha">Par Hectare</option>
                            <option value="per_unit">Par Unité</option>
                            <option value="per_head">Par Tête</option>
                            <option value="per_greenhouse">Par Serre</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* M2M 4G Charge */}
                  {item.m2mMonthlyPrice !== undefined && (
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                      <h5 className="text-[10px] uppercase font-black text-purple-400 mb-2">Carte SIM M2M 4G (Abo Mensuel)</h5>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-[9px] text-slate-500 mb-1">Refacturation Client (DH/Mois)</label>
                          <input type="number" min="0" value={item.m2mMonthlyPrice} onChange={e => updateRoadmapItemField(item.id, 'm2mMonthlyPrice', Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-purple-300 font-bold" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {(item.mrrBasis?.includes('per_') && item.mrrBasis !== 'per_client' && item.mrrBasis !== 'per_ha') && (
                  <div className="mt-2 bg-indigo-500/10 border border-indigo-500/30 p-3 rounded-lg flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-black text-indigo-300 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-400"></div> Nb moyen par Client</h5>
                      <p className="text-[10px] text-indigo-400/70">Combien d'unités (têtes, serres, etc.) ce client possède-t-il en moyenne ?</p>
                    </div>
                    <input type="number" min="1" value={item.avgUnitsPerClient} onChange={e => updateRoadmapItemField(item.id, 'avgUnitsPerClient', Number(e.target.value))} className="w-20 bg-slate-900 rounded px-2 py-2 text-indigo-300 font-bold text-center border border-indigo-500/50" />
                  </div>
                )}

                {/* Advanced Sensors List Toggle */}
                {item.sensors && (
                  <div className="mt-4 border border-slate-700/50 rounded-xl overflow-hidden bg-slate-900/50">
                    <div className="bg-slate-800/80 px-4 py-2 flex items-center justify-between border-b border-slate-700/50">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Catalogue de Capteurs (Renouvellement Auto 5 Ans)</h4>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {item.sensors.map((sensor, sIdx) => (
                        <div key={sensor.id} className={`flex items-start gap-3 p-3 rounded-lg border ${sensor.checked ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-800 bg-slate-800/30 opacity-60'}`}>
                          <input type="checkbox" checked={sensor.checked}
                            onChange={(e) => {
                              const newSensors = [...item.sensors!];
                              newSensors[sIdx].checked = e.target.checked;
                              updateRoadmapItemField(item.id, 'sensors', newSensors);
                            }}
                            className="w-4 h-4 rounded accent-blue-500 mt-0.5" />
                          <div className="flex-1">
                            <div className="font-bold text-sm text-white mb-2">{sensor.name}</div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] text-slate-500">Coût Achat (DH)</label>
                                <input type="number" value={sensor.costPrice} disabled={!sensor.checked}
                                  onChange={e => {
                                    const newSensors = [...item.sensors!];
                                    newSensors[sIdx].costPrice = Number(e.target.value);
                                    updateRoadmapItemField(item.id, 'sensors', newSensors);
                                  }}
                                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-red-300 font-bold" />
                              </div>
                              <div>
                                <label className="text-[9px] text-slate-500">Prix Vente (DH)</label>
                                <input type="number" value={sensor.sellPrice} disabled={!sensor.checked}
                                  onChange={e => {
                                    const newSensors = [...item.sensors!];
                                    newSensors[sIdx].sellPrice = Number(e.target.value);
                                    updateRoadmapItemField(item.id, 'sensors', newSensors);
                                  }}
                                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-blue-300 font-bold" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Parser Only Banner */}
            {item.isParserOnly && (
              <div className="mb-4 bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center justify-center text-center">
                <div>
                  <h4 className="text-sm font-bold text-amber-500 mb-1">⚙️ Composant Backend</h4>
                  <p className="text-xs text-slate-400">Ce module représente un investissement R&D purement technologique et structurant. Il ne génère aucune facturation directe ni récurrence tarifaire auprès du client final.</p>
                </div>
              </div>
            )}

            {/* R&D Table */}
            {item.rdItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-900/50">
                      <th className="p-2">Cat.</th>
                      <th className="p-2">Ressource</th>
                      <th className="p-2 text-right">Qté</th>
                      <th className="p-2 text-right">Mois</th>
                      <th className="p-2 text-right">Taux/Mo</th>
                      <th className="p-2 text-right">Total</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {item.rdItems.map(rd => (
                      <tr key={rd.id} className="hover:bg-slate-800/30">
                        <td className="p-2">
                          <select value={rd.category} onChange={e => updateRDItem(item.id, rd.id, 'category', e.target.value)}
                            className="bg-slate-800 text-xs text-slate-300 rounded px-1 py-1 border border-slate-700">
                            {catOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </td>
                        <td className="p-2">
                          <input type="text" value={rd.name} onChange={e => updateRDItem(item.id, rd.id, 'name', e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-slate-200 text-sm" />
                        </td>
                        <td className="p-2 text-right">
                          <input type="number" min="1" value={rd.qty} onChange={e => updateRDItem(item.id, rd.id, 'qty', Number(e.target.value))}
                            className="w-14 bg-slate-900/50 border border-slate-700 rounded px-1 py-1 text-right text-slate-200 text-sm" />
                        </td>
                        <td className="p-2 text-right">
                          <input type="number" min="1" value={rd.timeMonths} onChange={e => updateRDItem(item.id, rd.id, 'timeMonths', Number(e.target.value))}
                            className="w-14 bg-slate-900/50 border border-slate-700 rounded px-1 py-1 text-right text-purple-300 text-sm" />
                        </td>
                        <td className="p-2 text-right">
                          <input type="number" min="0" step="1000" value={rd.monthlyRate} onChange={e => updateRDItem(item.id, rd.id, 'monthlyRate', Number(e.target.value))}
                            className="w-20 bg-slate-900/50 border border-slate-700 rounded px-1 py-1 text-right text-emerald-300 font-bold text-sm" />
                        </td>
                        <td className="p-2 text-right font-bold text-slate-300 whitespace-nowrap">
                          {(rd.qty * rd.timeMonths * rd.monthlyRate).toLocaleString('fr-FR')} DH
                        </td>
                        <td className="p-2">
                          <button onClick={() => removeRDItem(item.id, rd.id)} className="text-slate-600 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-3 text-slate-500 text-xs italic">Aucun coût R&D — débloqué quand la trésorerie le permet.</div>
            )}

            <div className="mt-3 flex justify-end">
              <button onClick={() => addRDItem(item.id, { name: 'Nouvelle ressource', category: 'dev', qty: 1, timeMonths: 2, monthlyRate: 10000 })}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center gap-2 text-xs font-bold border border-slate-700 transition">
                <PlusCircle size={14} /> Ajouter ligne R&D
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto text-slate-200 pb-12">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Route className="text-amber-500" size={32} />
            Étape 2 — Roadmap R&D & Unlock
          </h2>
          <p className="text-slate-400 mt-2 font-medium">Chaque module est débloqué automatiquement quand la trésorerie ≥ son coût R&D.</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-5 py-3 text-right">
          <div className="text-[10px] text-amber-300 uppercase font-bold">Budget R&D Total</div>
          <div className="text-2xl font-black text-amber-400">{totalRD.toLocaleString('fr-FR')} <span className="text-sm">DH</span></div>
        </div>
      </div>

      {/* Drone Strategy */}
      <div className="bg-[#1e2436] rounded-xl border border-slate-800 p-5 shadow-xl mb-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Zap size={18} className="text-blue-400" /> Stratégie Drone</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <button onClick={() => setDroneStrategy('third_party')}
            className={`p-4 rounded-xl border text-left transition-all ${droneStrategy === 'third_party' ? 'bg-indigo-500/10 border-indigo-500 text-indigo-300' : 'bg-slate-900/50 border-slate-800 text-slate-400'}`}>
            <div className="font-bold">Prestation Externe</div>
            <div className="text-xs opacity-70 mt-1">Facturation par passage externe. Pas de CapEx.</div>
          </button>
          <button onClick={() => setDroneStrategy('proprietary')}
            className={`p-4 rounded-xl border text-left transition-all ${droneStrategy === 'proprietary' ? 'bg-amber-500/10 border-amber-500 text-amber-300' : 'bg-slate-900/50 border-slate-800 text-slate-400'}`}>
            <div className="font-bold">Propriétaire (Achat Drone)</div>
            <div className="text-xs opacity-70 mt-1">CapEx lourd + formation/certification pilote.</div>
          </button>
        </div>
        {droneStrategy === 'proprietary' && (
          <div className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 mb-4">
            <span className="text-xs text-amber-300 font-bold uppercase">CapEx Drone (Achat) :</span>
            <input type="number" step="10000" value={droneCapExCost} onChange={e => setDroneCapEx(Number(e.target.value))}
              className="w-32 bg-slate-800 rounded px-2 py-1 text-amber-300 font-bold border border-amber-500/30 text-sm" />
            <span className="text-xs text-slate-500">DH</span>
          </div>
        )}

        {droneStrategy === 'third_party' && (
          <div className="flex items-center gap-4 bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-indigo-300 font-bold uppercase">Facturation :</span>
              <select value={droneThirdPartyMode} onChange={e => setDroneThirdPartyMode(e.target.value as 'per_ha' | 'per_day')}
                className="bg-slate-800 text-sm text-indigo-300 font-bold rounded px-2 py-1 border border-slate-700">
                <option value="per_ha">Par Hectare</option>
                <option value="per_day">Par Jour</option>
              </select>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-400">Tarif :</span>
              <input type="number" step="10" value={droneThirdPartyPrice} onChange={e => setDroneThirdPartyPrice(Number(e.target.value))}
                className="w-24 bg-slate-800 rounded px-2 py-1 text-indigo-300 font-bold border border-indigo-500/30 text-sm text-right" />
              <span className="text-xs text-slate-500">DH / {droneThirdPartyMode === 'per_ha' ? 'ha' : 'jour'}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Campagne Culturelle (Mois/an) :</span>
            <input type="number" min="1" max="12" value={droneCampaignMonths} onChange={e => setDroneCampaignMonths(Number(e.target.value))}
              className="w-16 bg-slate-800 rounded px-2 py-1 text-white font-bold border border-slate-700 text-sm text-right" />
          </div>
          <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Passages / Mois (pendant camp.) :</span>
            <input type="number" min="1" value={dronePassagesPerMonth} onChange={e => setDronePassagesPerMonth(Number(e.target.value))}
              className="w-16 bg-slate-800 rounded px-2 py-1 text-white font-bold border border-slate-700 text-sm text-right" />
          </div>
        </div>

        {/* Facturation Client Drone */}
        <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-lg p-4">
          <h4 className="text-xs font-black text-emerald-400 uppercase mb-3 flex items-center gap-2">💰 Facturation Client (Pendant Campagne)</h4>
          <p className="text-[10px] text-slate-400 mb-3">Ce que vous facturez au client final pour le service drone. Ce revenu est retardé par le Délai de Prod. (de la carte Imagerie ci-dessous).</p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-white font-bold">Base de Facturation :</span>
              <select value={droneChargeMode} onChange={e => setDroneChargeMode(e.target.value as 'per_ha' | 'flat')}
                className="bg-slate-800 text-sm text-white font-bold rounded px-2 py-1.5 border border-slate-700">
                <option value="per_ha">Par Hectare couvert</option>
                <option value="flat">Forfait Mensuel Fixe</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white font-bold">Prix Vente :</span>
              <div className="relative">
                <input type="number" step="10" value={droneChargePrice} onChange={e => setDroneChargePrice(Number(e.target.value))}
                  className="w-32 bg-slate-800 rounded px-2 py-1.5 text-emerald-400 font-black border border-emerald-500/50 text-sm pl-8" />
                <span className="absolute left-3 top-1.5 text-emerald-500/50 font-bold text-sm">DH</span>
              </div>
              <span className="text-xs text-slate-500">/ mois de campagne {droneChargeMode === 'per_ha' ? '/ hectare' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* All Roadmap Items — Collapsible */}
      <div className="space-y-4">
        {roadmapItems.map(item => renderCard(item))}
      </div>
    </div>
  );
}
