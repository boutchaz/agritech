import { createFileRoute } from '@tanstack/react-router';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/MultiTenantAuthProvider';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { demoDataApi } from '../lib/api/demo-data';
import {
  AlertTriangle,
  Trash2,
  Database,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  Package,
  Users,
  MapPin,
  ClipboardList,
  Warehouse,
  FileText,
  DollarSign,
} from 'lucide-react';

const STAT_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  farms: { label: 'Fermes', icon: MapPin },
  parcels: { label: 'Parcelles', icon: MapPin },
  workers: { label: 'Travailleurs', icon: Users },
  tasks: { label: 'Tâches', icon: ClipboardList },
  harvest_records: { label: 'Récoltes', icon: Package },
  reception_batches: { label: 'Lots de réception', icon: Package },
  warehouses: { label: 'Entrepôts', icon: Warehouse },
  items: { label: 'Articles', icon: Package },
  item_groups: { label: 'Groupes d\'articles', icon: Package },
  customers: { label: 'Clients', icon: Users },
  suppliers: { label: 'Fournisseurs', icon: Users },
  sales_orders: { label: 'Commandes', icon: FileText },
  invoices: { label: 'Factures', icon: FileText },
  costs: { label: 'Coûts', icon: DollarSign },
  revenues: { label: 'Revenus', icon: DollarSign },
  structures: { label: 'Infrastructures', icon: Warehouse },
  cost_centers: { label: 'Centres de coût', icon: DollarSign },
  stock_entries: { label: 'Mouvements de stock', icon: Package },
};

function DangerZonePage() {
  const { currentOrganization, userRole } = useAuth();
  const _t = useTranslation();
  const queryClient = useQueryClient();
  const [confirmText, setConfirmText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSeedConfirm, setShowSeedConfirm] = useState(false);

  // Check if user is admin
  const isAdmin = userRole?.role_name === 'system_admin' || userRole?.role_name === 'organization_admin';

  const organizationId = currentOrganization?.id;

  // Fetch data stats
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['demo-data-stats', organizationId],
    queryFn: () => {
      if (!organizationId) throw new Error('No organization');
      return demoDataApi.getStats(organizationId);
    },
    enabled: !!organizationId && isAdmin,
  });

  // Seed demo data mutation
  const seedMutation = useMutation({
    mutationFn: () => {
      if (!organizationId) throw new Error('No organization');
      return demoDataApi.seedDemoData(organizationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      refetchStats();
      setShowSeedConfirm(false);
    },
  });

  // Clear data mutation
  const clearMutation = useMutation({
    mutationFn: () => {
      if (!organizationId) throw new Error('No organization');
      return demoDataApi.clearData(organizationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      refetchStats();
      setShowDeleteConfirm(false);
      setConfirmText('');
    },
  });

  // Reset confirm text when dialogs close
  useEffect(() => {
    if (!showDeleteConfirm) {
      setConfirmText('');
    }
  }, [showDeleteConfirm]);

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <p className="text-yellow-700 dark:text-yellow-300">
              Seuls les administrateurs peuvent accéder à cette section.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalRecords = statsData?.total || 0;
  const hasData = totalRecords > 0;

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-red-500" />
          Zone de Danger
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Actions irréversibles sur les données de votre organisation
        </p>
      </div>

      {/* Data Statistics Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-500" />
            Statistiques des Données
          </h2>
          <button
            onClick={() => refetchStats()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            disabled={statsLoading}
          >
            <RefreshCw className={`h-4 w-4 text-gray-500 ${statsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {statsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
              {statsData?.stats && Object.entries(statsData.stats).map(([key, count]) => {
                const info = STAT_LABELS[key] || { label: key, icon: Package };
                const Icon = info.icon;
                return (
                  <div
                    key={key}
                    className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 flex items-center gap-2"
                  >
                    <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{info.label}</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{count}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-center py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalRecords}</p>
              <p className="text-sm text-blue-500 dark:text-blue-300">Enregistrements au total</p>
            </div>
          </>
        )}
      </div>

      {/* Demo Data Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800 p-4 sm:p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-green-500" />
          Données de Démonstration
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          Générez des données de démonstration pour explorer les fonctionnalités de la plateforme.
          Cela créera des fermes, parcelles, travailleurs, tâches, récoltes, factures et plus encore.
        </p>

        {!showSeedConfirm ? (
          <button
            onClick={() => setShowSeedConfirm(true)}
            disabled={seedMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {seedMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            Générer les Données de Démo
          </button>
        ) : (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-green-700 dark:text-green-300 mb-4">
              Êtes-vous sûr de vouloir générer les données de démonstration ?
              {hasData && (
                <span className="block mt-1 text-sm">
                  Note: Vous avez déjà {totalRecords} enregistrements. Les nouvelles données seront ajoutées.
                </span>
              )}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {seedMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Confirmer
              </button>
              <button
                onClick={() => setShowSeedConfirm(false)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <XCircle className="h-4 w-4" />
                Annuler
              </button>
            </div>
            {seedMutation.isSuccess && (
              <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/40 rounded-lg">
                <p className="text-green-700 dark:text-green-300 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Données de démonstration générées avec succès !
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Danger Zone - Delete All Data */}
      <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-800 rounded-lg p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Supprimer Toutes les Données
        </h2>
        <p className="text-red-600 dark:text-red-400 text-sm mb-4">
          <strong>Attention !</strong> Cette action supprimera définitivement toutes les données de votre organisation,
          incluant les fermes, parcelles, travailleurs, tâches, récoltes, factures et toutes les autres données.
          Cette action est <strong>irréversible</strong>.
        </p>

        {!hasData ? (
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              Aucune donnée à supprimer. Votre organisation est vide.
            </p>
          </div>
        ) : !showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer Toutes les Données
          </button>
        ) : (
          <div className="space-y-4">
            <p className="text-red-700 dark:text-red-300 font-medium">
              Pour confirmer, tapez le nom de votre organisation : <strong>{currentOrganization?.name}</strong>
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Tapez le nom de l'organisation"
              className="w-full px-4 py-2 border border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => clearMutation.mutate()}
                disabled={confirmText !== currentOrganization?.name || clearMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {clearMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Supprimer Définitivement
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <XCircle className="h-4 w-4" />
                Annuler
              </button>
            </div>
            {clearMutation.isSuccess && (
              <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/40 rounded-lg">
                <p className="text-green-700 dark:text-green-300 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Toutes les données ont été supprimées. Total supprimé: {clearMutation.data?.totalDeleted} enregistrements.
                </p>
              </div>
            )}
            {clearMutation.isError && (
              <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/40 rounded-lg">
                <p className="text-red-700 dark:text-red-300 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Une erreur s'est produite lors de la suppression des données.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/settings/danger-zone')({
  component: DangerZonePage,
});
