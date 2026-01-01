import React from 'react';
import { Bot, Sparkles, CheckCircle2 } from 'lucide-react';
import type { AIProvider, AIProviderInfo } from '../../lib/api/ai-reports';

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
};

const defaultProviderInfo = {
  name: 'Unknown Provider',
  description: 'Provider not configured',
};

export const AIProviderSelector: React.FC<AIProviderSelectorProps> = ({
  providers,
  selectedProvider,
  onSelect,
  disabled = false,
}) => {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Fournisseur IA
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {providers.map((provider) => {
          const isSelected = selectedProvider === provider.provider;
          const isAvailable = provider.available;
          const info = providerLabels[provider.provider] || defaultProviderInfo;
          const icon = providerIcons[provider.provider] || <Bot className="w-6 h-6" />;

          return (
            <button
              key={provider.provider}
              type="button"
              onClick={() => isAvailable && onSelect(provider.provider)}
              disabled={disabled || !isAvailable}
              className={`relative flex items-start p-4 border-2 rounded-xl transition-all ${
                isSelected
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : isAvailable
                  ? 'border-gray-200 dark:border-gray-600 hover:border-green-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-60 cursor-not-allowed'
              }`}
            >
              <div
                className={`flex-shrink-0 p-2 rounded-lg ${
                  isSelected
                    ? 'bg-green-100 text-green-600 dark:bg-green-800 dark:text-green-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                }`}
              >
                {icon}
              </div>
              <div className="ml-3 flex-1 text-left">
                <div className="flex items-center justify-between">
                  <span
                    className={`font-medium ${
                      isSelected
                        ? 'text-green-700 dark:text-green-400'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {info.name}
                  </span>
                  {isSelected && (
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {info.description}
                </p>
                {!isAvailable && (
                  <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                    Non configuré
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AIProviderSelector;
