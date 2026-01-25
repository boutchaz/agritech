import React from 'react';
import { 
  MapPin, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Users, 
  Building,
  ArrowRight,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { ModuleCard } from '../ui/ModuleCard';

interface ModuleSelection {
  farm_management: boolean;
  inventory: boolean;
  sales: boolean;
  procurement: boolean;
  accounting: boolean;
  hr: boolean;
  analytics: boolean;
  marketplace: boolean;
}

interface ModulesStepProps {
  moduleSelection: ModuleSelection;
  onUpdate: (data: Partial<ModuleSelection>) => void;
  onNext: () => void;
}

const AVAILABLE_MODULES = [
  {
    id: 'farm_management',
    name: 'Gestion de Ferme',
    description: 'Parcelles, cultures, tâches et récoltes',
    icon: MapPin,
    color: 'emerald',
    recommended: true,
  },
  {
    id: 'inventory',
    name: 'Stock & Inventaire',
    description: 'Entrepôts, articles et mouvements',
    icon: Package,
    color: 'blue',
    recommended: true,
  },
  {
    id: 'sales',
    name: 'Ventes',
    description: 'Devis, commandes et factures',
    icon: ShoppingCart,
    color: 'purple',
    recommended: false,
  },
  {
    id: 'procurement',
    name: 'Achats',
    description: 'Fournisseurs et bons de commande',
    icon: ShoppingCart,
    color: 'orange',
    recommended: false,
  },
  {
    id: 'accounting',
    name: 'Comptabilité',
    description: 'Plan comptable et journaux',
    icon: BarChart3,
    color: 'indigo',
    recommended: false,
  },
  {
    id: 'hr',
    name: 'Ressources Humaines',
    description: 'Employés, présences et paie',
    icon: Users,
    color: 'pink',
    recommended: true,
  },
  {
    id: 'analytics',
    name: 'Analyses Satellite',
    description: 'NDVI, santé des cultures, prédictions',
    icon: TrendingUp,
    color: 'cyan',
    recommended: false,
  },
  {
    id: 'marketplace',
    name: 'Marketplace',
    description: 'Vendez vos produits en ligne',
    icon: Building,
    color: 'green',
    recommended: false,
  },
];

export const ModulesStep: React.FC<ModulesStepProps> = ({
  moduleSelection,
  onUpdate,
  onNext,
}) => {
  const selectedCount = Object.values(moduleSelection).filter(Boolean).length;
  
  const toggleModule = (moduleId: string) => {
    onUpdate({ [moduleId]: !moduleSelection[moduleId as keyof ModuleSelection] });
  };

  // Encouraging messages based on selection count
  const getMessage = () => {
    if (selectedCount === 0) return 'Sélectionnez au moins un module pour commencer';
    if (selectedCount === 1) return 'Bon début ! Ajoutez-en d\'autres pour plus de puissance';
    if (selectedCount <= 3) return 'Excellent choix ! Votre ferme prend forme';
    if (selectedCount <= 5) return 'Impressionnant ! Vous êtes prêt à tout gérer';
    return 'Configuration complète ! Vous êtes un pro';
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-violet-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Choisissez vos super-pouvoirs
        </h2>
        <p className="text-gray-500">
          Activez les modules dont vous avez besoin
        </p>
      </div>

      {/* Selection counter */}
      <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-sky-50 rounded-xl border border-emerald-200">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-600">{getMessage()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-emerald-600">{selectedCount}</span>
            <span className="text-sm text-gray-500">/ {AVAILABLE_MODULES.length}</span>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all duration-500 rounded-full"
            style={{ width: `${(selectedCount / AVAILABLE_MODULES.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Modules grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {AVAILABLE_MODULES.map((module) => (
          <ModuleCard
            key={module.id}
            id={module.id}
            name={module.name}
            description={module.description}
            icon={<module.icon className="w-5 h-5" />}
            color={module.color}
            selected={moduleSelection[module.id as keyof ModuleSelection]}
            onToggle={() => toggleModule(module.id)}
            recommended={module.recommended}
          />
        ))}
      </div>

      {/* Quick actions */}
      <div className="mt-6 flex gap-3 justify-center">
        <button
          type="button"
          onClick={() => {
            const allSelected: Partial<ModuleSelection> = {};
            AVAILABLE_MODULES.forEach(m => {
              allSelected[m.id as keyof ModuleSelection] = true;
            });
            onUpdate(allSelected);
          }}
          className="px-4 py-2 text-sm text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
        >
          Tout sélectionner
        </button>
        <button
          type="button"
          onClick={() => {
            const recommended: Partial<ModuleSelection> = {};
            AVAILABLE_MODULES.forEach(m => {
              recommended[m.id as keyof ModuleSelection] = m.recommended;
            });
            onUpdate(recommended);
          }}
          className="px-4 py-2 text-sm text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors"
        >
          Sélection recommandée
        </button>
      </div>

      {/* Info box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-sm text-blue-800">
          <strong>Pas de panique !</strong> Vous pourrez activer ou désactiver ces modules à tout moment depuis les paramètres.
        </p>
      </div>

      <button
        onClick={onNext}
        disabled={selectedCount === 0}
        className="mt-8 w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold
          shadow-lg shadow-emerald-500/30 hover:shadow-xl
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-300 hover:scale-[1.02]
          flex items-center justify-center gap-2"
      >
        Dernière étape
        <ArrowRight className="w-5 h-5" />
      </button>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default ModulesStep;
