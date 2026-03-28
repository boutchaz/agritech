import React from 'react';
import { Check, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ModuleCardProps {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  selected: boolean;
  onToggle: () => void;
  recommended?: boolean;
  locked?: boolean;
  requiredPlan?: string | null;
}

export const ModuleCard: React.FC<ModuleCardProps> = ({
  name,
  description,
  icon,
  color,
  selected,
  onToggle,
  recommended,
  locked = false,
  requiredPlan,
}) => {
  const colorMap: Record<string, { bg: string; border: string; iconBg: string; check: string }> = {
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-500', iconBg: 'bg-emerald-100 text-emerald-600', check: 'bg-emerald-500' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-500', iconBg: 'bg-blue-100 text-blue-600', check: 'bg-blue-500' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-500', iconBg: 'bg-purple-100 text-purple-600', check: 'bg-purple-500' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-500', iconBg: 'bg-orange-100 text-orange-600', check: 'bg-orange-500' },
    pink: { bg: 'bg-pink-50', border: 'border-pink-500', iconBg: 'bg-pink-100 text-pink-600', check: 'bg-pink-500' },
    cyan: { bg: 'bg-cyan-50', border: 'border-cyan-500', iconBg: 'bg-cyan-100 text-cyan-600', check: 'bg-cyan-500' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-500', iconBg: 'bg-indigo-100 text-indigo-600', check: 'bg-indigo-500' },
    green: { bg: 'bg-green-50', border: 'border-green-500', iconBg: 'bg-green-100 text-green-600', check: 'bg-green-500' },
  };

  const colors = colorMap[color] || colorMap.emerald;

  return (
    <Button
      type="button"
      onClick={() => {
        if (locked) {
          return;
        }
        onToggle();
      }}
      className={`
        relative group p-4 rounded-2xl border-2 text-left
        transition-all duration-300 ease-out
        ${locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
        ${selected 
          ? `${colors.bg} ${colors.border} shadow-lg` 
          : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
        }
        ${locked ? '' : selected ? 'scale-[1.02]' : 'hover:scale-[1.01]'}
      `}
    >
      {/* Recommended badge */}
      {recommended && (
        <div className="absolute -top-2 left-4 px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-[10px] font-bold rounded-full flex items-center gap-1 shadow-sm">
          <Sparkles className="w-3 h-3" />
          Recommandé
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`
          p-2.5 rounded-xl transition-all duration-300
          ${selected ? colors.iconBg : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'}
        `}>
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className={`
              font-semibold text-sm transition-colors duration-200
              ${selected ? 'text-gray-900' : 'text-gray-700'}
            `}>
              {name}
            </h3>
            {locked && <Lock className="w-3.5 h-3.5 text-amber-600" />}
          </div>
          <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
            {description}
          </p>
          {locked && requiredPlan && (
            <span className="mt-2 inline-flex rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              Requires {requiredPlan} plan
            </span>
          )}
        </div>

        {/* Toggle indicator */}
        <div className={`
          w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
          transition-all duration-300
          ${selected 
            ? `${colors.check} border-transparent` 
            : 'border-gray-300 bg-white'
          }
        `}>
          {selected && (
            <Check className="w-3 h-3 text-white animate-check-in" />
          )}
        </div>
      </div>

      {/* Hover glow effect */}
      <div className={`
        absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300
        ${selected ? '' : 'group-hover:opacity-100'}
        bg-gradient-to-r from-emerald-500/5 to-sky-500/5
      `} />

      <style>{`
        @keyframes check-in {
          0% { transform: scale(0) rotate(-45deg); opacity: 0; }
          50% { transform: scale(1.3) rotate(0deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        
        .animate-check-in {
          animation: check-in 0.3s ease-out forwards;
        }
      `}</style>
    </Button>
  );
};

export default ModuleCard;
