import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '../components/MultiTenantAuthProvider';
import Sidebar from '../components/Sidebar';
import ModernPageHeader from '../components/ModernPageHeader';
import { Building2, BookOpen, Plus, Filter, CheckCircle2, Clock, FileEdit, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Module } from '../types';
import { withRouteProtection } from '../components/authorization/withRouteProtection';
import { useJournalEntries, useJournalStats, useJournalEntry } from '../hooks/useJournalEntries';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';

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

const AppContent: React.FC = () => {
  const { currentOrganization } = useAuth();
  const [activeModule, setActiveModule] = useState('accounting');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [modules, _setModules] = useState(mockModules);

  // Real data from database
  const { data: journalEntries = [], isLoading, error } = useJournalEntries();
  const stats = useJournalStats();
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const { data: selectedEntry, isLoading: isEntryLoading } = useJournalEntry(selectedEntryId);
  const isDrawerOpen = !!selectedEntryId;

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

  const formatDate = (value: string | null) => {
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
        return <FileEdit className="h-4 w-4" />;
      default:
        return null;
    }
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
              { icon: BookOpen, label: 'Journal Entries', isActive: true }
            ]}
            title="Journal Entries"
            subtitle="Manage general ledger journal entries"
          />

          <div className="p-6 space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">All Journal Entries</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  View and manage your general ledger journal entries
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Entry
                </Button>
              </div>
            </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Entries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Posted
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
                  Draft
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
                  Total Debits
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
              <CardTitle>All Journal Entries</CardTitle>
              <CardDescription>
                View and manage your general ledger journal entries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        Entry #
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        Entry Date
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        Posting Date
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        Reference
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        Debit
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        Credit
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        Status
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
                          {new Date(entry.entry_date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {entry.posting_date || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm text-gray-900 dark:text-white">
                              {entry.reference_type}
                            </span>
                            {entry.reference_number && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {entry.reference_number}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-medium text-gray-900 dark:text-white">
                          MAD {Number(entry.total_debit).toLocaleString('fr-FR')}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-medium text-gray-900 dark:text-white">
                          MAD {Number(entry.total_credit).toLocaleString('fr-FR')}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                            {getStatusIcon(entry.status)}
                            {entry.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedEntryId(entry.id)}>
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {journalEntries.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-gray-500 dark:text-gray-400">
                          Aucune écriture comptable trouvée. Les écritures sont créées automatiquement lors de la comptabilisation des factures et paiements.
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
                  Double-Entry Bookkeeping
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  All journal entries follow the double-entry principle: <strong>Total Debits = Total Credits</strong>.
                  This ensures your books are always balanced and maintains the accounting equation.
                </p>
              </CardContent>
            </Card>
          </div>
          </div>
        </main>
      </div>

      <Drawer open={isDrawerOpen} onOpenChange={(open) => {
        if (!open) {
          closeDrawer();
        }
      }}>
        <DrawerContent side="right" className="max-w-xl w-full">
          <DrawerHeader>
            <DrawerTitle>
              {selectedEntry ? `Journal Entry ${selectedEntry.entry_number}` : 'Journal Entry'}
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
                      {selectedEntry.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Date d'écriture</p>
                    <p className="font-medium text-gray-900 dark:text-white">{formatDate(selectedEntry.entry_date)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Date comptable</p>
                    <p className="font-medium text-gray-900 dark:text-white">{formatDate(selectedEntry.posting_date)}</p>
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
            <Button variant="outline" onClick={closeDrawer}>
              Fermer
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export const Route = createFileRoute('/accounting-journal')({
  component: withRouteProtection(AppContent, 'read', 'JournalEntry'),
});
