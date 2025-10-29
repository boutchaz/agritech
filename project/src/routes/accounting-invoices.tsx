import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '../components/MultiTenantAuthProvider';
import Sidebar from '../components/Sidebar';
import ModernPageHeader from '../components/ModernPageHeader';
import { Building2, Receipt, Plus, Filter, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Module } from '../types';
import { withRouteProtection } from '../components/authorization/withRouteProtection';
import { useInvoices, useInvoiceStats } from '../hooks/useInvoices';

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
  const { data: invoices = [], isLoading, error } = useInvoices();
  const stats = useInvoiceStats();

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'submitted':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'submitted':
        return <Clock className="h-4 w-4" />;
      case 'overdue':
        return <XCircle className="h-4 w-4" />;
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
            {!currentOrganization ? 'Chargement de l\'organisation...' : 'Chargement des factures...'}
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
          <p className="text-red-600 dark:text-red-400">Erreur lors du chargement des factures</p>
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
            { icon: Receipt, label: 'Invoices', isActive: true }
          ]}
          title="Invoices"
          subtitle="Manage sales and purchase invoices"
        />

        <div className="p-6 space-y-6">
          {/* Header Actions */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">All Invoices</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Track and manage your invoices
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Invoice
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Invoices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.submitted}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Paid
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats.paid}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Overdue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {stats.overdue}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invoice List */}
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>
                A list of all your sales and purchase invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        Invoice #
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        Type
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        Customer/Supplier
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        Date
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                        Amount
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
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {invoice.invoice_number}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-900 dark:text-white capitalize">
                            {invoice.invoice_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                          {invoice.party_name}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {new Date(invoice.invoice_date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-medium text-gray-900 dark:text-white">
                          {invoice.currency_code} {Number(invoice.grand_total).toLocaleString('fr-FR')}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                            {getStatusIcon(invoice.status)}
                            {invoice.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {invoices.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">
                          Aucune facture trouvée. Créez votre première facture pour commencer.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export const Route = createFileRoute('/accounting-invoices')({
  component: withRouteProtection(AppContent, 'read', 'Invoice'),
});
