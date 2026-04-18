import { useState } from 'react';
import { Coins, Route, Server, Users, Building2, Megaphone, LayoutDashboard, Crown, Scale, Settings } from 'lucide-react';
import { useEngineStore } from './store/engineStore';
import AdminConfig from './views/AdminConfig';
import PricingConfig from './views/PricingConfig';
import RoadmapRD from './views/RoadmapRD';
import InfraCosts from './views/InfraCosts';
import SalesTeam from './views/SalesTeam';
import FixedCosts from './views/FixedCosts';
import Marketing from './views/Marketing';
import Dashboard from './views/Dashboard';
import StrategyBoard from './views/StrategyBoard';
import ScenarioComparator from './views/ScenarioComparator';
import StartupAdvisor from './views/StartupAdvisor';
import PricingStrategyExport from './views/PricingStrategyExport';
import { Briefcase, FileText } from 'lucide-react';

type ViewType = 'admin' | 'pricing' | 'roadmap' | 'infra' | 'sales' | 'fixed' | 'marketing' | 'dashboard' | 'strategy' | 'comparator' | 'advisor' | 'export';

export default function AppLayout() {
  const [activeView, setActiveView] = useState<ViewType>('admin');

  const navItems = [
    { id: 'admin' as const, label: '0. Paramétrage', icon: <Settings size={18} />, color: 'text-slate-400' },
    { id: 'pricing' as const, label: '1. Pricing', icon: <Coins size={18} />, color: 'text-emerald-400' },
    { id: 'roadmap' as const, label: '2. Roadmap R&D', icon: <Route size={18} />, color: 'text-amber-400' },
    { id: 'infra' as const, label: '3. Infrastructure', icon: <Server size={18} />, color: 'text-cyan-400' },
    { id: 'sales' as const, label: '4. Commerciaux', icon: <Users size={18} />, color: 'text-blue-400' },
    { id: 'fixed' as const, label: '5. Charges Fixes', icon: <Building2 size={18} />, color: 'text-rose-400' },
    { id: 'marketing' as const, label: '6. Marketing', icon: <Megaphone size={18} />, color: 'text-violet-400' },
    { id: 'dashboard' as const, label: '7. Dashboard', icon: <LayoutDashboard size={18} />, color: 'text-blue-400' },
    { id: 'strategy' as const, label: '8. Board Stratégique', icon: <Crown size={18} />, color: 'text-amber-400' },
    { id: 'comparator' as const, label: '9. Expert CFO', icon: <Scale size={18} />, color: 'text-indigo-400' },
    { id: 'advisor' as const, label: '10. Cabinet Conseil', icon: <Briefcase size={18} />, color: 'text-fuchsia-400' },
    { id: 'export' as const, label: '11. Stratégie Pricing', icon: <FileText size={18} />, color: 'text-rose-400' },
  ];

  const { isBuildingScenario, scenarioBuildName, cancelScenarioBuilder, finishScenarioBuilder } = useEngineStore();

  const handleNextStep = () => {
    const currentIndex = navItems.findIndex(i => i.id === activeView);
    if (currentIndex >= 0 && currentIndex < navItems.length - 1) {
      if (navItems[currentIndex + 1].id === 'strategy' || navItems[currentIndex + 1].id === 'comparator') {
        // Skip strategy and comparator in the wizard, wait for manual finish
        return;
      }
      setActiveView(navItems[currentIndex + 1].id);
    }
  };

  const handleFinishWizard = () => {
    finishScenarioBuilder();
    setActiveView('comparator');
  };

  const handleCancelWizard = () => {
    cancelScenarioBuilder();
    setActiveView('comparator');
  };

  return (
    <div className="flex h-screen bg-[#0b0f1a] text-slate-100 font-sans overflow-hidden">
      <aside className={`w-[260px] bg-[#0f1422] border-r border-slate-800 flex flex-col z-20 shrink-0 ${isBuildingScenario ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
        <div className="p-5 border-b border-slate-800">
          <h1 className="text-xl font-black tracking-tighter text-white flex items-center gap-2">
            AGRO<span className="text-blue-500">GINA</span>
            <span className="px-2 py-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded text-[10px] text-white font-bold tracking-widest shadow-lg shadow-blue-500/20">CFO v9</span>
          </h1>
          <p className="text-[10px] text-slate-500 mt-1 font-medium uppercase tracking-wider">Strategic CFO OS</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${activeView === item.id
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                }`}>
              <span className={activeView === item.id ? 'text-blue-400' : item.color}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-700">
            <div className="text-[10px] text-slate-400 mb-1 font-medium">FACTURATION</div>
            <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-bold uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Annuelle Upfront
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#0b0f1a] relative flex flex-col">
        {isBuildingScenario && (
          <div className="bg-indigo-600/20 border-b border-indigo-500/50 p-4 sticky top-0 z-50 backdrop-blur-xl flex items-center justify-between shadow-[0_4px_30px_rgba(79,70,229,0.2)] shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-500 text-white p-2 rounded-lg"><Scale size={20} /></div>
              <div>
                <h2 className="text-white font-black text-lg flex items-center gap-2">
                  🏗️ Assistant de Création Scénario : <span className="text-indigo-300">{scenarioBuildName}</span>
                </h2>
                <p className="text-indigo-200/70 text-xs">Modifiez vos paramètres en temps réel sans affecter votre modèle principal. Vous êtes sur : <strong>{navItems.find(i => i.id === activeView)?.label}</strong></p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleCancelWizard} className="px-4 py-2 text-slate-300 font-bold hover:text-white transition text-sm">Annuler</button>

              {activeView !== 'dashboard' && (
                <button onClick={handleNextStep} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold rounded-lg transition text-sm flex items-center gap-2">
                  Continuer ➔
                </button>
              )}

              <button onClick={handleFinishWizard} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-lg transition shadow-lg shadow-emerald-500/20 text-sm">
                ✅ Valider ce Scénario
              </button>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none mt-[80px]"></div>
        <div className="p-8 relative z-10 flex-1">
          {activeView === 'admin' && <AdminConfig />}
          {activeView === 'pricing' && <PricingConfig />}
          {activeView === 'roadmap' && <RoadmapRD />}
          {activeView === 'infra' && <InfraCosts />}
          {activeView === 'sales' && <SalesTeam />}
          {activeView === 'fixed' && <FixedCosts />}
          {activeView === 'marketing' && <Marketing />}
          {activeView === 'dashboard' && <Dashboard />}
          {activeView === 'strategy' && <StrategyBoard />}
          {activeView === 'comparator' && <ScenarioComparator onResetToBuild={() => setActiveView('pricing')} />}
          {activeView === 'advisor' && <StartupAdvisor />}
          {activeView === 'export' && <PricingStrategyExport />}
        </div>
      </main>
    </div>
  );
}
