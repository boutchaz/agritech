import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '../components/MultiTenantAuthProvider';
import Sidebar from '../components/Sidebar';
import ModernPageHeader from '../components/ModernPageHeader';
import { Building2, FileSpreadsheet, TrendingUp, Scale, BookOpen, Calendar, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Module } from '../types';
import { withRouteProtection } from '../components/authorization/withRouteProtection';

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

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const reports = [
    {
      id: 'balance-sheet',
      title: 'Balance Sheet',
      description: 'View your financial position with assets, liabilities, and equity',
      icon: Scale,
      iconBg: 'bg-blue-500',
      available: false,
    },
    {
      id: 'profit-loss',
      title: 'Profit & Loss Statement',
      description: 'Analyze your revenue, expenses, and profitability over time',
      icon: TrendingUp,
      iconBg: 'bg-green-500',
      available: false,
    },
    {
      id: 'trial-balance',
      title: 'Trial Balance',
      description: 'Verify your general ledger with a complete list of account balances',
      icon: BookOpen,
      iconBg: 'bg-purple-500',
      available: false,
    },
    {
      id: 'general-ledger',
      title: 'General Ledger',
      description: 'View detailed transaction history for any account',
      icon: FileSpreadsheet,
      iconBg: 'bg-orange-500',
      available: false,
    },
    {
      id: 'aged-receivables',
      title: 'Aged Receivables',
      description: 'Track outstanding invoices and customer payment aging',
      icon: Calendar,
      iconBg: 'bg-red-500',
      available: false,
    },
    {
      id: 'aged-payables',
      title: 'Aged Payables',
      description: 'Monitor outstanding bills and supplier payment aging',
      icon: Users,
      iconBg: 'bg-indigo-500',
      available: false,
    },
  ];

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
            { icon: FileSpreadsheet, label: 'Financial Reports', isActive: true }
          ]}
          title="Financial Reports"
          subtitle="Access comprehensive financial reports and analytics"
        />

        <div className="p-6 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Available Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reports.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Last Generated
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-400">-</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Report Period
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-medium">Current Fiscal Year</div>
              </CardContent>
            </Card>
          </div>

          {/* Reports Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map((report) => {
              const Icon = report.icon;
              return (
                <Card
                  key={report.id}
                  className="transition-all hover:shadow-lg cursor-pointer"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className={`p-3 rounded-lg ${report.iconBg}`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      {!report.available && (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <CardTitle className="mt-4">
                      {report.title}
                    </CardTitle>
                    <CardDescription>
                      {report.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant={report.available ? "default" : "outline"}
                      className="w-full"
                      disabled={!report.available}
                    >
                      {report.available ? 'View Report' : 'Coming Soon'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Report Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Report Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    <span><strong>Customizable date ranges</strong> - View reports for any period</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    <span><strong>Export options</strong> - Download as PDF, Excel, or CSV</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    <span><strong>Drill-down capability</strong> - Click to view underlying transactions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    <span><strong>Comparative analysis</strong> - Compare across multiple periods</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Implementation Status */}
            <Card>
              <CardHeader>
                <CardTitle>Implementation Status</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Financial reports will be available once the accounting module implementation is complete.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Database Schema</span>
                    <span className="font-medium">✓ Complete</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">API Client</span>
                    <span className="font-medium">✓ Complete</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Custom Hooks</span>
                    <span>⏳ Pending</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">UI Components</span>
                    <span>⏳ Pending</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Help Section */}
          <Card>
            <CardHeader>
              <CardTitle>Need Help Understanding Reports?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Balance Sheet</h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    Shows what you own (assets), what you owe (liabilities), and your net worth (equity) at a specific point in time.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">P&L Statement</h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    Displays your income and expenses over a period, showing whether you made a profit or loss.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Trial Balance</h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    Lists all accounts with their debit and credit balances, ensuring your books are mathematically correct.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export const Route = createFileRoute('/accounting-reports')({
  component: withRouteProtection(AppContent, 'read', 'AccountingReport'),
});
