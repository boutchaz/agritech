import React from 'react';
import { Bot, Sparkles, CheckCircle2 } from 'lucide-react';
import type { AIProvider, AIProviderInfo } from '../../lib/api/ai-reports';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AIProviderSelectorProps {
  providers: AIProviderInfo[];
  selectedProvider: AIProvider | null;
  onSelect: (provider: AIProvider) => void;
  disabled?: boolean;
}

const providerIcons: Record<string, React.ReactNode> = {
  openai: <Bot className="w-6 h-6" />,
  gemini: <Sparkles className="w-6 h-6" />,
  groq: <Bot className="w-6 h-6" />,
  zai: <Bot className="w-6 h-6" />,
};

const providerLabels: Record<string, { name: string; description: string }> = {
  openai: {
    name: 'OpenAI GPT-4',
    description: 'Modèle avancé pour des analyses détaillées',
  },
  gemini: {
    name: 'Google Gemini',
    description: 'IA multimodale de Google',
  },
  groq: {
    name: 'Groq',
    description: 'IA ultra-rapide avec Llama',
  },
  zai: {
    name: 'Platform AI',
    description: 'Intelligence artificielle de la plateforme',
  },
};

const defaultProviderInfo = {
  name: 'Unknown Provider',
  description: 'Provider not configured',
};

export const AIProviderSelector = ({
  providers,
  selectedProvider,
  onSelect,
  disabled = false,
}: AIProviderSelectorProps) => {
  // Filter out zai if not available, but keep it if available (it's our platform AI)
  const displayProviders = providers.filter((p) => p.provider !== 'zai' || p.available);
  
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Fournisseur IA
      </label>
      <div className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2">
        {displayProviders.map((provider) => {
          const isSelected = selectedProvider === provider.provider;
          const isAvailable = provider.available;
          const info = providerLabels[provider.provider] || defaultProviderInfo;
          const icon = providerIcons[provider.provider] || <Bot className="h-6 w-6" aria-hidden />;

          return (
            <Button
              key={provider.provider}
              type="button"
              variant="ghost"
              onClick={() => isAvailable && onSelect(provider.provider)}
              disabled={disabled || !isAvailable}
              className={cn(
                // Button defaults include h-10 + whitespace-nowrap — breaks multi-line grid cards
                'relative flex h-auto min-h-0 w-full items-start justify-start gap-3 whitespace-normal rounded-xl border-2 p-4 text-left align-top font-normal shadow-none hover:bg-transparent [&_svg]:h-6 [&_svg]:w-6 [&_svg]:shrink-0',
                isSelected &&
                  'border-emerald-500 bg-emerald-50 dark:border-emerald-500/80 dark:bg-emerald-950/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/40',
                isAvailable &&
                  !isSelected &&
                  'border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-900/40 hover:border-emerald-300 hover:bg-slate-50 dark:hover:border-emerald-600/50 dark:hover:bg-slate-800/80',
                !isAvailable &&
                  'cursor-not-allowed border-slate-100 bg-slate-50 opacity-70 dark:border-slate-700 dark:bg-slate-800/80'
              )}
            >
              <div
                className={cn(
                  'shrink-0 rounded-lg p-2',
                  isSelected
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                )}
              >
                {icon}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      'font-medium leading-snug',
                      isSelected
                        ? 'text-emerald-800 dark:text-emerald-200'
                        : 'text-slate-900 dark:text-white'
                    )}
                  >
                    {info.name}
                  </span>
                  {isSelected && (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  )}
                </div>
                <p className="mt-1 text-sm leading-snug text-slate-500 dark:text-slate-400">
                  {info.description}
                </p>
                {!isAvailable && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">Non configuré</p>
                )}
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default AIProviderSelector;
