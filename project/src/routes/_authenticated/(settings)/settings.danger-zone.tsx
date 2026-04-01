import { createFileRoute } from '@tanstack/react-router';
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { OrganizationRequiredError } from '@/lib/errors';
import { escapeHtml } from '@/lib/sanitize';
import { toast } from 'sonner';
import { demoDataApi, ExportData } from '@/lib/api/demo-data';
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
  Download,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const STAT_ICONS: Record<string, React.ElementType> = {
  farms: MapPin,
  parcels: MapPin,
  workers: Users,
  tasks: ClipboardList,
  harvest_records: Package,
  reception_batches: Package,
  warehouses: Warehouse,
  items: Package,
  item_groups: Package,
  customers: Users,
  suppliers: Users,
  quotes: FileText,
  sales_orders: FileText,
  purchase_orders: FileText,
  invoices: FileText,
  payments: DollarSign,
  journal_entries: FileText,
  utilities: DollarSign,
  costs: DollarSign,
  revenues: DollarSign,
  structures: Warehouse,
  cost_centers: DollarSign,
  stock_entries: Package,
};

function DangerZonePage() {
  const { t } = useTranslation();
  const { currentOrganization, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [confirmText, setConfirmText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteDemoConfirm, setShowDeleteDemoConfirm] = useState(false);
  const [showSeedConfirm, setShowSeedConfirm] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<ExportData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = userRole?.role_name === 'system_admin' || userRole?.role_name === 'organization_admin';
  const organizationId = currentOrganization?.id;

  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['demo-data-stats', organizationId],
    queryFn: () => {
      if (!organizationId) throw new OrganizationRequiredError();
      return demoDataApi.getStats(organizationId);
    },
    enabled: !!organizationId && isAdmin,
  });

  const seedMutation = useMutation({
    mutationFn: () => {
      if (!organizationId) throw new OrganizationRequiredError();
      return demoDataApi.seedDemoData(organizationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      refetchStats();
      setShowSeedConfirm(false);
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => {
      if (!organizationId) throw new OrganizationRequiredError();
      return demoDataApi.clearData(organizationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      refetchStats();
      setShowDeleteConfirm(false);
      setConfirmText('');
    },
  });

  const clearDemoOnlyMutation = useMutation({
    mutationFn: () => {
      if (!organizationId) throw new OrganizationRequiredError();
      return demoDataApi.clearDemoDataOnly(organizationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      refetchStats();
      setShowDeleteDemoConfirm(false);
      toast.success(t('dangerZone.deleteDemoOnly.success'));
    },
    onError: () => {
      toast.error(t('dangerZone.deleteDemoOnly.error'));
    },
  });

  const exportMutation = useMutation({
    mutationFn: () => {
      if (!organizationId) throw new OrganizationRequiredError();
      return demoDataApi.exportData(organizationId);
    },
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agritech-export-${currentOrganization?.name?.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });

  const importMutation = useMutation({
    mutationFn: (data: ExportData) => {
      if (!organizationId) throw new OrganizationRequiredError();
      return demoDataApi.importData(organizationId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      refetchStats();
      setShowImportConfirm(false);
      setImportFile(null);
      setImportData(null);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          setImportData(data);
          setShowImportConfirm(true);
        } catch {
          toast.error(t('dangerZone.exportImport.invalidJsonFile'));
          setImportFile(null);
        }
      };
      reader.readAsText(file);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form when dialog closes
    if (!showDeleteConfirm) setConfirmText('');
  }, [showDeleteConfirm]);

  useEffect(() => {
    if (!showImportConfirm) {
      /* eslint-disable react-hooks/set-state-in-effect -- reset form when dialog closes */
      setImportFile(null);
      setImportData(null);
      /* eslint-enable react-hooks/set-state-in-effect */
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [showImportConfirm]);

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <p className="text-yellow-700 dark:text-yellow-300">
              {t('dangerZone.adminOnly')}
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
          {t('dangerZone.title')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {t('dangerZone.subtitle')}
        </p>
      </div>

      {/* Data Statistics Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-500" />
            {t('dangerZone.stats.title')}
          </h2>
          <Button
            onClick={() => refetchStats()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            disabled={statsLoading}
          >
            <RefreshCw className={`h-4 w-4 text-gray-500 ${statsLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {statsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="p-3 rounded-lg border">
                <div className="h-4 w-16 bg-muted animate-pulse rounded mb-2" />
                <div className="h-6 w-8 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
              {statsData?.stats && Object.entries(statsData.stats).map(([key, count]) => {
                const Icon = STAT_ICONS[key] || Package;
                return (
                  <div
                    key={key}
                    className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 flex items-center gap-2"
                  >
                    <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {t(`dangerZone.stats.${key}`, key)}
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{count}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-center py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalRecords}</p>
              <p className="text-sm text-blue-500 dark:text-blue-300">{t('dangerZone.stats.totalRecords')}</p>
            </div>
          </>
        )}
      </div>

      {/* Export/Import Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800 p-4 sm:p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Database className="h-5 w-5 text-blue-500" />
          {t('dangerZone.exportImport.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          {t('dangerZone.exportImport.description')}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Export */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
              <Download className="h-4 w-4" />
              {t('dangerZone.exportImport.exportTitle')}
            </h3>
            <p className="text-blue-700 dark:text-blue-400 text-sm mb-3">
              {t('dangerZone.exportImport.exportDescription')}
            </p>
            <Button variant="blue"
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending || !hasData}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              {exportMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {t('dangerZone.exportImport.exportButton')}
            </Button>
            {exportMutation.isSuccess && (
              <p className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                {t('dangerZone.exportImport.exportSuccess')}
              </p>
            )}
            {exportMutation.isError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <XCircle className="h-4 w-4" />
                {t('dangerZone.exportImport.exportError')}
              </p>
            )}
          </div>

          {/* Import */}
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <h3 className="font-medium text-purple-900 dark:text-purple-300 mb-2 flex items-center gap-2">
              <Upload className="h-4 w-4" />
              {t('dangerZone.exportImport.importTitle')}
            </h3>
            <p className="text-purple-700 dark:text-purple-400 text-sm mb-3">
              {t('dangerZone.exportImport.importDescription')}
            </p>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button variant="purple"
              onClick={() => fileInputRef.current?.click()}
              disabled={importMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
            >
              {importMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {t('dangerZone.exportImport.importSelectFile')}
            </Button>
          </div>
        </div>

        {/* Import Confirmation Dialog */}
        {showImportConfirm && importData && (
          <div className="mt-4 bg-purple-100 dark:bg-purple-900/40 border border-purple-300 dark:border-purple-700 rounded-lg p-4">
            <h4 className="font-medium text-purple-900 dark:text-purple-300 mb-2">
              {t('dangerZone.exportImport.importConfirmTitle')}
            </h4>
            <p className="text-purple-700 dark:text-purple-400 text-sm mb-2">
              {t('dangerZone.exportImport.importFile')} <strong>{importFile?.name}</strong>
            </p>
            {importData.metadata?.[0] && (
              <p className="text-purple-700 dark:text-purple-400 text-sm mb-2">
                {t('dangerZone.exportImport.importExportDate')} <strong>{new Date(importData.metadata[0].exportDate).toLocaleString()}</strong>
              </p>
            )}
            <p
              className="text-purple-700 dark:text-purple-400 text-sm mb-4"
              dangerouslySetInnerHTML={{ __html: t('dangerZone.exportImport.importWarning') }}
            />
            <div className="flex gap-2">
              <Button variant="purple"
                onClick={() => importMutation.mutate(importData)}
                disabled={importMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
              >
                {importMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {t('dangerZone.exportImport.importConfirmButton')}
              </Button>
              <Button
                onClick={() => setShowImportConfirm(false)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <XCircle className="h-4 w-4" />
                {t('dangerZone.cancel')}
              </Button>
            </div>
            {importMutation.isSuccess && (
              <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/40 rounded-lg">
                <p className="text-green-700 dark:text-green-300 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {t('dangerZone.exportImport.importSuccess', { count: importMutation.data?.totalImported })}
                </p>
              </div>
            )}
            {importMutation.isError && (
              <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/40 rounded-lg">
                <p className="text-red-700 dark:text-red-300 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  {t('dangerZone.exportImport.importError')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Demo Data Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800 p-4 sm:p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-green-500" />
          {t('dangerZone.demoData.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          {t('dangerZone.demoData.description')}
        </p>

        {!showSeedConfirm ? (
          <Button variant="green"
            onClick={() => setShowSeedConfirm(true)}
            disabled={seedMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
          >
            {seedMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            {t('dangerZone.demoData.generateButton')}
          </Button>
        ) : (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-green-700 dark:text-green-300 mb-4">
              {t('dangerZone.demoData.confirmGenerate')}
              {hasData && (
                <span className="block mt-1 text-sm">
                  {t('dangerZone.demoData.existingDataNote', { count: totalRecords })}
                </span>
              )}
            </p>
            <div className="flex gap-2">
              <Button variant="green"
                onClick={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
              >
                {seedMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {t('dangerZone.confirm')}
              </Button>
              <Button
                onClick={() => setShowSeedConfirm(false)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <XCircle className="h-4 w-4" />
                {t('dangerZone.cancel')}
              </Button>
            </div>
            {seedMutation.isSuccess && (
              <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/40 rounded-lg">
                <p className="text-green-700 dark:text-green-300 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {t('dangerZone.demoData.generateSuccess')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Demo Only */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-lg p-4 sm:p-6 mb-6">
        <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          {t('dangerZone.deleteDemoOnly.title')}
        </h2>
        <p className="text-amber-700 dark:text-amber-400 text-sm mb-4">
          {t('dangerZone.deleteDemoOnly.description')}
        </p>

        {!showDeleteDemoConfirm ? (
          <Button variant="amber"
            onClick={() => setShowDeleteDemoConfirm(true)}
            disabled={clearDemoOnlyMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {clearDemoOnlyMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {t('dangerZone.deleteDemoOnly.button')}
          </Button>
        ) : (
          <div className="space-y-4">
            <p className="text-amber-800 dark:text-amber-300">
              {t('dangerZone.deleteDemoOnly.confirmMessage')}
            </p>
            <div className="flex gap-2">
              <Button variant="amber"
                onClick={() => clearDemoOnlyMutation.mutate()}
                disabled={clearDemoOnlyMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                {clearDemoOnlyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {t('dangerZone.confirm')}
              </Button>
              <Button
                onClick={() => setShowDeleteDemoConfirm(false)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <XCircle className="h-4 w-4" />
                {t('dangerZone.cancel')}
              </Button>
            </div>
            {clearDemoOnlyMutation.isSuccess && (
              <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/40 rounded-lg">
                <p className="text-green-700 dark:text-green-300 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {t('dangerZone.deleteDemoOnly.successCount', { count: clearDemoOnlyMutation.data?.totalDeleted })}
                </p>
              </div>
            )}
            {clearDemoOnlyMutation.isError && (
              <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/40 rounded-lg">
                <p className="text-red-700 dark:text-red-300 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  {t('dangerZone.deleteDemoOnly.error')}
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
          {t('dangerZone.deleteAll.title')}
        </h2>
        <p
          className="text-red-600 dark:text-red-400 text-sm mb-4"
          dangerouslySetInnerHTML={{ __html: t('dangerZone.deleteAll.warning') }}
        />

        {!hasData ? (
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              {t('dangerZone.deleteAll.noData')}
            </p>
          </div>
        ) : !showDeleteConfirm ? (
          <Button variant="red"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            {t('dangerZone.deleteAll.button')}
          </Button>
        ) : (
          <div className="space-y-4">
            <p
              className="text-red-700 dark:text-red-300 font-medium"
              dangerouslySetInnerHTML={{ __html: t('dangerZone.deleteAll.confirmPrompt', { name: escapeHtml(currentOrganization?.name || '') }) }}
            />
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={t('dangerZone.deleteAll.confirmPlaceholder')}
              className="w-full px-4 py-2 border border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
            <div className="flex gap-2">
              <Button variant="red"
                onClick={() => clearMutation.mutate()}
                disabled={confirmText !== currentOrganization?.name || clearMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                {clearMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {t('dangerZone.deleteAll.confirmButton')}
              </Button>
              <Button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <XCircle className="h-4 w-4" />
                {t('dangerZone.cancel')}
              </Button>
            </div>
            {clearMutation.isSuccess && (
              <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/40 rounded-lg">
                <p className="text-green-700 dark:text-green-300 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {t('dangerZone.deleteAll.success', { count: clearMutation.data?.totalDeleted })}
                </p>
              </div>
            )}
            {clearMutation.isError && (
              <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/40 rounded-lg">
                <p className="text-red-700 dark:text-red-300 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  {t('dangerZone.deleteAll.error')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/(settings)/settings/danger-zone')({
  component: DangerZonePage,
});
