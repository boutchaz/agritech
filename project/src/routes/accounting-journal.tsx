import React, { useState, useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '../components/MultiTenantAuthProvider';
import Sidebar from '../components/Sidebar';
import ModernPageHeader from '../components/ModernPageHeader';
import { Building2, BookOpen, Plus, Filter, CheckCircle2, Clock, XCircle, Loader2, Trash2, Send, MoreHorizontal, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Module } from '../types';
import { withRouteProtection } from '../components/authorization/withRouteProtection';
import {
  useJournalEntries,
  useJournalStats,
  useJournalEntry,
  useCreateJournalEntry,
  usePostJournalEntry,
  useCancelJournalEntry,
  useDeleteJournalEntry,
  type CreateJournalEntryInput,
  type JournalEntryFilters,
} from '../hooks/useJournalEntries';
import { useAccounts } from '../hooks/useAccounts';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/ui/FormField';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';

const mockModules: Module[] = [
  {
    id: 'fruit-trees',
    name: 'Arbres Fruitiers',
    icon: 'Tree',
    active: true,
    category: 'agriculture',
    description: 'Gérez vos vergers',
    metrics: [
      { name: 'Rendement', value: 12.5, unit: 't/ha', trend: 'up' },
      { name: 'Irrigation', value: 850, unit: 'm³/ha', trend: 'stable' }
    ]
  },
];

interface JournalLineInput {
  account_id: string;
  debit: number;
  credit: number;
  description: string;
}

const emptyLine: JournalLineInput = {
  account_id: '',
  debit: 0,
  credit: 0,
  description: '',
};

const AppContent: React.FC = () => {
  const { currentOrganization } = useAuth();
  const [activeModule, setActiveModule] = useState('accounting');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [modules, _setModules] = useState(mockModules);

  // Filters state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<JournalEntryFilters>({});

  // Real data from database
  const { data: journalEntries = [], isLoading, error, refetch } = useJournalEntries(filters);
  const stats = useJournalStats();
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const { data: selectedEntry, isLoading: isEntryLoading } = useJournalEntry(selectedEntryId);
  const isDrawerOpen = !!selectedEntryId;

  // Accounts for dropdown
  const { data: accounts = [] } = useAccounts();
  const activeAccounts = useMemo(() =>
    accounts.filter((a: any) => a.is_active && !a.is_group),
    [accounts]
  );

  // Create entry modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEntry, setNewEntry] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    remarks: '',
    reference_type: '',
    reference_number: '',
  });
  const [lines, setLines] = useState<JournalLineInput[]>([{ ...emptyLine }, { ...emptyLine }]);
  const [createError, setCreateError] = useState<string | null>(null);

  // Mutations
  const createMutation = useCreateJournalEntry();
  const postMutation = usePostJournalEntry();
  const cancelMutation = useCancelJournalEntry();
  const deleteMutation = useDeleteJournalEntry();

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const formatAmount = (value: number) => {
    return `MAD ${Number(value || 0).toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (value: string | null | undefined) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('fr-FR');
  };

  const closeDrawer = () => setSelectedEntryId(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'posted':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'posted':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'draft':
        return <Clock className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'posted': return 'Comptabilisé';
      case 'draft': return 'Brouillon';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };

  // Calculate totals for new entry
  const totalDebit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const addLine = () => {
    setLines([...lines, { ...emptyLine }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index: number, field: keyof JournalLineInput, value: string | number) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const resetCreateForm = () => {
    setNewEntry({
      entry_date: new Date().toISOString().split('T')[0],
      remarks: '',
      reference_type: '',
      reference_number: '',
    });
    setLines([{ ...emptyLine }, { ...emptyLine }]);
    setCreateError(null);
  };

  const handleCreateEntry = async () => {
    setCreateError(null);

    // Validate
    if (!newEntry.entry_date) {
      setCreateError('La date est requise');
      return;
    }

    const validLines = lines.filter(l => l.account_id && (l.debit > 0 || l.credit > 0));
    if (validLines.length < 2) {
      setCreateError('Au moins 2 lignes avec un compte et un montant sont requises');
      return;
    }

    if (!isBalanced) {
      setCreateError(`L'écriture n'est pas équilibrée: Débit (${totalDebit.toFixed(2)}) ≠ Crédit (${totalCredit.toFixed(2)})`);
      return;
    }

    const payload: CreateJournalEntryInput = {
      entry_date: newEntry.entry_date,
      remarks: newEntry.remarks || undefined,
      reference_type: newEntry.reference_type || undefined,
      reference_number: newEntry.reference_number || undefined,
      items: validLines.map(l => ({
        account_id: l.account_id,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        description: l.description || undefined,
      })),
    };

    try {
      await createMutation.mutateAsync(payload);
      setShowCreateModal(false);
      resetCreateForm();
    } catch (err: any) {
      setCreateError(err.message || 'Erreur lors de la création');
    }
  };

  const handlePostEntry = async (id: string) => {
    try {
      await postMutation.mutateAsync(id);
      closeDrawer();
    } catch (err: any) {
      console.error('Error posting entry:', err);
    }
  };

  const handleCancelEntry = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette écriture ?')) return;
    try {
      await cancelMutation.mutateAsync(id);
      closeDrawer();
    } catch (err: any) {
      console.error('Error cancelling entry:', err);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette écriture ? Cette action est irréversible.')) return;
    try {
      await deleteMutation.mutateAsync(id);
      closeDrawer();
    } catch (err: any) {
      console.error('Error deleting entry:', err);
    }
  };

  const clearFilters = () => {
    setFilters({});
  };

  if (!currentOrganization || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {!currentOrganization ? 'Chargement de l\'organisation...' : 'Chargement des écritures...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400">Erreur lors du chargement des écritures</p>
          <p className="text-sm text-gray-500 mt-2">{error instanceof Error ? error.message : 'Erreur inconnue'}</p>
          <Button onClick={() => refetch()} className="mt-4">Réessayer</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`flex min-h-screen ${isDarkMode ? 'dark' : ''}`}>
        <Sidebar
          modules={modules.filter(m => m.active)}
          activeModule={activeModule}
          onModuleChange={setActiveModule}
          isDarkMode={isDarkMode}
          onThemeToggle={toggleTheme}
        />
        <main className="flex-1 bg-gray-50 dark:bg-gray-900 w-full lg:w-auto">
          <ModernPageHeader
            breadcrumbs={[
              { icon: Building2, label: currentOrganization.name, path: '/settings/organization' },
              { icon: BookOpen, label: 'Journal Comptable', isActive: true }
            ]}
            title="Journal Comptable"
            subtitle="Gérer les écritures du grand livre"
          />

          <div className="p-6 space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Écritures Comptables</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Consultez et gérez vos écritures du grand livre
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className={showFilters ? 'bg-blue-50 border-blue-300' : ''}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filtres
                  {Object.keys(filters).length > 0 && (
                    <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
                      {Object.keys(filters).length}
                    </span>
                  )}
                </Button>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle Écriture
                </Button>
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Statut
                      </label>
                      <select
                        value={filters.status || ''}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value as any || undefined })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      >
                        <option value="">Tous</option>
                        <option value="draft">Brouillon</option>
                        <option value="posted">Comptabilisé</option>
                        <option value="cancelled">Annulé</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Date début
                      </label>
                      <input
                        type="date"
                        value={filters.date_from || ''}
                        onChange={(e) => setFilters({ ...filters, date_from: e.target.value || undefined })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Date fin
                      </label>
                      <input
                        type="date"
                        value={filters.date_to || ''}
                        onChange={(e) => setFilters({ ...filters, date_to: e.target.value || undefined })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button variant="outline" onClick={clearFilters} className="w-full">
                        <X className="mr-2 h-4 w-4" />
                        Effacer
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Écritures
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Comptabilisées
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats.posted}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Brouillons
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">
                  {stats.draft}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Débits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  MAD {stats.totalDebit.toLocaleString('fr-FR')}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Journal Entry List */}
          <Card>
            <CardHeader>
              <CardTitle>Toutes les Écritures</CardTitle>
              <CardDescription>
                Consultez et gérez vos écritures du grand livre
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        N° Écriture
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        Date
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        Comptabilisé le
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        Référence
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        Débit
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        Crédit
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        Statut
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {journalEntries.map((entry) => (
                      <tr key={entry.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {entry.entry_number}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(entry.entry_date)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(entry.posted_at)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm text-gray-900 dark:text-white">
                              {entry.reference_type || '-'}
                            </span>
                            {entry.reference_number && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {entry.reference_number}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-medium text-gray-900 dark:text-white">
                          {formatAmount(entry.total_debit)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-medium text-gray-900 dark:text-white">
                          {formatAmount(entry.total_credit)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                            {getStatusIcon(entry.status)}
                            {getStatusLabel(entry.status)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedEntryId(entry.id)}>
                              Voir
                            </Button>
                            {entry.status === 'draft' && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handlePostEntry(entry.id)}>
                                    <Send className="mr-2 h-4 w-4" />
                                    Comptabiliser
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteEntry(entry.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {journalEntries.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-gray-500 dark:text-gray-400">
                          Aucune écriture comptable trouvée. Les écritures sont créées automatiquement lors de la comptabilisation des factures et paiements, ou manuellement via le bouton "Nouvelle Écriture".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Double-Entry Principle */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Comptabilité en Partie Double
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Toutes les écritures suivent le principe de la partie double: <strong>Total Débits = Total Crédits</strong>.
                  Cela garantit que vos livres sont toujours équilibrés et maintient l'équation comptable.
                </p>
              </CardContent>
            </Card>
          </div>
          </div>
        </main>
      </div>

      {/* View Entry Drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={(open) => {
        if (!open) {
          closeDrawer();
        }
      }}>
        <DrawerContent side="right" className="max-w-xl w-full">
          <DrawerHeader>
            <DrawerTitle>
              {selectedEntry ? `Écriture ${selectedEntry.entry_number}` : 'Écriture Comptable'}
            </DrawerTitle>
            <DrawerDescription>
              {selectedEntry
                ? `Enregistrée le ${formatDate(selectedEntry.entry_date)}`
                : 'Chargement des détails de l\'écriture'}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-6 pb-6 space-y-6">
            {isEntryLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
              </div>
            ) : selectedEntry ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Numéro</p>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedEntry.entry_number}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Statut</p>
                    <span className={`mt-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedEntry.status)}`}>
                      {getStatusIcon(selectedEntry.status)}
                      {getStatusLabel(selectedEntry.status)}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Date d'écriture</p>
                    <p className="font-medium text-gray-900 dark:text-white">{formatDate(selectedEntry.entry_date)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Date comptable</p>
                    <p className="font-medium text-gray-900 dark:text-white">{formatDate(selectedEntry.posted_at)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Référence</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedEntry.reference_type || '—'}
                    </p>
                    {selectedEntry.reference_number && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {selectedEntry.reference_number}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Remarques</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedEntry.remarks || '—'}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Lignes comptables</h3>
                  <div className="mt-3 space-y-3">
                    {selectedEntry.lines && selectedEntry.lines.length > 0 ? (
                      selectedEntry.lines.map((line) => (
                        <div
                          key={line.id}
                          className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-3"
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {line.account
                                ? `${line.account.code} · ${line.account.name}`
                                : 'Compte introuvable'}
                            </p>
                            {line.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {line.description}
                              </p>
                            )}
                          </div>
                          <div className="text-right text-sm font-semibold text-gray-800 dark:text-gray-200 space-y-1">
                            {line.debit > 0 && (
                              <div className="text-emerald-600 dark:text-emerald-400">
                                Débit {formatAmount(line.debit)}
                              </div>
                            )}
                            {line.credit > 0 && (
                              <div className="text-sky-600 dark:text-sky-400">
                                Crédit {formatAmount(line.credit)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-md border border-dashed border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-500 dark:text-gray-400">
                        Aucune ligne comptable n'est associée à cette écriture.
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Total Débit</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatAmount(selectedEntry.total_debit)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Total Crédit</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatAmount(selectedEntry.total_credit)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-md border border-dashed border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-500 dark:text-gray-400">
                Impossible de charger les détails de cette écriture.
              </div>
            )}
          </div>
          <DrawerFooter className="px-6 pb-6">
            <div className="flex gap-2 w-full">
              {selectedEntry?.status === 'draft' && (
                <>
                  <Button
                    onClick={() => handlePostEntry(selectedEntry.id)}
                    disabled={postMutation.isPending}
                    className="flex-1"
                  >
                    {postMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Comptabiliser
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteEntry(selectedEntry.id)}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </>
              )}
              {selectedEntry?.status === 'posted' && (
                <Button
                  variant="outline"
                  onClick={() => handleCancelEntry(selectedEntry.id)}
                  disabled={cancelMutation.isPending}
                  className="flex-1 text-red-600 hover:text-red-700"
                >
                  {cancelMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="mr-2 h-4 w-4" />
                  )}
                  Annuler l'écriture
                </Button>
              )}
              <Button variant="outline" onClick={closeDrawer}>
                Fermer
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Create Entry Dialog */}
      <Dialog open={showCreateModal} onOpenChange={(open) => {
        if (!open) {
          setShowCreateModal(false);
          resetCreateForm();
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle Écriture Comptable</DialogTitle>
            <DialogDescription>
              Créez une nouvelle écriture en partie double. Le total des débits doit égaler le total des crédits.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {createError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            )}

            {/* Header Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Date *" htmlFor="entry_date">
                <Input
                  id="entry_date"
                  type="date"
                  value={newEntry.entry_date}
                  onChange={(e) => setNewEntry({ ...newEntry, entry_date: (e.target as HTMLInputElement).value })}
                  required
                />
              </FormField>
              <FormField label="Type de référence" htmlFor="reference_type">
                <Input
                  id="reference_type"
                  value={newEntry.reference_type}
                  onChange={(e) => setNewEntry({ ...newEntry, reference_type: (e.target as HTMLInputElement).value })}
                  placeholder="Ex: Facture, Paiement, Ajustement..."
                />
              </FormField>
              <FormField label="Numéro de référence" htmlFor="reference_number">
                <Input
                  id="reference_number"
                  value={newEntry.reference_number}
                  onChange={(e) => setNewEntry({ ...newEntry, reference_number: (e.target as HTMLInputElement).value })}
                  placeholder="Ex: FAC-001"
                />
              </FormField>
              <FormField label="Remarques" htmlFor="remarks">
                <Textarea
                  id="remarks"
                  value={newEntry.remarks}
                  onChange={(e) => setNewEntry({ ...newEntry, remarks: (e.target as HTMLTextAreaElement).value })}
                  placeholder="Description ou notes..."
                  rows={1}
                />
              </FormField>
            </div>

            {/* Lines */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Lignes comptables</h3>
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  <Plus className="mr-1 h-4 w-4" />
                  Ajouter
                </Button>
              </div>

              <div className="space-y-3">
                {lines.map((line, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-start p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="col-span-5">
                      <label className="block text-xs text-gray-500 mb-1">Compte</label>
                      <select
                        value={line.account_id}
                        onChange={(e) => updateLine(index, 'account_id', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Sélectionner...</option>
                        {activeAccounts.map((account: any) => (
                          <option key={account.id} value={account.id}>
                            {account.code} - {account.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Débit</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.debit || ''}
                        onChange={(e) => updateLine(index, 'debit', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Crédit</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.credit || ''}
                        onChange={(e) => updateLine(index, 'credit', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Description</label>
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => updateLine(index, 'description', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Libellé..."
                      />
                    </div>
                    <div className="col-span-1 flex items-end pb-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLine(index)}
                        disabled={lines.length <= 2}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium">Totaux:</span>
                  <div className="flex gap-8">
                    <span className={`font-semibold ${totalDebit > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                      Débit: {formatAmount(totalDebit)}
                    </span>
                    <span className={`font-semibold ${totalCredit > 0 ? 'text-sky-600' : 'text-gray-400'}`}>
                      Crédit: {formatAmount(totalCredit)}
                    </span>
                  </div>
                </div>
                {!isBalanced && totalDebit + totalCredit > 0 && (
                  <p className="text-xs text-red-500 mt-2">
                    L'écriture n'est pas équilibrée. Différence: {formatAmount(Math.abs(totalDebit - totalCredit))}
                  </p>
                )}
                {isBalanced && totalDebit > 0 && (
                  <p className="text-xs text-green-500 mt-2">
                    ✓ L'écriture est équilibrée
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateModal(false);
              resetCreateForm();
            }}>
              Annuler
            </Button>
            <Button
              onClick={handleCreateEntry}
              disabled={createMutation.isPending || !isBalanced || totalDebit === 0}
            >
              {createMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Créer l'écriture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const Route = createFileRoute('/accounting-journal')({
  component: withRouteProtection(AppContent, 'read', 'JournalEntry'),
});
