import { create } from 'zustand';

export interface RoadmapModule {
  id: string;
  name: string;
  cost: number;
  safetyMargin: number; // Percentage, e.g., 40 for 40%
  status?: 'locked' | 'financiable' | 'unlocked';
  unlockMonth?: number;
}

export interface ExpenseTrigger {
  id: string;
  name: string; // e.g., "Recrutement Dev Senior"
  triggerType: 'mrr' | 'users';
  threshold: number; // e.g., 50000 DH or 100 Users
  monthlyCost: number; // e.g., 15000 DH
}

export interface SimulationState {
  // Pricing Strategy
  setupFee: number;
  subscriptionFee: number;
  
  // Acquisition Strategy
  initialUsers: number;
  monthlyGrowthUsers: number;
  churnRate: number; // Percentage, e.g., 2%
  
  // Financial Context
  baseFixedCosts: number;
  startingCash: number;
  
  // Roadmap & Triggers
  modules: RoadmapModule[];
  triggers: ExpenseTrigger[];
  
  // Actions
  updatePricing: (setup: number, sub: number) => void;
  updateAcquisition: (initial: number, growth: number, churn: number) => void;
  updateFinancials: (costs: number, startCash: number) => void;
  addModule: (module: Omit<RoadmapModule, 'id'>) => void;
  removeModule: (id: string) => void;
  addTrigger: (trigger: Omit<ExpenseTrigger, 'id'>) => void;
  removeTrigger: (id: string) => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  // Default Values (Agrogina B2B SaaS Baseline)
  setupFee: 2000,
  subscriptionFee: 400,
  
  initialUsers: 5,
  monthlyGrowthUsers: 2,
  churnRate: 2,
  
  baseFixedCosts: 15000, // Serveurs, licences, comptable
  startingCash: 50000,
  
  modules: [
    { id: '1', name: 'Module Météo AI', cost: 100000, safetyMargin: 40 },
    { id: '2', name: 'Capteurs IoT Intégration', cost: 80000, safetyMargin: 30 },
  ],
  
  triggers: [
    { id: 't1', name: 'Recrutement Dev Senior', triggerType: 'mrr', threshold: 40000, monthlyCost: 15000 },
    { id: 't2', name: 'Commercial Senior', triggerType: 'users', threshold: 50, monthlyCost: 12000 },
  ],
  
  updatePricing: (setup, sub) => set({ setupFee: setup, subscriptionFee: sub }),
  updateAcquisition: (initial, growth, churn) => set({ initialUsers: initial, monthlyGrowthUsers: growth, churnRate: churn }),
  updateFinancials: (costs, startCash) => set({ baseFixedCosts: costs, startingCash: startCash }),
  
  addModule: (mod) => set((state) => ({ modules: [...state.modules, { ...mod, id: Math.random().toString(36).substr(2, 9) }] })),
  removeModule: (id) => set((state) => ({ modules: state.modules.filter((m) => m.id !== id) })),
  
  addTrigger: (trig) => set((state) => ({ triggers: [...state.triggers, { ...trig, id: Math.random().toString(36).substr(2, 9) }] })),
  removeTrigger: (id) => set((state) => ({ triggers: state.triggers.filter((t) => t.id !== id) })),
}));
