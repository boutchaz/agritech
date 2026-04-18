import { useState } from 'react';
import { useEngineStore } from '../store/engineStore';
import { Server, Globe2, Database, ChevronDown, ChevronRight, Cpu, CloudSun, Wifi } from 'lucide-react';

export default function InfraCosts() {
  const { infra, updateInfra, roadmapItems } = useEngineStore();

  const [devOpen, setDevOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [apiOpen, setApiOpen] = useState(false);
  const [geeOpen, setGeeOpen] = useState(false);
  const [weatherOpen, setWeatherOpen] = useState(false);
  const [simOpen, setSimOpen] = useState(false);

  const couveuseUnlocked = roadmapItems.find(i => i.id === 'rm-couveuse')?.checked;

  const Collapsible = ({ open, toggle, icon, title, summary, children }: {
    open: boolean; toggle: () => void; icon: React.ReactNode; title: string; summary: string; children: React.ReactNode;
  }) => (
    <div className="bg-[#1e2436] rounded-xl border border-slate-800 shadow-xl overflow-hidden">
      <button onClick={toggle} className="w-full flex items-center justify-between p-6 hover:bg-slate-800/20 transition-colors text-left">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-lg font-bold text-white">{title}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-300">{summary}</span>
          {open ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
        </div>
      </button>
      {open && <div className="border-t border-slate-800 p-6 pt-4">{children}</div>}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto text-slate-200 pb-12">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <Server className="text-cyan-500" size={32} />
          Étape 3 — Infrastructure & Coûts Serveur
        </h2>
        <p className="text-slate-400 mt-2 font-medium">Coûts variables et fixes d'infrastructure.</p>
      </div>

      <div className="space-y-4">
        {/* Dev Server */}
        <Collapsible open={devOpen} toggle={() => setDevOpen(!devOpen)}
          icon={<Database size={18} className="text-purple-400" />}
          title="Serveur Dev / Production"
          summary={`${infra.devServerCost} DH/mo`}>
          <p className="text-xs text-slate-500 mb-3">Serveur de développement et déploiement. Coût fixe.</p>
          <div className="w-1/3">
            <label className="block text-xs text-slate-500 mb-1">Coût Fixe / Mois (DH)</label>
            <input type="number" value={infra.devServerCost} onChange={e => updateInfra('devServerCost', Number(e.target.value))}
              className="w-full bg-slate-800 rounded px-3 py-2 text-sm border border-slate-700 text-purple-300 font-bold" />
          </div>
        </Collapsible>

        {/* User-facing Server */}
        <Collapsible open={clientOpen} toggle={() => setClientOpen(!clientOpen)}
          icon={<Database size={18} className="text-cyan-400" />}
          title="Serveur Clients (Utilisateurs)"
          summary={`${infra.serverBaseCost} DH + paliers`}>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Coût Base (Fixe/Mois)</label>
              <input type="number" value={infra.serverBaseCost} onChange={e => updateInfra('serverBaseCost', Number(e.target.value))}
                className="w-full bg-slate-800 rounded px-3 py-2 text-sm border border-slate-700 text-white font-bold" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">+ Par Palier (DH)</label>
              <input type="number" value={infra.serverStepCost} onChange={e => updateInfra('serverStepCost', Number(e.target.value))}
                className="w-full bg-slate-800 rounded px-3 py-2 text-sm border border-slate-700 text-red-300 font-bold" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Tous les X Clients</label>
              <input type="number" value={infra.serverStepUsers} onChange={e => updateInfra('serverStepUsers', Number(e.target.value))}
                className="w-full bg-slate-800 rounded px-3 py-2 text-sm border border-slate-700 text-slate-300 font-bold" />
            </div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
            <div className="text-xs text-slate-400">Simulation total infra :</div>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {[0, 10, 50, 200].map(n => (
                <div key={n} className="text-center">
                  <div className="text-[10px] text-slate-500">{n} clients</div>
                  <div className="text-sm font-bold text-white">
                    {(infra.devServerCost + infra.serverBaseCost + infra.weatherApiMonthly + (infra.serverStepUsers > 0 ? Math.floor(n / infra.serverStepUsers) * infra.serverStepCost : 0) + n * (infra.agromindApiCostPerUser + infra.assistantApiCostPerUser)).toLocaleString('fr-FR')} DH
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Collapsible>

        {/* APIs */}
        <Collapsible open={apiOpen} toggle={() => setApiOpen(!apiOpen)}
          icon={<Cpu size={18} className="text-blue-400" />}
          title="Coûts API (par Client / Mois)"
          summary={`${infra.agromindApiCostPerUser + infra.assistantApiCostPerUser} DH/client`}>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
              <div className="text-sm font-bold text-blue-400 mb-1">🧠 AgromindIA</div>
              <p className="text-[10px] text-slate-500 mb-2">Moteur décisionnel, calibrage parcellaire, recommandations.</p>
              <input type="number" step="1" value={infra.agromindApiCostPerUser} onChange={e => updateInfra('agromindApiCostPerUser', Number(e.target.value))}
                className="w-full bg-slate-900/50 border border-slate-700 rounded px-3 py-2 text-sm text-blue-300 font-bold" />
              <p className="text-[10px] text-slate-500 mt-1">DH / client / mois</p>
            </div>
            <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
              <div className="text-sm font-bold text-purple-400 mb-1">💬 Assistant IA Chat</div>
              <p className="text-[10px] text-slate-500 mb-2">Chat IA accès données fermes, tâches, stocks.</p>
              <input type="number" step="1" value={infra.assistantApiCostPerUser} onChange={e => updateInfra('assistantApiCostPerUser', Number(e.target.value))}
                className="w-full bg-slate-900/50 border border-slate-700 rounded px-3 py-2 text-sm text-purple-300 font-bold" />
              <p className="text-[10px] text-slate-500 mt-1">DH / client / mois</p>
            </div>
          </div>
        </Collapsible>

        {/* Weather API */}
        <Collapsible open={weatherOpen} toggle={() => setWeatherOpen(!weatherOpen)}
          icon={<CloudSun size={18} className="text-amber-400" />}
          title="API Météo"
          summary={`${infra.weatherApiMonthly} DH/mo`}>
          <p className="text-xs text-slate-500 mb-3">Service météo (OpenWeather Pro, Meteomatics, etc.). Coût fixe mensuel pour accéder aux données analytiques, prévisions, historique.</p>
          <div className="w-1/3">
            <label className="block text-xs text-slate-500 mb-1">Coût Fixe / Mois (DH)</label>
            <input type="number" min="0" step="50" value={infra.weatherApiMonthly} onChange={e => updateInfra('weatherApiMonthly', Number(e.target.value))}
              className="w-full bg-slate-800 rounded px-3 py-2 text-sm border border-slate-700 text-amber-300 font-bold" />
            <p className="text-[10px] text-slate-500 mt-1">OpenWeather Pro ~$40/mo ≈ 400 DH</p>
          </div>
        </Collapsible>

        {/* GEE */}
        <Collapsible open={geeOpen} toggle={() => setGeeOpen(!geeOpen)}
          icon={<Globe2 size={18} className="text-emerald-400" />}
          title="Google Earth Engine (Sentinel-2)"
          summary={infra.geeThresholdUsers === 0 ? 'Gratuit (non-commercial)' : `${infra.geeFixedCost} DH/mo fixe`}>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-4">
            <p className="text-xs text-emerald-300">💡 Sentinel-2 est gratuit en non-commercial. Le plan commercial GEE démarre à ~$500/mois.</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">GEE Fixe / Mois (DH)</label>
              <input type="number" value={infra.geeFixedCost} onChange={e => updateInfra('geeFixedCost', Number(e.target.value))}
                className="w-full bg-slate-800 rounded px-3 py-2 text-sm border border-slate-700 text-white font-bold" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Variable / Ha (DH)</label>
              <input type="number" step="0.1" value={infra.geeVariableCostPerHa} onChange={e => updateInfra('geeVariableCostPerHa', Number(e.target.value))}
                className="w-full bg-slate-800 rounded px-3 py-2 text-sm border border-slate-700 text-red-300 font-bold" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Payant à partir de X clients</label>
              <input type="number" value={infra.geeThresholdUsers} onChange={e => updateInfra('geeThresholdUsers', Number(e.target.value))}
                className="w-full bg-slate-800 rounded px-3 py-2 text-sm border border-slate-700 text-amber-300 font-bold" />
              <p className="text-[10px] text-slate-500 mt-1">0 = gratuit pour toujours</p>
            </div>
          </div>
        </Collapsible>

        {/* M2M SIM Cards */}
        {couveuseUnlocked && (
          <Collapsible open={simOpen} toggle={() => setSimOpen(!simOpen)}
            icon={<Wifi size={18} className="text-pink-400" />}
            title="Cartes SIM M2M (Couveuses)"
            summary={`${infra.m2mSimCardMonthly} DH / Couveuse active`}>
            <div className="bg-pink-500/10 border border-pink-500/20 rounded-lg p-3 mb-4">
              <p className="text-xs text-pink-300">💡 Ce coût s'active uniquement pendant les mois opérationnels. Calcul auto dans le P&L : Clients Actifs "Module Seul" × 40 DH/mois.</p>
            </div>
            <div className="w-1/3">
              <label className="block text-xs text-slate-500 mb-1">Abo. SIM 4G / Mois (DH)</label>
              <input type="number" value={infra.m2mSimCardMonthly} onChange={e => updateInfra('m2mSimCardMonthly', Number(e.target.value))}
                className="w-full bg-slate-800 rounded px-3 py-2 text-sm border border-slate-700 text-pink-300 font-bold" />
            </div>
          </Collapsible>
        )
        }
      </div >
    </div >
  );
}
