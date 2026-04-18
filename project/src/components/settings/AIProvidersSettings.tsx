import React, { useState } from 'react';
import {
  Bot,
  Sparkles,
  Zap,
  Eye,
  EyeOff,
  Trash2,
  Save,
  Loader2,
  CheckCircle,
  XCircle,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useOrganizationAISettings,
  useUpsertAIProvider,
  useDeleteAIProvider,
  useToggleAIProvider,
  type AIProviderType,
} from '../../hooks/useOrganizationAISettings';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface ProviderConfig {
  id: AIProviderType;
  name: string;
  description: string;
  icon: React.ReactNode;
  placeholder: string;
  docsUrl: string;
}

const providers: ProviderConfig[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4 Turbo pour des analyses détaillées et des recommandations précises',
    icon: <Bot className="w-6 h-6" />,
    placeholder: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'IA multimodale de Google pour une compréhension contextuelle avancée',
    icon: <Sparkles className="w-6 h-6" />,
    placeholder: 'AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    docsUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    id: 'groq',
    name: 'Groq',
    description: 'LLaMA 3.3 70B ultra-rapide pour des réponses instantanées',
    icon: <Zap className="w-6 h-6" />,
    placeholder: 'gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    docsUrl: 'https://console.groq.com/keys',
  },
];

