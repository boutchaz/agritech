import React, { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAuth } from '../components/MultiTenantAuthProvider';
import Sidebar from '../components/Sidebar';
import ModernPageHeader from '../components/ModernPageHeader';
import { Building2, BookOpen, TrendingUp, DollarSign, Receipt, CreditCard, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Module } from '../types';
import { withRouteProtection } from '../components/authorization/withRouteProtection';
import { useInvoices, useInvoiceStats } from '../hooks/useInvoices';
import { useAccountingPayments, usePaymentStats } from '../hooks/useAccountingPayments';
import { useJournalStats } from '../hooks/useJournalEntries';

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
  const navigate = useNavigate();

  // Real data from hooks
  const { data: invoices = [] } = useInvoices();
  const { data: payments = [] } = useAccountingPayments();
  const invoiceStats = useInvoiceStats();
  const paymentStats = usePaymentStats();
  const journalStats = useJournalStats();

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleNavigation = (path: string) => {
    navigate({ to: path });
  };

  // Get organization currency
  const currencySymbol = currentOrganization?.currency_symbol || currentOrganization?.currency || 'MAD';

  // Calculate real metrics from stats
  const metrics = [
    {
      title: 'Total Invoices',
      value: invoiceStats.total.toString(),
      change: `${invoiceStats.outstanding} outstanding`,
      trend: 'neutral',
      icon: Receipt,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Total Payments',
      value: paymentStats.total.toString(),
      change: `${paymentStats.received} received`,
      trend: 'neutral',
      icon: CreditCard,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Cash Received',
      value: `${currencySymbol} ${paymentStats.totalReceived.toLocaleString('fr-FR')}`,
      change: `${paymentStats.received} payments`,
      trend: 'up',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Journal Entries',
      value: journalStats.total.toString(),
      change: `${journalStats.posted} posted`,
      trend: 'neutral',
      icon: BookOpen,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  // Combine recent invoices and payments for activity feed
  const recentActivity = React.useMemo(() => {
    const invoiceActivity = invoices.slice(0, 3).map(inv => ({
      id: inv.id,
      type: inv.invoice_type,
      description: `${inv.invoice_type === 'sales' ? 'Sales' : 'Purchase'} Invoice ${inv.invoice_number} ${inv.status === 'draft' ? 'created' : 'submitted'}`,
      amount: `${inv.currency_code} ${Number(inv.grand_total).toLocaleString('fr-FR')}`,
      time: new Date(inv.created_at).toLocaleDateString('fr-FR'),
      date: new Date(inv.created_at),
    }));

    const paymentActivity = payments.slice(0, 3).map(pay => ({
      id: pay.id,
      type: pay.payment_type,
      description: `Payment ${pay.payment_type === 'received' ? 'received from' : 'paid to'} ${pay.party_name}`,
      amount: `${currencySymbol} ${Number(pay.amount).toLocaleString('fr-FR')}`,
      time: new Date(pay.created_at).toLocaleDateString('fr-FR'),
      date: new Date(pay.created_at),
    }));

    return [...invoiceActivity, ...paymentActivity]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5);
  }, [invoices, payments]);

  if (!currentOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement de l'organisation...</p>
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
            { icon: BookOpen, label: 'Accounting Dashboard', isActive: true }
          ]}
          title="Accounting Dashboard"
          subtitle="Overview of your financial performance"
        />

        <div className="p-6 space-y-6">
          {/* Alert Banner */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Accounting Module Active
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Your accounting module is now active. Start by creating invoices or recording payments.
                </p>
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <Card key={metric.title}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {metric.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                      <Icon className={`h-4 w-4 ${metric.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metric.value}</div>
                    <p className={`text-xs ${metric.trend === 'up' && metric.title !== 'Total Expenses' ? 'text-green-600' : metric.trend === 'up' ? 'text-red-600' : 'text-gray-500'}`}>
                      {metric.change}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common accounting tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => handleNavigation('/accounting-accounts')}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Chart of Accounts
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => handleNavigation('/accounting-invoices')}>
                  <Receipt className="mr-2 h-4 w-4" />
                  Create Invoice
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => handleNavigation('/accounting-payments')}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Record Payment
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => handleNavigation('/accounting-journal')}>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Create Journal Entry
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {activity.time}
                        </p>
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {activity.amount}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>
                Complete these steps to set up your accounting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">
                  1
                </div>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  Review your Chart of Accounts (already seeded with defaults)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">
                  2
                </div>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  Create your first sales or purchase invoice
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">
                  3
                </div>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  Record a payment and allocate it to invoices
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-xs font-bold">
                  4
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  View your financial reports (Balance Sheet, P&L)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export const Route = createFileRoute('/accounting')({
  component: withRouteProtection(AppContent, 'read', 'Invoice'),
});
