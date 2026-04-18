import { useState } from 'react';
import { useEngineStore } from '../store/engineStore';
import { Building2, Car, ChevronDown, ChevronRight, Wrench } from 'lucide-react';

export default function FixedCosts() {
  const { fixedCosts, updateFixedCosts } = useEngineStore();
  const [transportOpen, setTransportOpen] = useState(false);
  const [opsOpen, setOpsOpen] = useState(true);

  const rows: { label: string; p1Key: keyof typeof fixedCosts; p2Key: keyof typeof fixedCosts; note?: string }[] = [
    { label: 'Fondateurs / Dirigeants', p1Key: 'foundersP1', p2Key: 'foundersP2', note: '0 en Phase 1 (equity only)' },
    { label: 'Développeurs', p1Key: 'devP1', p2Key: 'devP2', note: 'Co-fondateur gratuit P1' },
    { label: 'Loyer / Coworking', p1Key: 'rentP1', p2Key: 'rentP2', note: 'Remote Phase 1' },
    { label: 'Admin / Comptable / Juridique', p1Key: 'admP1', p2Key: 'admP2' },
    { label: 'Marketing Brand & Com', p1Key: 'mktBrandP1', p2Key: 'mktBrandP2' },
  ];

  const totalP1 = rows.reduce((a, r) => a + (fixedCosts[r.p1Key] as number), 0);
  const totalP2 = rows.reduce((a, r) => a + (fixedCosts[r.p2Key] as number), 0);
  const vehicleMo = fixedCosts.vehicleMode === 'loa' ? fixedCosts.vehicleLoaMonthly : Math.round(fixedCosts.vehiclePurchasePrice / 48);

  return (
    <div className="max-w-5xl mx-auto text-slate-200 pb-12">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <Building2 className="text-rose-500" size={32} />
          Étape 5 — Charges Fixes Mensuelles
        </h2>
        <p className="text-slate-400 mt-2 font-medium">Phase 1 = ultra-frugal. Phase 2 = croissance post-levée.</p>
      </div>

      <div className="space-y-4">
        {/* Salary Table */}
        <div className="bg-[#1e2436] rounded-xl border border-slate-800 p-6 shadow-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <th className="pb-3 text-left">Poste</th>
                <th className="pb-3 text-right">Phase 1</th>
                <th className="pb-3 text-right">Phase 2</th>
                <th className="pb-3 text-left pl-4">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {rows.map(r => (
                <tr key={r.p1Key} className="hover:bg-slate-800/20">
                  <td className="py-3 font-semibold text-slate-200">{r.label}</td>
                  <td className="py-3 text-right">
                    <input type="number" min="0" step="500" value={fixedCosts[r.p1Key] as number}
                      onChange={e => updateFixedCosts(r.p1Key, Number(e.target.value))}
                      className="w-24 bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-right text-slate-300 font-bold" />
                  </td>
                  <td className="py-3 text-right">
                    <input type="number" min="0" step="500" value={fixedCosts[r.p2Key] as number}
                      onChange={e => updateFixedCosts(r.p2Key, Number(e.target.value))}
                      className="w-24 bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-right text-blue-300 font-bold" />
                  </td>
                  <td className="py-3 text-left pl-4 text-[11px] text-slate-500">{r.note || ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-700">
                <td className="pt-3 font-black text-white">TOTAL</td>
                <td className="pt-3 text-right font-black text-slate-300">{totalP1.toLocaleString('fr-FR')} DH</td>
                <td className="pt-3 text-right font-black text-blue-400">{totalP2.toLocaleString('fr-FR')} DH</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
          <div className="mt-6 pt-6 border-t border-slate-800 flex items-center gap-4">
            <span className="text-sm text-slate-300 font-medium">Phase 1 → 2 quand MRR atteint :</span>
            <input type="number" min="0" step="5000" value={fixedCosts.triggerPhase2MRR}
              onChange={e => updateFixedCosts('triggerPhase2MRR', Number(e.target.value))}
              className="w-32 bg-slate-800 rounded px-3 py-1.5 text-emerald-300 font-bold border border-slate-700" />
            <span className="text-sm text-slate-500">DH/mois</span>
          </div>
        </div>

        {/* Transport — Collapsible */}
        <div className="bg-[#1e2436] rounded-xl border border-slate-800 shadow-xl overflow-hidden">
          <button onClick={() => setTransportOpen(!transportOpen)}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-800/20 transition-colors text-left">
            <div className="flex items-center gap-2">
              <Car size={18} className="text-cyan-400" />
              <span className="text-lg font-bold text-white">Transport (Phase 2 — lié aux commerciaux)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-cyan-400 font-bold">{fixedCosts.vehicleMode === 'loa' ? 'LOA' : 'Achat'} · {vehicleMo.toLocaleString('fr-FR')} DH/mo/véh</span>
              {transportOpen ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
            </div>
          </button>
          {transportOpen && (
            <div className="border-t border-slate-800 p-6 pt-4">
              <p className="text-xs text-slate-500 mb-4">Quand vous recrutez un commercial salarié, il lui faut un véhicule.</p>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs text-slate-500 mb-2 uppercase">Mode</label>
                  <div className="flex gap-2">
                    {(['loa', 'purchase'] as const).map(mode => (
                      <button key={mode}
                        onClick={() => updateFixedCosts('vehicleMode', mode)}
                        className={`flex-1 py-2.5 rounded-lg font-bold text-sm border transition-all ${fixedCosts.vehicleMode === mode
                            ? mode === 'loa' ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' : 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                            : 'bg-slate-900/50 border-slate-700 text-slate-500'
                          }`}>
                        {mode === 'loa' ? '🔄 LOA' : '🛒 Achat'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-2 uppercase">Véhicules par Commercial</label>
                  <input type="number" min="1" value={fixedCosts.vehiclesPerCommercial}
                    onChange={e => updateFixedCosts('vehiclesPerCommercial', Number(e.target.value))}
                    className="w-full bg-slate-800 rounded px-3 py-2 text-sm border border-slate-700 text-white font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6 mt-4">
                {fixedCosts.vehicleMode === 'loa' ? (
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Coût LOA / Mois (DH)</label>
                    <input type="number" min="0" step="100" value={fixedCosts.vehicleLoaMonthly}
                      onChange={e => updateFixedCosts('vehicleLoaMonthly', Number(e.target.value))}
                      className="w-full bg-slate-800 rounded px-3 py-2 text-sm border border-slate-700 text-cyan-300 font-bold" />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Prix Achat (DH) — amorti 48 mois</label>
                    <input type="number" min="0" step="10000" value={fixedCosts.vehiclePurchasePrice}
                      onChange={e => updateFixedCosts('vehiclePurchasePrice', Number(e.target.value))}
                      className="w-full bg-slate-800 rounded px-3 py-2 text-sm border border-slate-700 text-amber-300 font-bold" />
                  </div>
                )}
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800 flex flex-col items-center justify-center">
                  <div className="text-[10px] text-slate-500 uppercase">Coût Mensuel / Véhicule</div>
                  <div className="text-2xl font-black text-white">{vehicleMo.toLocaleString('fr-FR')} DH</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Charges Variables Modules — Collapsible */}
        <div className="bg-[#1e2436] rounded-xl border border-slate-800 shadow-xl overflow-hidden mt-4">
          <button onClick={() => setOpsOpen(!opsOpen)}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-800/20 transition-colors text-left">
            <div className="flex items-center gap-2">
              <Wrench size={18} className="text-orange-400" />
              <span className="text-lg font-bold text-white">Charges d'Opérations (Liées à la Roadmap)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-orange-400 font-bold text-sm">Déclenchement Auto</span>
              {opsOpen ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
            </div>
          </button>
          {opsOpen && (
            <div className="border-t border-slate-800 p-6 pt-4">
              <p className="text-xs text-slate-500 mb-6">Ces charges ne sont valables que <strong>lorsque les conditions sont remplies</strong> (modules débloqués ou seuils de clients atteints). Elles s'activeront dynamiquement dans le P&L détaillé et la vue consolidée "Charges Opérationnelles".</p>

              <div className="grid grid-cols-2 gap-8">
                {/* Technicien Installation */}
                <div className="bg-slate-900/30 p-4 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Wrench size={16} className="text-orange-400" />
                    <h4 className="font-bold text-sm text-white">Technicien Installation</h4>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Salaire Mensuel (DH)</label>
                      <input type="number" min="0" step="500" value={fixedCosts.techInstallMonthly}
                        onChange={e => updateFixedCosts('techInstallMonthly', Number(e.target.value))}
                        className="w-full bg-slate-800 rounded px-3 py-1.5 text-sm border border-slate-700 text-orange-300 font-bold" />
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-[10px] text-slate-500 mb-1">Déclenchement (Modules HW)</label>
                        <input type="number" min="1" value={fixedCosts.techInstallTriggerHwModules}
                          onChange={e => updateFixedCosts('techInstallTriggerHwModules', Number(e.target.value))}
                          className="w-full bg-slate-800 rounded px-2 py-1 text-xs border border-slate-700 text-slate-300" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] text-slate-500 mb-1">Mise à l'échelle (+1 tech / X clients)</label>
                        <input type="number" min="1" value={fixedCosts.techInstallScalingClients}
                          onChange={e => updateFixedCosts('techInstallScalingClients', Number(e.target.value))}
                          className="w-full bg-slate-800 rounded px-2 py-1 text-xs border border-slate-700 text-slate-300" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SAV Terrain */}
                <div className="bg-slate-900/30 p-4 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Car size={16} className="text-orange-400" />
                    <h4 className="font-bold text-sm text-white">SAV Terrain</h4>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Salaire Mensuel (DH)</label>
                      <input type="number" min="0" step="500" value={fixedCosts.savTerrainMonthly}
                        onChange={e => updateFixedCosts('savTerrainMonthly', Number(e.target.value))}
                        className="w-full bg-slate-800 rounded px-3 py-1.5 text-sm border border-slate-700 text-orange-300 font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Déclenchement (Clients HW cumulés)</label>
                      <input type="number" min="1" value={fixedCosts.savTerrainTriggerClients}
                        onChange={e => updateFixedCosts('savTerrainTriggerClients', Number(e.target.value))}
                        className="w-full bg-slate-800 rounded px-2 py-1 text-xs border border-slate-700 text-slate-300" />
                    </div>
                  </div>
                </div>

                {/* Développeur Maintenance */}
                <div className="bg-slate-900/30 p-4 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 size={16} className="text-purple-400" />
                    <h4 className="font-bold text-sm text-white">Développeur Maintenance</h4>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Salaire Mensuel (DH)</label>
                      <input type="number" min="0" step="500" value={fixedCosts.devMaintenanceMonthly}
                        onChange={e => updateFixedCosts('devMaintenanceMonthly', Number(e.target.value))}
                        className="w-full bg-slate-800 rounded px-3 py-1.5 text-sm border border-slate-700 text-purple-300 font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Déclenchement (Modules débloqués, Phase 2)</label>
                      <input type="number" min="1" value={fixedCosts.devMaintenanceTriggerModules}
                        onChange={e => updateFixedCosts('devMaintenanceTriggerModules', Number(e.target.value))}
                        className="w-full bg-slate-800 rounded px-2 py-1 text-xs border border-slate-700 text-slate-300" />
                    </div>
                  </div>
                </div>

                {/* Agronome Customer Success */}
                <div className="bg-slate-900/30 p-4 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-emerald-400">🌱</span>
                    <h4 className="font-bold text-sm text-white">Agronome Customer Success</h4>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Salaire Mensuel (DH)</label>
                      <input type="number" min="0" step="500" value={fixedCosts.agronomeMonthly}
                        onChange={e => updateFixedCosts('agronomeMonthly', Number(e.target.value))}
                        className="w-full bg-slate-800 rounded px-3 py-1.5 text-sm border border-slate-700 text-emerald-300 font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Déclenchement (Clients actifs mini, Phase 2)</label>
                      <input type="number" min="1" value={fixedCosts.agronomeTriggerClients}
                        onChange={e => updateFixedCosts('agronomeTriggerClients', Number(e.target.value))}
                        className="w-full bg-slate-800 rounded px-2 py-1 text-xs border border-slate-700 text-slate-300" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-800 pt-6">
                <label className="block text-xs text-slate-500 mb-1 text-amber-400">Stock Tampon Hardware (% du COGS estimé)</label>
                <input type="number" min="0" max="100" step="5" value={fixedCosts.hwBufferStockPct}
                  onChange={e => updateFixedCosts('hwBufferStockPct', Number(e.target.value))}
                  className="w-1/3 bg-slate-800 rounded px-3 py-2 text-sm border border-slate-700 text-amber-300 font-bold" />
                <p className="text-[10px] text-slate-500 mt-1">Payé ponctuellement dans le flux de trésorerie 1 mois avant le lancement de chaque module HW.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