export const AIProvidersSettings = () => {
  const { t } = useTranslation();
  const { data: settings = [], isLoading } = useOrganizationAISettings();
  const upsertMutation = useUpsertAIProvider();
  const deleteMutation = useDeleteAIProvider();
  const toggleMutation = useToggleAIProvider();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction] = useState<{title:string;description?:string;variant?:"destructive"|"default";onConfirm:()=>void}>({title:"",onConfirm:()=>{}});

  const [apiKeys, setApiKeys] = useState<Record<AIProviderType, string>>({
    openai: '',
    gemini: '',
    groq: '',
  });
  const [showKeys, setShowKeys] = useState<Record<AIProviderType, boolean>>({
    openai: false,
    gemini: false,
    groq: false,
  });
  const [editingProvider, setEditingProvider] = useState<AIProviderType | null>(null);

  const getProviderSettings = (providerId: AIProviderType) => {
    return settings.find((s) => s.provider === providerId);
  };

  const handleSaveKey = async (providerId: AIProviderType) => {
    const key = apiKeys[providerId];
    if (!key.trim()) return;

    try {
      await upsertMutation.mutateAsync({
        provider: providerId,
        api_key: key,
        enabled: true,
      });
      setApiKeys((prev) => ({ ...prev, [providerId]: '' }));
      setEditingProvider(null);
    } catch (error) {
      console.error('Failed to save API key:', error);
    }
  };

  const handleDeleteKey = async (providerId: AIProviderType) => {
    if (!confirm(t('aiSettings.confirmDelete', 'Êtes-vous sûr de vouloir supprimer cette clé API ?'))) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(providerId);
    } catch (error) {
      console.error('Failed to delete API key:', error);
    }
  };

  const handleToggle = async (providerId: AIProviderType, enabled: boolean) => {
    try {
      await toggleMutation.mutateAsync({ provider: providerId, enabled });
    } catch (error) {
      console.error('Failed to toggle provider:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">
          {t('aiSettings.loading', 'Chargement des paramètres IA...')}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
          <Bot className="w-5 h-5 text-green-600" />
          <span>{t('aiSettings.title', 'Fournisseurs IA')}</span>
        </h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {t(
            'aiSettings.description',
            'Configurez vos clés API pour activer les rapports IA sur vos parcelles.'
          )}
        </p>
      </div>

      {/* Security Notice */}
      <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
            {t('aiSettings.securityTitle', 'Stockage sécurisé')}
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
            {t(
              'aiSettings.securityDescription',
              'Vos clés API sont chiffrées avec AES-256-GCM avant d\'être stockées. Elles ne sont jamais exposées en clair.'
            )}
          </p>
        </div>
      </div>

      {/* Providers List */}
      <div className="space-y-4">
        {providers.map((provider) => {
          const setting = getProviderSettings(provider.id);
          const isEditing = editingProvider === provider.id;
          const isPending =
            upsertMutation.isPending ||
            deleteMutation.isPending ||
            toggleMutation.isPending;

          return (
            <div
              key={provider.id}
              className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
            >
              {/* Provider Header */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center space-x-4">
                  <div
                    className={`p-2 rounded-lg ${
                      setting?.configured
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {provider.icon}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {provider.name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {provider.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {setting?.configured && (
                    <>
                      {/* Status Badge */}
                      <span
                        className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          setting.enabled
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }`}
                      >
                        {setting.enabled ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            <span>{t('aiSettings.enabled', 'Activé')}</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" />
                            <span>{t('aiSettings.disabled', 'Désactivé')}</span>
                          </>
                        )}
                      </span>

                      {/* Toggle Switch */}
                      <Button
                        onClick={() => handleToggle(provider.id, !setting.enabled)}
                        disabled={isPending}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          setting.enabled
                            ? 'bg-green-500'
                            : 'bg-gray-300 dark:bg-gray-600'
                        } disabled:opacity-50`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            setting.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Provider Body */}
              <div className="p-4 bg-white dark:bg-gray-900">
                {setting?.configured && !isEditing ? (
                  <div className="space-y-3">
                    {/* Masked Key Display */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {t('aiSettings.apiKey', 'Clé API')}
                        </span>
                        <p className="font-mono text-sm text-gray-900 dark:text-white">
                          {setting.masked_key || '••••••••••••••••'}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => setEditingProvider(provider.id)}
                          className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          {t('aiSettings.update', 'Modifier')}
                        </Button>
                        <Button
                          onClick={() => handleDeleteKey(provider.id)}
                          disabled={isPending}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Last Updated */}
                    {setting.updated_at && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('aiSettings.lastUpdated', 'Dernière mise à jour')}:{' '}
                        {new Date(setting.updated_at).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* API Key Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('aiSettings.enterApiKey', 'Entrez votre clé API')}
                      </label>
                      <div className="relative">
                        <input
                          type={showKeys[provider.id] ? 'text' : 'password'}
                          value={apiKeys[provider.id]}
                          onChange={(e) =>
                            setApiKeys((prev) => ({
                              ...prev,
                              [provider.id]: e.target.value,
                            }))
                          }
                          placeholder={provider.placeholder}
                          className="w-full pl-4 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                        />
                        <Button
                          type="button"
                          onClick={() =>
                            setShowKeys((prev) => ({
                              ...prev,
                              [provider.id]: !prev[provider.id],
                            }))
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          {showKeys[provider.id] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <a
                        href={provider.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {t('aiSettings.getApiKey', 'Obtenir une clé API')} →
                      </a>
                      <div className="flex items-center space-x-2">
                        {isEditing && (
                          <Button
                            onClick={() => {
                              setEditingProvider(null);
                              setApiKeys((prev) => ({ ...prev, [provider.id]: '' }));
                            }}
                            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            {t('app.cancel', 'Annuler')}
                          </Button>
                        )}
                        <Button variant="green"
                          onClick={() => handleSaveKey(provider.id)}
                          disabled={!apiKeys[provider.id].trim() || isPending}
                          className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed"
                        >
                          {upsertMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          <span>{t('app.save', 'Enregistrer')}</span>
                        </Button>
                      </div>
                    </div>

                    {/* Error Display */}
                    {upsertMutation.isError && (
                      <div className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {(upsertMutation.error as Error)?.message ||
                            t('aiSettings.saveError', 'Erreur lors de l\'enregistrement')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction.title}
        description={confirmAction.description}
        variant={confirmAction.variant}
        onConfirm={confirmAction.onConfirm}
      />
    </div>
  );
};

export default AIProvidersSettings;
