import { useEngineStore } from '../store/engineStore';
import { Settings, Package, Zap } from 'lucide-react';

export default function AdminConfig() {
  const { erpModules, setErpModuleBase } = useEngineStore();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="text-slate-400" />
          Étape 0 — Paramétrage Global
        </h2>
        <p className="text-slate-400 mt-2 font-medium">
          Configuration du comportement des modules sur la plateforme. Décidez quels modules sont inclus par défaut dans le "Pack de Base" et lesquels sont proposés en tant que "Modules Upsell".
        </p>
      </div>

      <div className="bg-[#1e2436] rounded-xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 bg-slate-900/50">
          <h3 className="text-lg font-bold text-white mb-1">Configuration des Modules ERP</h3>
          <p className="text-xs text-slate-500">
            Ce réglage modifie l'affichage dans l'Étape 1 et impacte le revenu de base.
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {erpModules.map(mod => (
              <div key={mod.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div className="mb-4">
                  <div className="text-sm font-bold text-white mb-1">{mod.name}</div>
                  <div className="text-[10px] text-slate-500 line-clamp-2">{mod.desc}</div>
                </div>
                
                <div className="flex bg-slate-800/50 p-1 rounded-lg">
                  <button
                    onClick={() => setErpModuleBase(mod.id, true)}
                    className={`flex-1 py-1.5 px-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      mod.isBase 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-sm'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Package size={14} /> Base
                  </button>
                  <button
                    onClick={() => setErpModuleBase(mod.id, false)}
                    className={`flex-1 py-1.5 px-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      !mod.isBase 
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50 shadow-sm'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Zap size={14} /> Upsell
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
