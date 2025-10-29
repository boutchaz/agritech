import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '../components/MultiTenantAuthProvider';
import Sidebar from '../components/Sidebar';
import ModernPageHeader from '../components/ModernPageHeader';
import { Building2, BookOpen, Plus, Filter, CheckCircle2, Clock, FileEdit, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Module } from '../types';
import { withRouteProtection } from '../components/authorization/withRouteProtection';
import { useJournalEntries, useJournalStats } from '../hooks/useJournalEntries';

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

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };


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
                          <Button variant="ghost" size="sm">
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
  );
};

export const Route = createFileRoute('/accounting-journal')({
  component: withRouteProtection(AppContent, 'read', 'JournalEntry'),
});
