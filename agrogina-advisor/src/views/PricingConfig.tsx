import { useState } from 'react';
import { useEngineStore, computeHaTotalPrice, computeHaTotalPriceStatic, computeAvgHaPrice, computeAvgHaPriceStatic, computeErpMonthly } from '../store/engineStore';
import { Coins, Package, Zap, ChevronDown, ChevronRight, Sprout, User } from 'lucide-react';
export default function PricingConfig() {
  const {
    erpModules, erpSizeMultiplier, haPriceTiers, haPricingMode, discountPct, avgHectaresPerClient,
    toggleErpModule, updateErpModulePrice, setErpSizeMultiplier, updateHaTier, updateHaTierValue, setDiscount, setAvgHectares, setHaPricingMode,
  } = useEngineStore();

  const [baseOpen, setBaseOpen] = useState(false);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [agroOpen, setAgroOpen] = useState(false);
  const [valeurOpen, setValeurOpen] = useState(false);
  const [benchmarkOpen, setBenchmarkOpen] = useState(false);

  // Dispatch based on mode
  const haTotal = (ha: number) => haPricingMode === 'static'
    ? computeHaTotalPriceStatic(ha, haPriceTiers)
    : computeHaTotalPrice(ha, haPriceTiers);
  const haAvg = (ha: number) => haPricingMode === 'static'
    ? computeAvgHaPriceStatic(ha, haPriceTiers)
    : computeAvgHaPrice(ha, haPriceTiers);

  const erpMonthly = computeErpMonthly(erpModules, erpSizeMultiplier);
  const agroTotal = haTotal(avgHectaresPerClient);
  const avgPerHa = haAvg(avgHectaresPerClient);
  const grossMrr = erpMonthly + agroTotal / 12;
  const netMrr = grossMrr * (1 - discountPct / 100);
  const annualCash = netMrr * 12;

  const baseModules = erpModules.filter(m => m.isBase);
  const upsellModules = erpModules.filter(m => !m.isBase);
  const baseTotal = baseModules.filter(m => m.checked).reduce((a, m) => a + (m.pricePerMonth * erpSizeMultiplier), 0);
  const upsellTotal = upsellModules.filter(m => m.checked).reduce((a, m) => a + (m.pricePerMonth * erpSizeMultiplier), 0);

  /** Compute per-tier breakdown for progressive mode */
  const tierBreakdownProgressive = (hectares: number) => {
    const sorted = [...haPriceTiers].sort((a, b) => (a.maxHa || 999999) - (b.maxHa || 999999));
    let remaining = hectares;
    let prevMax = 0;
    const result: { label: string; ha: number; price: number; subtotal: number }[] = [];
    for (const tier of sorted) {
      const currentMax = tier.maxHa || 999999;
      const tierWidth = currentMax >= 999999 ? remaining : currentMax - prevMax;
      const haInTier = Math.min(remaining, tierWidth);
      if (haInTier <= 0) break;
      result.push({ label: tier.label, ha: haInTier, price: tier.pricePerHa, subtotal: haInTier * tier.pricePerHa });
      remaining -= haInTier;
      prevMax = currentMax >= 999999 ? prevMax : currentMax;
    }
    return result;
  };

  /** Compute breakdown for static mode (single tier) */
  const tierBreakdownStatic = (hectares: number) => {
    const sorted = [...haPriceTiers].sort((a, b) => (a.maxHa || 999999) - (b.maxHa || 999999));
    for (const tier of sorted) {
      const currentMax = tier.maxHa || 999999;
      if (hectares <= currentMax || currentMax >= 999999) {
        return [{ label: tier.label, ha: hectares, price: tier.pricePerHa, subtotal: hectares * tier.pricePerHa }];
      }
    }
    const last = sorted[sorted.length - 1];
    return [{ label: last.label, ha: hectares, price: last.pricePerHa, subtotal: hectares * last.pricePerHa }];
  };

  const tierBreakdown = haPricingMode === 'static' ? tierBreakdownStatic : tierBreakdownProgressive;

  return (
    <div className="max-w-6xl mx-auto text-slate-200 pb-12">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <Coins className="text-emerald-500" size={32} />
          Étape 1 — Configuration du Pricing
        </h2>
        <p className="text-slate-400 mt-2 font-medium">Pricing modulaire : Pack de base + Modules upsell + Tarif dégressif AgromindIA.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">

          {/* Global Organization Size Selector */}
          <div className="flex items-center gap-3 p-4 bg-slate-900/50 rounded-xl border border-slate-800 shadow-xl">
            <span className="text-sm text-slate-400 font-medium shrink-0">Taille de l'organisation :</span>
            <div className="flex gap-2 flex-1">
              {([
                { mult: 1, label: 'Standard (1-10)' },
                { mult: 2.5, label: 'Moyenne (11-50)' },
                { mult: 5, label: 'Grande (50-200)' },
              ]).map(m => (
                <button key={m.mult} onClick={() => setErpSizeMultiplier(m.mult)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all ${erpSizeMultiplier === m.mult
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:bg-slate-800'
                    }`}>
                  {m.label} <span className="text-[10px] font-normal opacity-70">(x{m.mult} Prix ERP)</span>
                </button>
              ))}
            </div>
          </div>

          {/* BASE — Collapsible */}
          <div className="bg-[#1e2436] rounded-xl border border-slate-800 shadow-xl overflow-hidden">
            <button onClick={() => setBaseOpen(!baseOpen)}
              className="w-full flex items-center justify-between p-6 hover:bg-slate-800/20 transition-colors text-left">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-emerald-400" />
                <span className="text-lg font-bold text-white">Pack de Base</span>
                <span className="text-xs text-slate-500 ml-2">{baseModules.length} modules</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-emerald-400 font-bold text-lg">{baseTotal} DH/mo</span>
                {baseOpen ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
              </div>
            </button>
            {baseOpen && (
              <div className="px-6 pb-6 space-y-2 border-t border-slate-800 pt-4">
                {baseModules.map(mod => (
                  <div key={mod.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all cursor-pointer ${mod.checked ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-900/20 border-slate-800 opacity-60'
                    }`}>
                    <input type="checkbox" checked={mod.checked} onChange={() => toggleErpModule(mod.id)}
                      className="accent-emerald-500 w-4 h-4 shrink-0" />
                    <div className="flex-1" onClick={() => toggleErpModule(mod.id)}>
                      <div className="text-sm font-bold text-white">{mod.name}</div>
                      <div className="text-[10px] text-slate-500">{mod.desc}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2 text-right">
                        <input type="number" min="0" step="10" value={mod.pricePerMonth}
                          onChange={e => updateErpModulePrice(mod.id, Number(e.target.value))}
                          className="w-16 bg-slate-900/50 border border-slate-700 rounded px-1.5 py-1 text-emerald-500 font-bold text-xs" />
                        <span className="text-[10px] text-slate-500 w-6">x{erpSizeMultiplier}</span>
                      </div>
                      <div className="text-sm font-black text-emerald-300">
                        = {mod.pricePerMonth * erpSizeMultiplier} <span className="text-[9px] font-normal text-slate-500">DH/mo</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* UPSELL — Collapsible */}
          <div className="bg-[#1e2436] rounded-xl border border-slate-800 shadow-xl overflow-hidden">
            <button onClick={() => setUpsellOpen(!upsellOpen)}
              className="w-full flex items-center justify-between p-6 hover:bg-slate-800/20 transition-colors text-left">
              <div className="flex items-center gap-2">
                <Zap size={18} className="text-amber-400" />
                <span className="text-lg font-bold text-white">Modules Upsell</span>
                <span className="text-xs text-slate-500 ml-2">{upsellModules.filter(m => m.checked).length}/{upsellModules.length} actifs</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-blue-400 font-bold text-lg">{upsellTotal} DH/mo</span>
                {upsellOpen ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
              </div>
            </button>
            {upsellOpen && (
              <div className="px-6 pb-6 space-y-2 border-t border-slate-800 pt-4">
                {upsellModules.map(mod => (
                  <div key={mod.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all cursor-pointer ${mod.checked ? 'bg-blue-500/5 border-blue-500/20' : 'bg-slate-900/20 border-slate-800 opacity-60'
                    }`}>
                    <input type="checkbox" checked={mod.checked} onChange={() => toggleErpModule(mod.id)}
                      className="accent-blue-500 w-4 h-4 shrink-0" />
                    <div className="flex-1" onClick={() => toggleErpModule(mod.id)}>
                      <div className="text-sm font-bold text-white">{mod.name}</div>
                      <div className="text-[10px] text-slate-500">{mod.desc}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2 text-right">
                        <input type="number" min="0" step="10" value={mod.pricePerMonth}
                          onChange={e => updateErpModulePrice(mod.id, Number(e.target.value))}
                          className="w-16 bg-slate-900/50 border border-slate-700 rounded px-1.5 py-1 text-blue-500 font-bold text-xs" />
                        <span className="text-[10px] text-slate-500 w-6">x{erpSizeMultiplier}</span>
                      </div>
                      <div className="text-sm font-black text-blue-300">
                        = {mod.pricePerMonth * erpSizeMultiplier} <span className="text-[9px] font-normal text-slate-500">DH/mo</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AgromindIA TIERS — Collapsible */}
          <div className="bg-[#1e2436] rounded-xl border border-slate-800 shadow-xl overflow-hidden">
            <button onClick={() => setAgroOpen(!agroOpen)}
              className="w-full flex items-center justify-between p-6 hover:bg-slate-800/20 transition-colors text-left">
              <div className="flex items-center gap-2">
                <Sprout size={18} className="text-purple-400" />
                <span className="text-lg font-bold text-white">Tarif AgromindIA par Hectare (Dégressif Annuel)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-purple-400 font-bold">{Math.round(agroTotal).toLocaleString('fr-FR')} DH/an ({avgHectaresPerClient} ha)</span>
                {agroOpen ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
              </div>
            </button>
            {agroOpen && (
              <div className="px-6 pb-6 border-t border-slate-800 pt-4">
                <div className="space-y-6">
                  {/* MODE TOGGLE */}
                  <div className="flex items-center gap-3 mb-4 p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 font-medium shrink-0">Mode :</span>
                    <div className="flex gap-2 flex-1">
                      {([
                        { key: 'progressive' as const, label: '📊 Progressif', desc: 'Chaque tranche facture ses ha' },
                        { key: 'static' as const, label: '📌 Statique', desc: 'Toute la ferme au prix de sa tranche' },
                      ]).map(m => (
                        <button key={m.key} onClick={() => setHaPricingMode(m.key)}
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all text-left ${haPricingMode === m.key
                            ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                            : 'bg-slate-900/50 border-slate-700 text-slate-500'
                            }`}>
                          <div>{m.label}</div>
                          <div className="text-[9px] font-normal mt-0.5 opacity-70">{m.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 -mt-2">
                    {haPricingMode === 'progressive'
                      ? '⚡ Progressif : les 5 premiers ha au tarif < 5ha, les 15 suivants au tarif 5-20ha, etc.'
                      : '📌 Statique : une ferme de 20ha tombe dans la tranche 5-20ha, TOUS les 20ha sont au tarif de cette tranche.'}
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                          <th className="pb-2 text-left">Tranche</th>
                          <th className="pb-2 text-right">Hectares</th>
                          <th className="pb-2 text-right">DH/ha/an</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {haPriceTiers.map((tier, i) => {
                          const prevMax = i === 0 ? 0 : (haPriceTiers[i - 1].maxHa || 999999);
                          const currentMax = tier.maxHa || 999999;
                          const tierWidth = currentMax >= 999999 ? '∞' : (currentMax - prevMax);
                          return (
                            <tr key={i} className="hover:bg-slate-800/20">
                              <td className="py-2.5 font-semibold text-slate-300">{tier.label}</td>
                              <td className="py-2.5 text-right text-xs text-slate-500">{typeof tierWidth === 'number' ? `${tierWidth} ha` : tierWidth}</td>
                              <td className="py-2.5 text-right">
                                <input type="number" min="0" step="10" value={tier.pricePerHa}
                                  onChange={e => updateHaTier(i, Number(e.target.value))}
                                  className="w-24 bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-right text-blue-300 font-bold text-sm" />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Breakdown of Current Client Size stays here for visibility */}
                  <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                    <div className="text-xs text-purple-300 font-bold uppercase mb-2">
                      Décomposition (Client {avgHectaresPerClient} ha)
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[9px] uppercase text-slate-500 border-b border-slate-800">
                          <th className="pb-1 text-left">Tranche</th>
                          <th className="pb-1 text-right">Ha facturés</th>
                          <th className="pb-1 text-right">Sous-total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/30">
                        {tierBreakdown(avgHectaresPerClient).map((t, i) => (
                          <tr key={i}>
                            <td className="py-1 text-slate-400 truncate max-w-[80px]" title={t.label}>{t.label}</td>
                            <td className="py-1 text-right text-slate-300 font-bold">{t.ha}</td>
                            <td className="py-1 text-right text-white font-bold">{t.subtotal.toLocaleString('fr-FR')} DH</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            {/* Ancrage Valeur Client — Collapsible */}
            <div className="bg-[#1e2436] rounded-xl border border-slate-800 shadow-xl overflow-hidden">
              <button onClick={() => setValeurOpen(!valeurOpen)}
                className="w-full flex items-center justify-between p-6 hover:bg-slate-800/20 transition-colors text-left">
                <div className="flex items-center gap-2">
                  <User size={18} className="text-indigo-400" />
                  <span className="text-lg font-bold text-white">Ancrage Valeur Client (Optionnel)</span>
                </div>
                <div className="flex items-center gap-3">
                  {valeurOpen ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                </div>
              </button>
              {valeurOpen && (
                <div className="px-6 pb-6 border-t border-slate-800 pt-4">
                  <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full"></div>
                    <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                      <User size={16} className="text-indigo-400" />
                      Valeur par Tranche Hectare
                    </h4>
                    <p className="text-xs text-slate-500 mb-4">Saisissez le gain estimé généré par votre solution pour le client. Le ratio (Prix / Valeur) calculera l'attractivité commerciale.</p>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-[9px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                            <th className="pb-2 text-left w-24">Tranche</th>
                            <th className="pb-2 text-right">Gain / ha / an (DH)</th>
                            <th className="pb-2 text-right">Gain / employé / an (DH)</th>
                            <th className="pb-2 text-right">Ratio Prix/Valeur (Ha)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {haPriceTiers.map((tier, i) => {
                            const ratio = (tier.valuePerHa && tier.valuePerHa > 0) ? (tier.pricePerHa / tier.valuePerHa) : 0;
                            let statusText = '';
                            let statusColor = 'text-slate-500';
                            if (ratio > 0) {
                              if (ratio < 0.20) { statusText = 'Excellent (<20%)'; statusColor = 'text-emerald-400 font-bold'; }
                              else if (ratio <= 0.35) { statusText = 'Correct (20-35%)'; statusColor = 'text-orange-400 font-bold'; }
                              else { statusText = 'Risqué (>35%)'; statusColor = 'text-red-400 font-bold'; }
                            } else {
                              statusText = '-';
                            }

                            return (
                              <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                                <td className="py-2 text-slate-400 font-medium">{tier.label}</td>
                                <td className="py-2 text-right">
                                  <input type="number" min="0" step="100" value={tier.valuePerHa || ''} placeholder="Ex: 2500"
                                    onChange={e => updateHaTierValue(i, 'valuePerHa', Number(e.target.value))}
                                    className="w-20 bg-slate-900 border border-slate-700/50 rounded px-2 py-1 text-right text-indigo-300 font-bold" />
                                </td>
                                <td className="py-2 text-right">
                                  <input type="number" min="0" step="100" value={tier.valuePerEmployee || ''} placeholder="Ex: 5000"
                                    onChange={e => updateHaTierValue(i, 'valuePerEmployee', Number(e.target.value))}
                                    className="w-20 bg-slate-900 border border-slate-700/50 rounded px-2 py-1 text-right text-indigo-300 font-bold" />
                                </td>
                                <td className={`py-2 text-right ${statusColor}`}>
                                  {ratio > 0 ? `${(ratio * 100).toFixed(1)}%` : statusText}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Benchmark Marché — Collapsible */}
            <div className="bg-[#1e2436] rounded-xl border border-slate-800 shadow-xl overflow-hidden">
              <button onClick={() => setBenchmarkOpen(!benchmarkOpen)}
                className="w-full flex items-center justify-between p-6 hover:bg-slate-800/20 transition-colors text-left">
                <div className="flex items-center gap-2">
                  <Coins size={18} className="text-amber-400" />
                  <span className="text-lg font-bold text-white">Analyse Concurrentielle & Positionnement</span>
                </div>
                <div className="flex items-center gap-3">
                  {benchmarkOpen ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                </div>
              </button>
              {benchmarkOpen && (
                <div className="px-6 pb-6 border-t border-slate-800 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Odoo vs ERP */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
                      <div className="p-4 border-b border-slate-800 bg-slate-800/30">
                        <h4 className="text-sm font-bold text-white mb-1">Odoo Enterprise</h4>
                        <p className="text-[10px] text-slate-500">Comparaison ERP uniquement</p>
                      </div>
                      <div className="p-4 space-y-4">
                        {(() => {
                          const odooPrice = 97 * 12 * Math.max(1, erpSizeMultiplier * 2);
                          const gnaErpTarget = erpMonthly * 12;
                          const ratioDiff = ((gnaErpTarget - odooPrice) / odooPrice) * 100;
                          let posColor = ratioDiff < -15 ? 'text-red-400 border-red-500/30 bg-red-500/5' : ratioDiff <= 15 ? 'text-orange-400 border-orange-500/30 bg-orange-500/5' : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5';
                          let posLabel = ratioDiff < -15 ? 'Sous-marché' : ratioDiff <= 15 ? 'Aligné' : 'Premium';

                          return (
                            <>
                              <div className="p-3 bg-blue-900/20 border border-blue-500/20 rounded-lg">
                                <div className="text-[10px] text-blue-400 uppercase font-black tracking-wider mb-1">Votre Prix GNA (ERP)</div>
                                <div className="font-black text-white">{Math.round(gnaErpTarget).toLocaleString('fr-FR')} <span className="text-[10px] font-normal text-blue-300">DH/an</span></div>
                              </div>
                              <div className={`p-3 rounded-lg border flex justify-between items-center ${posColor}`}>
                                <div>
                                  <div className="text-sm font-bold text-white">{odooPrice.toLocaleString('fr-FR')} DH</div>
                                  <div className="text-[9px] opacity-70 mt-1">Estim. {Math.max(1, erpSizeMultiplier * 2)} act.</div>
                                </div>
                                <div className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-black/20 text-center">{posLabel}</div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* SMAG vs AgromindIA */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
                      <div className="p-4 border-b border-slate-800 bg-slate-800/30">
                        <h4 className="text-sm font-bold text-white mb-1">SMAG Farmer</h4>
                        <p className="text-[10px] text-slate-500">Comparaison AgromindIA uniquement</p>
                      </div>
                      <div className="p-4 space-y-4">
                        {(() => {
                          const smagPrice = 4300;
                          const gnaAgroTarget = agroTotal;
                          const ratioDiff = ((gnaAgroTarget - smagPrice) / smagPrice) * 100;
                          let posColor = ratioDiff < -15 ? 'text-red-400 border-red-500/30 bg-red-500/5' : ratioDiff <= 15 ? 'text-orange-400 border-orange-500/30 bg-orange-500/5' : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5';
                          let posLabel = ratioDiff < -15 ? 'Sous-marché' : ratioDiff <= 15 ? 'Aligné' : 'Premium';

                          return (
                            <>
                              <div className="p-3 bg-purple-900/20 border border-purple-500/20 rounded-lg">
                                <div className="text-[10px] text-purple-400 uppercase font-black tracking-wider mb-1">Votre Prix GNA (Agro)</div>
                                <div className="font-black text-white">{Math.round(gnaAgroTarget).toLocaleString('fr-FR')} <span className="text-[10px] font-normal text-purple-300">DH/an</span></div>
                              </div>
                              <div className={`p-3 rounded-lg border flex justify-between items-center ${posColor}`}>
                                <div>
                                  <div className="text-sm font-bold text-white">{smagPrice.toLocaleString('fr-FR')} DH</div>
                                  <div className="text-[9px] opacity-70 mt-1">Pack parcellaire</div>
                                </div>
                                <div className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-black/20 text-center">{posLabel}</div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* AgriEdge vs AgromindIA */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
                      <div className="p-4 border-b border-slate-800 bg-slate-800/30">
                        <h4 className="text-sm font-bold text-white mb-1">AgriEdge Maroc</h4>
                        <p className="text-[10px] text-slate-500">Comparaison AgromindIA uniquement</p>
                      </div>
                      <div className="p-4 space-y-4">
                        {(() => {
                          const agriEdgePrice = 5000;
                          const gnaAgroTarget = agroTotal;
                          const ratioDiff = ((gnaAgroTarget - agriEdgePrice) / agriEdgePrice) * 100;
                          let posColor = ratioDiff < -15 ? 'text-red-400 border-red-500/30 bg-red-500/5' : ratioDiff <= 15 ? 'text-orange-400 border-orange-500/30 bg-orange-500/5' : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5';
                          let posLabel = ratioDiff < -15 ? 'Sous-marché' : ratioDiff <= 15 ? 'Aligné' : 'Premium';

                          return (
                            <>
                              <div className="p-3 bg-purple-900/20 border border-purple-500/20 rounded-lg">
                                <div className="text-[10px] text-purple-400 uppercase font-black tracking-wider mb-1">Votre Prix GNA (Agro)</div>
                                <div className="font-black text-white">{Math.round(gnaAgroTarget).toLocaleString('fr-FR')} <span className="text-[10px] font-normal text-purple-300">DH/an</span></div>
                              </div>
                              {avgHectaresPerClient > 50 ? (
                                <div className="p-3 rounded-lg border border-slate-700 bg-slate-800/30 flex justify-center items-center h-[56px]">
                                  <span className="text-[10px] text-slate-400 text-center italic">Données 50ha+ non disponibles, tarif forfaitaire inconnu</span>
                                </div>
                              ) : (
                                <div className={`p-3 rounded-lg border flex justify-between items-center ${posColor}`}>
                                  <div>
                                    <div className="text-sm font-bold text-white">{agriEdgePrice.toLocaleString('fr-FR')} DH</div>
                                    <div className="text-[9px] opacity-70 mt-1">Tarif petite ferme estimé</div>
                                  </div>
                                  <div className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-black/20 text-center">{posLabel}</div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Client Profile */}
            <div className="bg-[#1e2436] rounded-xl border border-slate-800 p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><User size={18} className="text-blue-400" /> Profil Client Type</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs text-slate-500 mb-1 uppercase">Hectares Moyens / Client</label>
                  <input type="number" min="1" max="5000" value={avgHectaresPerClient}
                    onChange={e => setAvgHectares(Number(e.target.value))}
                    className="w-full bg-slate-800 rounded px-3 py-2 text-lg font-bold text-white border border-slate-700" />
                </div>
                <div>
                  <label className="flex justify-between text-xs text-slate-500 mb-1">
                    <span className="uppercase">Discount Bundle</span>
                    <span className="text-purple-400 font-bold">{discountPct}%</span>
                  </label>
                  <input type="range" min="0" max="30" step="1" value={discountPct}
                    onChange={e => setDiscount(Number(e.target.value))} className="w-full accent-purple-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Panel */}
        <div>
          <div className="bg-gradient-to-br from-emerald-900/40 to-blue-900/40 rounded-xl border border-emerald-500/30 p-6 shadow-xl sticky top-8 space-y-4">
            <h3 className="text-sm font-bold text-emerald-300 uppercase tracking-widest">Simulation ({avgHectaresPerClient} ha)</h3>
            <div className="text-[9px] text-slate-500 bg-slate-900/30 px-2 py-1 rounded">
              Mode : {haPricingMode === 'static' ? '📌 Statique' : '📊 Progressif'}
            </div>
            <div>
              <div className="text-xs text-slate-400">Pack de Base</div>
              <div className="text-lg font-bold text-emerald-400">{baseTotal.toLocaleString('fr-FR')} <span className="text-sm">DH/mo</span></div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Upsell ({upsellModules.filter(m => m.checked).length}/{upsellModules.length})</div>
              <div className="text-lg font-bold text-blue-400">{upsellTotal.toLocaleString('fr-FR')} <span className="text-sm">DH/mo</span></div>
            </div>
            <div className="border-t border-slate-700 pt-3">
              <div className="text-xs text-slate-400">Total ERP</div>
              <div className="text-xl font-black text-white">{erpMonthly.toLocaleString('fr-FR')} <span className="text-sm text-slate-400">DH/mo</span></div>
            </div>
            <div>
              <div className="text-xs text-slate-400">AgromindIA ({avgHectaresPerClient} ha)</div>
              <div className="text-lg font-bold text-purple-400">{Math.round(agroTotal).toLocaleString('fr-FR')} <span className="text-sm">DH/an</span></div>
            </div>
            <div className="border-t border-slate-700 pt-3">
              <div className="text-xs text-slate-400">MRR Brut</div>
              <div className="text-xl font-black text-white">{Math.round(grossMrr).toLocaleString('fr-FR')} <span className="text-sm text-slate-400">DH/mo</span></div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Après Discount ({discountPct}%)</div>
              <div className="text-xl font-black text-blue-400">{Math.round(netMrr).toLocaleString('fr-FR')} <span className="text-sm">DH/mo</span></div>
            </div>
            <div className="pt-3 border-t border-emerald-500/20">
              <div className="text-xs text-slate-400">💰 Cash Annuel / Client</div>
              <div className="text-3xl font-black text-emerald-400">{Math.round(annualCash).toLocaleString('fr-FR')} <span className="text-sm">DH</span></div>
            </div>
            <div className="pt-3 border-t border-emerald-500/20">
              <div className="text-xs text-slate-400">Prix Moyen / Ha (AgromindIA)</div>
              <div className={`text-xl font-black ${avgPerHa <= 400 ? 'text-emerald-400' : avgPerHa <= 600 ? 'text-amber-400' : 'text-red-400'}`}>
                {Math.round(avgPerHa).toLocaleString('fr-FR')} <span className="text-sm text-slate-400">DH/ha/an</span>
              </div>
            </div>
            {/* Scenarios with TIER BREAKDOWN */}
            <div className="pt-3 border-t border-emerald-500/20 space-y-3">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Scénarios par taille</div>
              {[5, 20, 50, 100, 200, 500, 700].map(ha => {
                const agro = haTotal(ha);
                const annualTotal = ((erpMonthly + agro / 12) * (1 - discountPct / 100)) * 12;
                const avg = ha > 0 ? agro / ha : 0;
                const breakdown = tierBreakdown(ha);
                return (
                  <div key={ha} className="bg-slate-900/30 rounded-lg p-2.5 border border-slate-800">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white font-bold">{ha} ha</span>
                      <span className="text-emerald-400 font-bold">{Math.round(annualTotal).toLocaleString('fr-FR')} DH/an</span>
                      <span className="text-slate-500">{Math.round(avg)} DH/ha/an</span>
                    </div>
                    <div className="flex gap-1 text-[9px] text-slate-500 flex-wrap">
                      {breakdown.map((t, i) => (
                        <span key={i} className="bg-slate-800 px-1.5 py-0.5 rounded">
                          {t.ha}ha×{t.price}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
